'use client'

/**
 * Agent chat provider — mounted ONCE in the org layout (sibling to NotificationProvider), so the
 * conversation, the open/closed state, and any in-flight stream survive page navigation within the
 * org. Mirrors notification-provider.tsx.
 *
 * State lifetime (Kei): in-memory only. A hard refresh (F5) starts fresh — no persistence. An org
 * switch RESETS everything (the agent token is minted per-org and entitlements differ per-org).
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { queryClient } from '@/shared/lib/react-query'
import {
  useAgentChatTransport,
  type TurnBody,
} from '@/features/agent-chat/hooks/use-agent-chat-transport'
import {
  readSessionId,
  writeSessionId,
  clearSessionId,
} from '@/features/agent-chat/utils/session-memory'
import type {
  ApprovalDecision,
  ApprovalRequestEventData,
  ChartEventData,
  ChatMessage,
  ErrorKind,
  ResultEventData,
  UsageData,
} from '@/features/agent-chat/types'

/** How a turn ended — threaded through `onDone` so callers can react precisely (retryable? cancelled?). */
interface TurnOutcome {
  /** True if the turn ended on an error event / transport failure (not a user cancel). */
  failed: boolean
  /** The error kind, when `failed`. */
  errorKind?: ErrorKind
  /** True if the user aborted the turn via cancelTurn() — a neutral stop, never an error. */
  cancelled: boolean
}

export interface AgentChatContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  messages: ChatMessage[]
  isStreaming: boolean
  sessionId: string | null
  /**
   * Gửi một lượt mới. Không làm gì nếu đang có lượt chạy.
   *
   * `file` đi CÙNG lượt chứ không có đường tải lên riêng — chốt chủ sản phẩm 2026-10-29, theo lối
   * Claude Desktop: chọn file thì nó thành chip trong khung soạn, và Enter vừa gửi lời nhắn vừa
   * đẩy file lên. Nên khoảnh khắc byte rời trình duyệt là chính cái Enter đó.
   */
  sendMessage: (text: string, file?: File | null) => void
  /** Approve or reject a pending proposal (turn 2). No-op while streaming. */
  decide: (proposalId: string, decision: ApprovalDecision) => void
  /** Clear the conversation and start a fresh session. */
  newConversation: () => void
  /** Abort the in-flight turn; its assistant message is marked `stopped` (neutral). No-op if idle. */
  cancelTurn: () => void
  /** Resend the last user message after a retryable error, reusing its assistant bubble. No-op otherwise. */
  retryLast: () => void
  /**
   * The id of the ONE assistant message that can currently be retried (the last turn, if it ended in
   * a retryable error), else null. A message shows its Retry button only when its own id matches —
   * so an older errored message never offers to replay a newer turn.
   */
  retryableMessageId: string | null
  /** This org's monthly AI spend snapshot (GET /usage), or null if never fetched / last fetch
   * failed. The meter renders nothing when null — see agent-chat-provider's refreshUsage. */
  usage: UsageData | null
  /** Record a 👍(1)/👎(-1) on an assistant answer. Optimistic + best-effort; see submitFeedback. */
  submitFeedback: (messageId: string, rating: 1 | -1) => void
  /**
   * Id của các touch point vừa được tạo qua chat trong PHIÊN TRÌNH DUYỆT này.
   *
   * Danh sách Link & Artifact đọc nó để gắn nhãn "Vừa tạo qua chat" và viền xanh, nên người dùng
   * tìm thấy ngay thứ vừa nhờ tạo giữa một bảng có thể dài hàng trăm hàng.
   *
   * ⚠️ Chỉ trong bộ nhớ, và cố ý vậy: "vừa" là một khái niệm của phiên làm việc chứ không phải
   * thuộc tính của dữ liệu. Tải lại trang thì nhãn biến mất — đúng, vì lúc đó nó không còn "vừa"
   * với người đang nhìn nữa.
   */
  createdLinkIds: string[]
}

const AgentChatContext = createContext<AgentChatContextValue | undefined>(undefined)

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

