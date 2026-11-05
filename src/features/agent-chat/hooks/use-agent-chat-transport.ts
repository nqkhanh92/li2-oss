'use client'

/**
 * Agent chat transport — the fetch-based SSE engine.
 *
 * Extracted and generalized from the Phase-0 probe (agent-probe-panel.tsx). Two hard rules the
 * probe taught us, preserved here:
 *   1. Native EventSource CANNOT send an Authorization header — the agent token is a Bearer token,
 *      so we MUST stream over fetch + a ReadableStream reader. Do NOT swap in use-sse-notifications.
 *   2. The token is held in a ref, never React state. setState does not update a closure variable
 *      synchronously, so a 401 re-mint that re-read token-from-state would resend the SAME expired
 *      token (probe :108-110, :210-213). A ref sidesteps the whole stale-closure class.
 *
 * The handlers for a turn are passed as an ARGUMENT to runTurn (not captured from render), so each
 * turn's callbacks close over exactly that turn's message id — no per-render staleness.
 */

import { useCallback, useRef } from 'react'
import { queryClient } from '@/shared/lib/react-query'
import type {
  ApprovalDecision,
  ApprovalRequestEventData,
  ChartEventData,
  ErrorEventData,
  ErrorKind,
  NoticeEventData,
  QrEventData,
  ResultEventData,
  SessionEventData,
  StatusEventData,
  TokenEventData,
  UsageData,
} from '../types'

/** The two turn shapes li2-ai accepts (XOR-validated server-side: session.py:42-53). */
export type TurnBody =
  | { message: string; session_id: string | null; turn_id: string }
  | {
      approval: { proposal_id: string; decision: ApprovalDecision }
      session_id: string | null
      turn_id: string
    }

export interface TurnHandlers {
  onSession?: (data: SessionEventData) => void
  onToken?: (data: TokenEventData) => void
  onNotice?: (data: NoticeEventData) => void
  /** A transient progress line (`status` event) — replaces the last, cleared on token/terminal. */
  onStatus?: (data: StatusEventData) => void
  onApprovalRequest?: (data: ApprovalRequestEventData) => void
  onChart?: (data: ChartEventData) => void
  /** A `qr` frame — non-terminal, one per created link. See TurnHandlers.onChart for the pattern. */
  onQr?: (data: QrEventData) => void
  onResult?: (data: ResultEventData) => void
  /**
   * kind='not-entitled' only for a mint 403 (plan gate); 'offline' for a fetch TypeError (no
   * network); everything else is 'generic'.
   */
  onError?: (message: string, kind: ErrorKind) => void
}

/** True for the fetch failure that means "the request never reached the server" (offline/DNS/CORS
 * preflight). fetch rejects with a TypeError in exactly this case; every HTTP status is a resolved
 * Response, so a TypeError here is a transport-level miss, surfaced as the 'offline' error kind. */
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError
}

/** Raised by mintToken so runTurn can tell a plan-gate 403 from any other mint failure. */
class MintError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'MintError'
    this.status = status
  }
}

// The query key the axios interceptor (shared/lib/axios.ts) uses to de-dupe its own Casdoor
// access-token refresh. We reuse the SAME key here so the two paths share ONE in-flight refresh.
const REFRESH_TOKEN_QUERY_KEY = ['refreshToken'] as const

/**
 * Refresh the Casdoor ACCESS token (the browser's own login), returning whether it succeeded.
 *
 * WHY this exists: the agent mint call (`POST /api/agent/session`) uses a raw `fetch`, which does
 * NOT pass through the axios response interceptor that auto-refreshes an expired access token and
 * retries. So after a long idle, the mint 401s (getSession → null) while every normal app call
 * silently recovers. This restores parity: on a mint 401 we hit the SAME `/api/auth/refresh`
 * endpoint the interceptor uses (cookie-based: the refresh token rides the request cookies, and a
 * fresh access-token cookie is set on success), then retry the mint once.
 *
 * WHY via queryClient.fetchQuery, not a private promise: the refresh token is ROTATED on every
 * refresh (route returns new_refresh_token + overwrites the cookie), so two concurrent refreshes
 * would send the same now-consumed token — the second fails or clobbers the first. A module-local
 * singleton only de-dupes mints racing each other; it does NOT de-dupe a mint racing a normal axios
 * 401 (that path lives in another module with its own singleton). Routing through the shared
 * queryClient under the axios interceptor's own `['refreshToken']` key makes TanStack collapse ALL
 * concurrent refreshers — mint or axios — onto ONE in-flight `/auth/refresh`. `retry: false` so a
 * genuine 401 (dead refresh token) is not re-attempted 3× by the client's default query retry.
 */
async function refreshCasdoorAccessToken(): Promise<boolean> {
  try {
    // Boolean(): when this call is de-duped onto the axios interceptor's in-flight refresh, the
    // shared queryFn resolves that path's `response.data` (an object), not our `true` — coerce so
    // the boolean contract holds regardless of which concurrent caller's queryFn actually ran.
    const ok = await queryClient.fetchQuery({
      queryKey: REFRESH_TOKEN_QUERY_KEY,
      queryFn: async () => {
        const r = await fetch('/api/auth/refresh', { method: 'POST' })
        if (!r.ok) throw new Error(`refresh failed ${r.status}`)
        return true
      },
      retry: false,
      staleTime: 0,
      gcTime: 0,
    })
    return Boolean(ok)
  } catch {
    return false
  }
}

// The token lives 15 minutes server-side. Used ONLY when the mint response omits `expires_at`
// (older server, a proxy stripping the field) — never the primary source of truth.
// ⚠️ This duplicates the server's AGENT_TOKEN_TTL_MS (shared/lib/agent/paseto.ts). It cannot be
// imported here — paseto.ts pulls in sign/verify (node crypto) which must not enter the client
// bundle. If the server TTL changes, update this fallback too. It is a dead path today (the server
// always sends expires_at), so the drift is only a slightly-off estimate on a response we control.
const FALLBACK_TTL_MS = 15 * 60 * 1000
// Re-mint once under this much time remains. This makes a turn UNLIKELY to cross expiry mid-turn —
// it guarantees only ≥120s remain AT TURN START, which covers the common case (prose, then an early
// tool back-hop seconds later). It does NOT cover a long turn (KB synthesis / memory compaction can
// run minutes, li2-ai total_timeout_s=600) whose back-hop lands past the margin — the reactive 401
// re-mint in streamTurn/authedGet is the backstop for that tail. See isTokenFresh below.
const REMINT_MARGIN_MS = 120 * 1000

/**
 * True if `expiryMs` has more than `marginMs` left before it lapses, as of `nowMs`.
 *
 * This is the proactive half of the fix. Checking freshness BEFORE every turn/GET stops a turn
 * from starting on a token with <marginMs left, so the common case — prose, then an early tool
 * back-hop (li2-ai forwarding a read/write to li2-app) seconds later — no longer 401s mid-turn
 * (li2-ai cannot mint a fresh token itself). It does NOT fully close the gap for a LONG turn whose
 * back-hop lands past the margin; the REACTIVE 401 re-mint (in streamTurn/authedGet, which only
 * catches an expiry lapsing DURING its own fetch) remains the backstop for that tail.
 *
 * `null` (expiry unknown — no token minted yet) is deliberately treated as "not fresh", not
 * "trust it" — the caller must mint rather than assume.
 *
 * Pure function (no `Date.now()` inside) so it is unit-testable without mocking the clock.
 */
export function isTokenFresh(expiryMs: number | null, nowMs: number, marginMs: number): boolean {
  if (expiryMs === null) return false
  return expiryMs - nowMs > marginMs
}