export function AgentChatProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganizationStoreProvider()
  const orgId = organization?.id ?? ''
  const { runTurn, abort, reset, fetchUsage, sendFeedback } = useAgentChatTransport(orgId)

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  // The assistant bubble eligible for Retry (last turn, if it failed retryably), else null.
  const [retryableMessageId, setRetryableMessageId] = useState<string | null>(null)
  // The org's monthly spend snapshot for the budget meter. Org-scoped, not conversation-scoped.
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [createdLinkIds, setCreatedLinkIds] = useState<string[]>([])

  // sessionId is also mirrored in a ref: the SSE handlers close over the turn's start and must read
  // the latest session_id without re-subscribing (same reasoning as the token ref in the transport).
  const sessionIdRef = useRef<string | null>(null)
  const streamingRef = useRef(false)
  // Set true by cancelTurn() so the active turn's onDone marks its message `stopped`, not `error`.
  const cancelledRef = useRef(false)
  // The last turn we can replay on Retry: the originating body + the assistant bubble to re-drive
  // into (reusing the SAME bubble so a retry never appends a duplicate user message).
  const lastTurnRef = useRef<{ body: TurnBody; assistantId: string } | null>(null)
  // Mirrors orgId so refreshUsage can re-check "is this still the current org?" AFTER an await —
  // a plain closure over orgId would see the value from when the fetch started, not the one after
  // an org switch. Assigned at render time: a value mirror, no effect needed.
  const orgIdRef = useRef(orgId)
  orgIdRef.current = orgId
  // Mirror of `messages` so submitFeedback can read a bubble's turn_id/current rating WITHOUT
  // listing `messages` in its deps — keeping the callback stable (same value-mirror idiom as
  // orgIdRef above). Assigned at render time; no effect needed.
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  /**
   * Re-read the org's monthly spend snapshot. Only overwrites `usage` on a real value — a
   * transient null (offline blip, mid-retry) must never blank an already-shown meter. No-op
   * without an org (nothing to fetch a token for).
   */
  const refreshUsage = useCallback(async () => {
    const forOrg = orgId
    if (!forOrg) return
    const u = await fetchUsage()
    // Drop a result that arrived after an org switch — it belongs to the previous org and must
    // never paint the new org's meter (cross-tenant). Also skip a transient null (keep last value).
    if (u && orgIdRef.current === forOrg) setUsage(u)
  }, [orgId, fetchUsage])

  // Mirrors refreshUsage so drive's finally can call the LATEST version without listing it in
  // drive's own deps — keeps the money-meter (which re-identifies on every orgId/fetchUsage change)
  // decoupled from the SSE turn-driver's identity, so sendMessage/decide/retryLast stay stable.
  const refreshUsageRef = useRef(refreshUsage)
  useEffect(() => {
    refreshUsageRef.current = refreshUsage
  }, [refreshUsage])

  // Reset everything when the org changes (per-org token/entitlements) — mirrors how the panel
  // would look on a fresh load. Aborts any in-flight stream via the transport.
  useEffect(() => {
    reset()
    setMessages([])
    setSessionId(null)
    sessionIdRef.current = null
    setIsStreaming(false)
    streamingRef.current = false
    cancelledRef.current = false
    lastTurnRef.current = null
    setRetryableMessageId(null)
    // Usage is per-org (a different org has a different cap/spend) — clear it here so a stale
    // number never shows for the new org. Contrast with newConversation(), which deliberately
    // LEAVES usage intact: "New chat" stays within the same org, so the meter is still accurate.
    setUsage(null)

    /**
     * ⭐ Nối lại phiên đã lưu của org này — nguồn duy nhất khiến F5 không mất hội thoại.
     *
     * Đọc ở ĐÂY, trong effect, chứ không ở `useState(...)`: server render không có
     * `localStorage`, nên đọc lúc khởi tạo sẽ cho hai giá trị khác nhau giữa server và trình
     * duyệt — lỗi hydrate.
     *
     * Chạy sau phần reset ngay trên, nên thứ tự là: xoá sạch của org cũ → nạp của org mới.
     * `readSessionId` tự bỏ qua bản quá 24 giờ, nên không cần kiểm hạn ở đây.
     *
     * ⚠️ Id này đến từ trình duyệt và KHÔNG được tin: `getOrCreateSession` ở server kiểm lại cả
     * `org_id` lẫn `user_id`, không khớp thì mở phiên mới và ghi log. Nên một id cũ từ máy khác
     * hay org khác không đọc trộm được gì.
     */
    if (!orgId) return
    const saved = readSessionId(orgId)
    if (saved) {
      sessionIdRef.current = saved
      setSessionId(saved)
    }
  }, [orgId, reset])

  // Abort any in-flight stream if the provider itself unmounts (e.g. leaving the org route).
  useEffect(() => reset, [reset])

  // Refresh the meter whenever the panel opens (covers first-open and every re-open), so the
  // number is never more stale than "since I last opened the chat". Event-driven, no polling.
  useEffect(() => {
    if (isOpen) void refreshUsage()
  }, [isOpen, refreshUsage])

  /**
   * Shared driver for BOTH a message-turn and an approval-turn — one set of SSE handlers, so the
   * two turn kinds can never drift. `onDone(failed)` runs after the stream ends; `failed` is true
   * when the turn ended on an error (used by decide() to mark the card resolved vs failed). The
   * approval-request handler only ever fires on a message-turn.
   */
  const drive = useCallback(
    (
      body: TurnBody,
      assistantId: string,
      onDone?: (outcome: TurnOutcome) => void,
      file?: File | null
    ) => {
      setIsStreaming(true)
      streamingRef.current = true
      cancelledRef.current = false
      setRetryableMessageId(null)
      // Remember what to replay if this turn errors (Retry re-drives into the SAME assistant bubble).
      lastTurnRef.current = { body, assistantId }
      // Stamp the bubble with the turn_id we're about to send — it's exactly what li2-ai records
      // (session.py uses body.turn_id), so the feedback POST later keys on the same value. Retry
      // reuses this body, so the id stays stable across retries.
      patchMessage(assistantId, { turn_id: body.turn_id })

      // An approval-decision turn consumes a one-time Redis proposal server-side (GETDEL), so it can
      // NEVER be replayed — a retry would only hit "proposal expired". Retry is for message-turns.
      const isApprovalTurn = 'approval' in body

      // Tracks whether this turn hit an error event / transport failure, so onDone can distinguish
      // a clean finish from a failed one (a ref would outlive the turn — a local closure is exact).
      let turnFailed = false
      let turnErrorKind: ErrorKind | undefined
      // Whether a terminal frame (result OR error) was actually delivered. The server keeps the HTTP
      // body open briefly AFTER the terminal frame (finally-block span write + admission release), so
      // a Stop clicked in that window aborts a turn that already COMPLETED. Without this flag the
      // finally below would overwrite a 'done'/committed turn with 'stopped'/'failed' — making a
      // successful write look cancelled. Only treat a cancel as a real stop if nothing terminal landed.
      let reachedTerminal = false

      void runTurn(
        body,
        {
          onSession: (data) => {
            // A null session_id means the turn ran untraced (DB blip) — keep the one we have.
            if (data.session_id !== null) {
              sessionIdRef.current = data.session_id
              setSessionId(data.session_id)
              /**
               * ⭐ Ghi lại MỖI lượt, không chỉ lượt đầu — 24 giờ tính từ lần dùng gần nhất, nên
               * ngồi chat cả buổi không bị cắt ngang. Trước đây id chỉ sống trong state, nên F5 là
               * mất và lượt sau mở một phiên mới: đo trên LiHi ra 5 phiên trong 36 giây.
               */
              if (orgIdRef.current) writeSessionId(orgIdRef.current, data.session_id)
            }
          },
          onToken: (data) => {
            // First token = the transient progress step finished; clear `progress` so a
            // now-false "Đang đọc/soạn…" never lingers beside the answer as it streams.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + data.text, progress: undefined } : m
              )
            )
          },
          onNotice: (data) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, notices: [...m.notices, data.text] } : m
              )
            )
          },
          onStatus: (data) => {
            // A single REPLACEABLE progress slot — overwrite, never append (an append would
            // recreate the very stale-pileup bug this frame fixes). Cleared on the first token
            // (above) and every terminal (onResult/onApprovalRequest/onError/cancel below).
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, progress: data.text } : m))
            )
          },
          onApprovalRequest: (data: ApprovalRequestEventData) => {
            // A proposal is the terminal frame of turn 1: the server emits the card then returns
            // (turn.py:1826-1852). Flip the bubble to `done` so its status stays honest — the turn
            // finished by parking for approval. The card's OWN status field (pending → resolved/failed)
            // owns the approval lifecycle from here; the bubble is no longer streaming.
            patchMessage(assistantId, {
              status: 'done',
              progress: undefined, // terminal — drop any lingering progress line
              approval: {
                proposalId: data.proposal_id,
                action: data.action,
                render: data.render,
                status: 'pending',
                decision: null,
              },
            })
          },
          onChart: (data: ChartEventData) => {
            // Append (not replace): a single turn may emit more than one chart. Use the functional
            // setMessages form like onToken/onNotice — patchMessage takes a flat partial and cannot
            // read the previous charts array to append to it. Tag each chart with a client-generated
            // id (the wire frame has none) so it has a stable React key across resets/reorders.
            const chart = { id: genId(), kind: data.kind, data: data.data }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, charts: [...(m.charts ?? []), chart] } : m
              )
            )
          },
          onQr: (data) => {
            // Append (not replace): a bulk create yields one `qr` frame per link. Same pattern as
            // onChart — client-generated id (the wire frame has none) for a stable React key.
            const qr = {
              id: genId(),
              short_url: data.short_url,
              name: data.name,
              linkId: data.link_id,
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, qrCodes: [...(m.qrCodes ?? []), qr] } : m
              )
            )

            /**
             * Hàng mới phải xuất hiện trong bảng NGAY, không đợi người dùng tải lại trang.
             *
             * `qr` là frame duy nhất mang `link_id`, nên nó cũng là tín hiệu đáng tin duy nhất rằng
             * một thứ vừa được tạo. Làm mất hiệu lực truy vấn ở đây chứ không ở cuối lượt: một lượt
             * tạo hàng loạt phát nhiều frame, và người dùng thấy từng hàng hiện dần thì dễ hiểu hơn
             * là cả chục hàng đổ ra một lúc lúc lượt kết thúc.
             */
            if (data.link_id) {
              setCreatedLinkIds((prev) =>
                prev.includes(data.link_id!) ? prev : [...prev, data.link_id!]
              )
            }
            queryClient.invalidateQueries({
              queryKey: ['organizations', orgId, 'touch-points'],
            })
          },
          onResult: (data: ResultEventData) => {
            reachedTerminal = true
            patchMessage(assistantId, {
              status: 'done',
              stopReason: data.stop_reason,
              progress: undefined, // terminal — drop any lingering progress line
            })
          },
          onError: (message, kind) => {
            // A user cancel aborts the fetch; the transport swallows the AbortError and does NOT call
            // onError — so any onError here is a real failure. Still guard: never let a late error
            // overwrite a message the user already stopped.
            if (cancelledRef.current) return
            reachedTerminal = true
            turnFailed = true
            turnErrorKind = kind
            patchMessage(assistantId, {
              status: 'error',
              errorKind: kind,
              errorText: kind === 'not-entitled' ? undefined : message,
              progress: undefined, // terminal — drop any lingering progress line
            })
          },
        },
        file
      ).finally(() => {
        // A genuine user cancel (aborted BEFORE any terminal frame): mark the half-streamed message
        // neutral-stopped. If a terminal frame already landed, the turn actually completed in the
        // brief post-result window — keep its 'done'/'error' status, don't retro-label it stopped.
        const genuinelyCancelled = cancelledRef.current && !reachedTerminal
        if (genuinelyCancelled) {
          patchMessage(assistantId, { status: 'stopped', progress: undefined })
        }
        // Retry is offered only for a genuine, retryable failure on a MESSAGE turn — never a plan
        // gate, never a cancel, never an approval turn (its proposal is already consumed) — and only
        // on THIS bubble (bound by id so an older error never replays a newer turn).
        setRetryableMessageId(
          turnFailed && turnErrorKind !== 'not-entitled' && !isApprovalTurn ? assistantId : null
        )
        // Report `genuinelyCancelled` (not the raw ref): a cancel clicked after the write already
        // committed must NOT mark the approval card failed — decide()'s onDone keys off this.
        onDone?.({ failed: turnFailed, errorKind: turnErrorKind, cancelled: genuinelyCancelled })
        setIsStreaming(false)
        streamingRef.current = false
        // Re-read the spend snapshot once this turn's cost has settled server-side — but only for a
        // turn that actually settled a charge. A failed/cancelled turn changed nothing, so skip the
        // wasted mint+GET. Called via the ref so drive itself doesn't depend on refreshUsage.
        if (!turnFailed && !genuinelyCancelled) void refreshUsageRef.current()
      })
    },
    [runTurn, patchMessage]
  )

  /** Append a fresh streaming assistant message and return its id. */
  const appendAssistant = useCallback((): string => {
    const id = genId()
    setMessages((prev) => [
      ...prev,
      { id, role: 'assistant', text: '', notices: [], status: 'streaming' },
    ])
    return id
  }, [])

  const sendMessage = useCallback(
    (text: string, file?: File | null) => {
      const trimmed = text.trim()
      if (!trimmed || streamingRef.current) return

      const userMsg: ChatMessage = {
        id: genId(),
        role: 'user',
        text: trimmed,
        // Chỉ giữ ba trường để hiển thị, không giữ `File`: bong bóng sống suốt phiên, còn `File`
        // là tham chiếu tới dữ liệu đã gửi đi rồi.
        attachment: file
          ? { name: file.name, contentType: file.type, sizeBytes: file.size }
          : undefined,
        notices: [],
        status: 'done',
      }
      setMessages((prev) => [...prev, userMsg])
      const assistantId = appendAssistant()
      drive(
        { message: trimmed, session_id: sessionIdRef.current, turn_id: genId() },
        assistantId,
        undefined,
        file
      )
    },
    [drive, appendAssistant]
  )

  const decide = useCallback(
    (proposalId: string, decision: ApprovalDecision) => {
      if (streamingRef.current) return

      // Flip the pending card to its in-flight state so the buttons disable immediately.
      setMessages((prev) =>
        prev.map((m) =>
          m.approval?.proposalId === proposalId && m.approval.status === 'pending'
            ? {
                ...m,
                approval: {
                  ...m.approval,
                  status: decision === 'approve' ? 'approving' : 'rejecting',
                  decision,
                },
              }
            : m
        )
      )

      const assistantId = appendAssistant()
      drive(
        {
          approval: { proposal_id: proposalId, decision },
          session_id: sessionIdRef.current,
          turn_id: genId(),
        },
        assistantId,
        // Resolve the card when the decision turn finishes cleanly; mark it failed if it errored OR
        // the user cancelled it — either way the write may not have happened, so NEVER show a green
        // "approved" (B-note: an unconfirmed write must not read as confirmed).
        ({ failed, cancelled }) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.approval?.proposalId === proposalId
                ? {
                    ...m,
                    approval: {
                      ...m.approval,
                      status: failed || cancelled ? 'failed' : 'resolved',
                    },
                  }
                : m
            )
          )
      )
    },
    [drive, appendAssistant]
  )

  /**
   * User-initiated Stop. Abort the in-flight fetch (KEEPING the token so the next turn doesn't
   * re-mint) and flag it so the turn's onDone marks the assistant message `stopped`. No-op if idle.
   */
  const cancelTurn = useCallback(() => {
    if (!streamingRef.current) return
    cancelledRef.current = true
    abort()
  }, [abort])

  /**
   * Resend the last user message after a retryable error, re-driving into its EXISTING assistant
   * bubble (no duplicate user message). Only valid when a bubble is marked retryable — a plan-gate
   * refusal or a clean turn leaves nothing to retry.
   */
  const retryLast = useCallback(() => {
    if (streamingRef.current || retryableMessageId === null) return
    const last = lastTurnRef.current
    if (!last) return
    // Clear the errored bubble back to streaming before replaying, so the error line disappears.
    // charts/qrCodes MUST reset too: the replayed turn re-runs the same tools and re-appends its
    // charts/QRs, so leaving the old ones would render each one twice (stale + fresh).
    patchMessage(last.assistantId, {
      status: 'streaming',
      text: '',
      notices: [],
      charts: [],
      qrCodes: [],
      errorText: undefined,
      errorKind: undefined,
    })
    setRetryableMessageId(null)
    drive(last.body, last.assistantId)
  }, [retryableMessageId, drive, patchMessage])

  /**
   * Record a 👍/👎 on an assistant answer. Optimistic: highlight the chosen thumb immediately, fire
   * the best-effort POST /feedback, and revert on failure (a dropped rating is a miss, not an error
   * — no toast, no error state). No-ops when the bubble has no turn_id (an untraced turn can't be
   * rated), when there's no session yet, or when the same rating is re-clicked (the backend UPSERT
   * would be a no-op). Switching 👍↔👎 is allowed; there is no "unset" (backend rating is ±1 only).
   */
  const submitFeedback = useCallback(
    (messageId: string, rating: 1 | -1) => {
      const sid = sessionIdRef.current
      const msg = messagesRef.current.find((m) => m.id === messageId)
      if (!sid || !msg?.turn_id || msg.feedback === rating) return
      const prev = msg.feedback
      patchMessage(messageId, { feedback: rating })
      void sendFeedback(sid, msg.turn_id, rating).then((ok) => {
        if (!ok) patchMessage(messageId, { feedback: prev })
      })
    },
    [patchMessage, sendFeedback]
  )

  const newConversation = useCallback(() => {
    reset()
    setMessages([])
    setSessionId(null)
    sessionIdRef.current = null
    // Xoá cả chỗ nhớ, không chỉ state: thiếu dòng này thì bấm "Hội thoại mới" rồi F5 là hội thoại
    // cũ quay lại — đúng thứ người dùng vừa bảo là họ không muốn nữa.
    if (orgIdRef.current) clearSessionId(orgIdRef.current)
    setIsStreaming(false)
    streamingRef.current = false
    cancelledRef.current = false
    lastTurnRef.current = null
    setRetryableMessageId(null)
    // Đọc org qua `orgIdRef` (gán lúc render, ngay trên) chứ không qua closure: thiếu nó thì sau
    // khi đổi org, hàm này vẫn giữ `orgId` cũ và sẽ xoá phiên của org TRƯỚC ĐÓ. Dùng ref thay vì
    // thêm vào deps để callback giữ nguyên danh tính — cùng lối mà file này đã dùng sẵn.
  }, [reset])

  const value: AgentChatContextValue = {
    isOpen,
    setIsOpen,
    messages,
    isStreaming,
    sessionId,
    sendMessage,
    decide,
    newConversation,
    cancelTurn,
    retryLast,
    retryableMessageId,
    usage,
    submitFeedback,
    createdLinkIds,
  }

  return <AgentChatContext.Provider value={value}>{children}</AgentChatContext.Provider>
}

export function useAgentChatContext(): AgentChatContextValue {
  const ctx = useContext(AgentChatContext)
  if (ctx === undefined) {
    throw new Error('useAgentChatContext must be used within an AgentChatProvider')
  }
  return ctx
}

/**
 * Như `useAgentChatContext` nhưng trả `undefined` thay vì ném khi chưa có provider.
 *
 * ★ Dành cho những chỗ **quan tâm tới chat nhưng không phụ thuộc vào nó** — hiện là danh sách Link
 * & Artifact, nơi chỉ cần biết hàng nào trợ lý vừa tạo để gắn nhãn.
 *
 * Vì sao cần bản này: dùng `useAgentChatContext` ở đó biến một tính năng phụ thành điều kiện sống
 * còn của bảng chính. Bảng sẽ ném lỗi ở bất cứ đâu không có provider — và nó đã ném thật, trong
 * ba ca test của `touchpoint-card`. Một tính năng tô màu không được quyền làm vỡ thứ nó tô.
 */
export function useAgentChatContextOptional(): AgentChatContextValue | undefined {
  return useContext(AgentChatContext)
}