export function useAgentChatTransport(orgId: string) {
  // Token + in-flight abort live in refs — survive re-renders, never trigger one, never go stale.
  const tokenRef = useRef<string | null>(null)
  // Org that tokenRef.current was minted for. The provider does NOT remount this hook on org_id
  // change (the [org_id] layout persists across switches, orgId just updates in place), so
  // tokenRef survives an org switch. This tag lets a reuse site detect a stale-org token and
  // re-mint instead — a token minted for org A must never authenticate an org-B request.
  const tokenOrgRef = useRef<string | null>(null)
  // Epoch ms the current token lapses at. Lives and dies in lockstep with tokenRef/tokenOrgRef —
  // the invariant is now "tokenRef is set iff tokenOrgRef AND tokenExpiryRef are set". In-memory
  // only, like the token itself; expires_at is not sensitive on its own, but it is kept beside
  // the token so the two values can never drift apart.
  const tokenExpiryRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const mintToken = useCallback(async (): Promise<{ token: string; expiresAtMs: number }> => {
    // One raw POST to the mint endpoint. Kept as an inner helper so the 401 path can call it
    // exactly twice (original + one post-refresh retry) with no other duplication.
    const postMint = () =>
      fetch('/api/agent/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })

    let res = await postMint()
    // A 401 means the browser's OWN Casdoor access token expired (getSession → null in withAuth) —
    // NOT a plan gate (that is 403, handled by the caller as `not-entitled`). The raw fetch skips
    // the axios auto-refresh, so do it here: refresh the access-token cookie once, then retry the
    // mint. Refresh only on 401, never 403.
    if (res.status === 401) {
      const refreshed = await refreshCasdoorAccessToken()
      if (refreshed) {
        res = await postMint()
      } else {
        // Refresh token also gone → the whole session is dead; there is nothing the chat can do.
        // Mirror the axios interceptor's own dead-session behavior (axios.ts:96) and send the user
        // to log in, instead of leaving them on a chat that only shows a generic error. Guard for
        // SSR/tests where `window` is absent; the throw below still surfaces the error either way.
        if (typeof window !== 'undefined') window.location.href = '/auth/login'
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new MintError(
        res.status,
        `mint failed ${res.status}: ${body?.message ?? res.statusText}`
      )
    }
    const body = await res.json()
    const parsed = Date.parse(body.data.expires_at)
    const expiresAtMs = Number.isNaN(parsed) ? Date.now() + FALLBACK_TTL_MS : parsed
    return { token: body.data.token as string, expiresAtMs }
  }, [orgId])

  /** The single place that mints AND stores a token — keeps tokenRef/tokenOrgRef/tokenExpiryRef
   *  assignment in lockstep so no call site can update one without the others. */
  const mintAndStore = useCallback(async (): Promise<void> => {
    const { token, expiresAtMs } = await mintToken()
    tokenRef.current = token
    tokenOrgRef.current = orgId
    tokenExpiryRef.current = expiresAtMs
  }, [mintToken, orgId])

  /** The proactive mint gate, shared by runTurn and authedGet so the two can never drift: mint when
   *  there is no token, the token was minted for a different org, or it is within REMINT_MARGIN_MS
   *  of lapsing. Reads Date.now() at call time (the freshness check is only meaningful "now"). */
  const needsFreshToken = useCallback((): boolean => {
    return (
      !tokenRef.current ||
      tokenOrgRef.current !== orgId ||
      !isTokenFresh(tokenExpiryRef.current, Date.now(), REMINT_MARGIN_MS)
    )
  }, [orgId])

  /**
   * Run one turn (a message OR an approval decision) and drive `handlers` off the SSE stream.
   * Resolves when the stream ends. Any pre-stream/stream error is delivered via handlers.onError
   * (this never rejects for an expected agent/HTTP error — only truly unexpected throws bubble).
   */
  const runTurn = useCallback(
    async (body: TurnBody, handlers: TurnHandlers, file?: File | null): Promise<void> => {
      const baseUrl = process.env.NEXT_PUBLIC_LI2_AI_BASE_URL
      if (!baseUrl) {
        handlers.onError?.('NEXT_PUBLIC_LI2_AI_BASE_URL is not set', 'generic')
        return
      }

      // Ensure a FRESH token before the turn: no token yet (first turn / after reset()), the org
      // changed, or the current token is within REMINT_MARGIN_MS of lapsing (the proactive fix —
      // see isTokenFresh's doc comment for the back-hop bug it closes).
      if (needsFreshToken()) {
        try {
          await mintAndStore()
        } catch (err) {
          if (err instanceof MintError && err.status === 403) {
            handlers.onError?.('not-entitled', 'not-entitled')
          } else {
            handlers.onError?.(
              err instanceof Error ? err.message : String(err),
              isNetworkError(err) ? 'offline' : 'generic'
            )
          }
          return
        }
      }

      const controller = new AbortController()
      abortRef.current = controller

      try {
        await streamTurn(baseUrl, body, handlers, controller.signal, false, file ?? null)
      } catch (err) {
        // A reset()/org-switch/cancelTurn aborts the fetch → AbortError. That is an intentional
        // stop, not a failure the user should see (the provider marks the message 'stopped').
        if (controller.signal.aborted) return
        // fetch rejecting with a TypeError = the request never reached the server (offline, DNS,
        // CORS preflight) → distinct 'offline' copy, not a generic backend error.
        handlers.onError?.(
          err instanceof Error ? err.message : String(err),
          isNetworkError(err) ? 'offline' : 'generic'
        )
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    // orgId is no longer read directly here — the org-mismatch check lives in needsFreshToken, and
    // mintAndStore owns the token/org/expiry write, so those two are the honest deps. streamTurn
    // stays deliberately out of deps — the token is threaded via ref, not closure, so a stale
    // streamTurn identity cannot send an expired token (file header rule 2).
    [mintAndStore, needsFreshToken]
  )

  /**
   * The fetch + SSE frame loop. Re-mints once on a 401 (token expired mid-session) and retries,
   * threading the fresh token via the ref — never a stale closure read.
   */
  const streamTurn = useCallback(
    async (
      baseUrl: string,
      body: TurnBody,
      handlers: TurnHandlers,
      signal: AbortSignal,
      retried = false,
      file: File | null = null
    ): Promise<void> => {
      /**
       * Hai hình dạng thân request, chọn theo việc lượt này có file hay không.
       *
       * ⚠️ KHÔNG đặt `Content-Type` ở nhánh multipart. `fetch` phải tự sinh nó để kèm `boundary`;
       * đặt tay là server không tách được các phần và `formData()` trả về rỗng — một lỗi im lặng,
       * vì request vẫn 200 và chỉ là file biến mất.
       */
      const init: RequestInit = file
        ? { method: 'POST', body: toFormData(body, file), signal }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
          }

      const res = await fetch(`${baseUrl}/turn`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${tokenRef.current}` },
      })

      // Pre-stream HTTP errors (auth/admission/dedup/session/spend gates fire before the body).
      if (!res.ok) {
        if (res.status === 401 && !retried) {
          // Re-mint once and retry. This is the second line of defense (clock skew, server exp
          // stricter than ours) — the proactive freshness gate in runTurn/authedGet is meant to
          // prevent most 401s before they happen, this just catches what slips through. If the
          // re-mint itself 403s (org downgraded mid-session), that is the same plan-gate case as
          // the initial mint — surface the upsell, not a generic error.
          try {
            await mintAndStore()
          } catch (err) {
            if (err instanceof MintError && err.status === 403) {
              handlers.onError?.('not-entitled', 'not-entitled')
              return
            }
            throw err
          }
          return streamTurn(baseUrl, body, handlers, signal, true, file)
        }
        const errBody = await res.json().catch(() => ({}))
        handlers.onError?.(
          `turn failed ${res.status}: ${errBody?.error ?? res.statusText}`,
          'generic'
        )
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      // A turn is only complete when the server sends a terminal frame. THREE frames are terminal:
      //   - `result`  — a normal answer turn finished.
      //   - `error`   — the turn failed / was refused.
      //   - `approval_request` — a WRITE proposal (turn 1). The server emits the card then RETURNS
      //     with no result/error (turn.py:1826-1852): the card IS the terminal state, the turn parks
      //     until the user decides (a separate turn 2). Without counting it, a propose turn would
      //     falsely read as a dropped stream ("stream ended without a result" under the card).
      // A clean disconnect with NONE of these (proxy idle-timeout, worker restart, handler falling
      // off the end) closes the body with done=true and no exception — if we treated that as success,
      // an APPROVE turn (turn 2) would flip its card to a green "Approved" for a write that may never
      // have executed (the exact B-note case the provider guards against). Turn 2 sends an `approval`
      // body and never emits `approval_request`, so that guard is untouched by this addition.
      let sawTerminal = false
      const trackingHandlers: TurnHandlers = {
        ...handlers,
        onApprovalRequest: (data) => {
          sawTerminal = true
          handlers.onApprovalRequest?.(data)
        },
        onResult: (data) => {
          sawTerminal = true
          handlers.onResult?.(data)
        },
        onError: (message, kind) => {
          sawTerminal = true
          handlers.onError?.(message, kind)
        },
      }

      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        // SSE frames are separated by a blank line (\n\n); the trailing piece may be incomplete.
        const frames = buf.split('\n\n')
        buf = frames.pop() ?? ''
        for (const frame of frames) {
          if (!frame.trim()) continue
          dispatchFrame(frame, trackingHandlers)
        }
      }

      // Flush a final frame the server did not terminate with a blank line.
      buf += decoder.decode()
      if (buf.trim()) dispatchFrame(buf, trackingHandlers)

      // Stream closed cleanly but never delivered a terminal frame → treat as a failure, not a
      // silent success (mirrors the Phase-0 probe's dropped `if (!gotResult) throw` guard).
      if (!sawTerminal) {
        handlers.onError?.('stream ended without a result', 'generic')
      }
    },
    // streamTurn no longer reads orgId directly — mintAndStore owns the token/org/expiry
    // assignment, so it is the only dep now.
    [mintAndStore]
  )

  /**
   * GET a li2-ai endpoint with the current Bearer token, ensuring the token is minted for the
   * CURRENT org (the org-bind from the tokenOrgRef invariant above) and re-minting once on a 401
   * (token expired mid-session, same pattern as streamTurn). Returns the raw Response (caller
   * checks res.ok) or null if a mint failed / the request never reached the server. Never throws —
   * every caller of this helper is best-effort.
   */
  const authedFetch = useCallback(
    async (baseUrl: string, path: string, init?: RequestInit): Promise<Response | null> => {
      // Same proactive freshness gate as runTurn (no token / org mismatch / near expiry).
      if (needsFreshToken()) {
        try {
          await mintAndStore()
        } catch {
          // A 403 (not entitled) or an offline mint failure here is not this helper's to report —
          // the turn path already surfaces entitlement/offline errors when the user actually
          // sends a message. The caller just gets null back.
          return null
        }
      }

      // Read tokenRef.current at CALL time (not closure-capture) so the post-re-mint retry below
      // sends the FRESH token. The caller's own headers are spread first; Authorization is set last
      // so it can never be overridden by init.headers.
      const send = () =>
        fetch(`${baseUrl}${path}`, {
          ...init,
          headers: { ...init?.headers, Authorization: `Bearer ${tokenRef.current}` },
        })

      try {
        let res = await send()

        if (res.status === 401) {
          // Re-mint once (token expired) and retry — second line of defense, same as streamTurn.
          try {
            await mintAndStore()
          } catch {
            return null
          }
          res = await send()
        }

        return res
      } catch {
        // Offline / any thrown fetch error — best-effort, swallow.
        return null
      }
    },
    // orgId is no longer read directly — the org check lives in needsFreshToken; mintAndStore and
    // needsFreshToken are the honest deps.
    [mintAndStore, needsFreshToken]
  )

  /**
   * Best-effort fetch of this org's monthly AI spend snapshot (GET /usage), delegating the
   * token-attach + org-bind + 401-retry to authedGet. NEVER throws or surfaces an error to the
   * UI — the budget meter is a nice-to-have, not a turn. Every failure mode (no baseUrl, mint
   * failure, offline, 401-after-retry, 503, malformed body) collapses to `null`; the caller's job
   * is to keep showing the last known value when that happens.
   */
  const fetchUsage = useCallback(async (): Promise<UsageData | null> => {
    const baseUrl = process.env.NEXT_PUBLIC_LI2_AI_BASE_URL
    if (!baseUrl) return null

    const res = await authedFetch(baseUrl, '/usage')
    if (!res || !res.ok) return null

    try {
      const data = await res.json()
      // Guard the two numeric fields the meter divides/renders with — a proxy body or contract
      // drift that drops them would otherwise produce `undefined / 10_000 = NaN` → a `$NaN`
      // label and a `width: NaN%` bar. month/currency are display-only strings, not guarded here.
      if (typeof data?.spent_micro !== 'number' || typeof data?.budget_cents !== 'number') {
        return null
      }
      return data as UsageData
    } catch {
      // A JSON parse throw on a malformed body — same best-effort contract, swallow to null.
      return null
    }
  }, [authedFetch])

  /**
   * Best-effort POST /feedback (👍/👎). Returns true only on a 201; false on everything else (no
   * baseUrl, mint failure, offline, 4xx/5xx) so the caller can revert its optimistic highlight.
   * Never throws — a dropped rating is a nice-to-have miss, not a turn. Delegates token-attach +
   * 401-retry to authedFetch. session_id is required (a rating needs a traced turn); the caller
   * only invokes this when it holds a non-null session_id and the bubble's turn_id.
   */
  const sendFeedback = useCallback(
    async (sessionId: string, turnId: string, rating: 1 | -1): Promise<boolean> => {
      const baseUrl = process.env.NEXT_PUBLIC_LI2_AI_BASE_URL
      if (!baseUrl) return false
      const res = await authedFetch(baseUrl, '/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, turn_id: turnId, rating }),
      })
      return res?.status === 201
    },
    [authedFetch]
  )

  /**
   * Cancel any in-flight stream but KEEP the token — a user-initiated Stop. The next turn reuses
   * the same still-valid token (no needless re-mint). Contrast with reset(), which also drops the
   * token because the org/session identity itself changed.
   */
  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  /** Cancel any in-flight stream and drop the token so the next turn re-mints (org switch/reset).
   *  tokenOrgRef and tokenExpiryRef are cleared in lockstep with tokenRef — the invariant is
   *  "tokenRef is set iff tokenOrgRef AND tokenExpiryRef record its org/expiry", so a cleared
   *  token must never leave a stale org tag or expiry behind. */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    tokenRef.current = null
    tokenOrgRef.current = null
    tokenExpiryRef.current = null
  }, [])

  return { runTurn, abort, reset, fetchUsage, sendFeedback }
}

/**
 * Đóng gói một lượt CÓ FILE thành `FormData`.
 *
 * Chỉ nhánh `message` mới có file — một lượt duyệt (`approval`) không mang gì. Hàm vẫn nhận cả hai
 * hình dạng để chữ ký của `streamTurn` không phải rẽ nhánh ở chỗ gọi; nhánh `approval` đơn giản là
 * không bao giờ đi vào đây với một file.
 */
function toFormData(body: TurnBody, file: File): FormData {
  const form = new FormData()
  form.set('turn_id', body.turn_id)
  // `FormData` chỉ chở chuỗi, nên `null` phải đi thành chữ 'null' và server dịch ngược lại.
  form.set('session_id', body.session_id ?? 'null')
  if ('message' in body) form.set('message', body.message)
  form.set('file', file)
  return form
}

/** Parse one SSE frame (event:/data: lines) and dispatch to the matching handler. */
function dispatchFrame(frame: string, handlers: TurnHandlers): void {
  let eventType = 'message'
  let dataLine = ''
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) eventType = line.slice(6).trim()
    if (line.startsWith('data:')) dataLine = line.slice(5).trim()
  }
  if (!dataLine) return

  let parsed: unknown
  try {
    parsed = JSON.parse(dataLine)
  } catch {
    return // a malformed data line is dropped rather than tearing the stream
  }

  switch (eventType) {
    case 'session':
      handlers.onSession?.(parsed as SessionEventData)
      break
    case 'token':
      handlers.onToken?.(parsed as TokenEventData)
      break
    case 'notice':
      handlers.onNotice?.(parsed as NoticeEventData)
      break
    case 'status':
      handlers.onStatus?.(parsed as StatusEventData)
      break
    case 'approval_request':
      handlers.onApprovalRequest?.(parsed as ApprovalRequestEventData)
      break
    case 'chart':
      handlers.onChart?.(parsed as ChartEventData)
      break
    case 'qr':
      handlers.onQr?.(parsed as QrEventData)
      break
    case 'result':
      handlers.onResult?.(parsed as ResultEventData)
      break
    case 'error':
      handlers.onError?.((parsed as ErrorEventData).message, 'generic')
      break
    default:
      break
  }
}
