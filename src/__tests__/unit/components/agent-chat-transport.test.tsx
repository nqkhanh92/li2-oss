import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAgentChatTransport } from '@/features/agent-chat/hooks/use-agent-chat-transport'
import { queryClient } from '@/shared/lib/react-query'

// A ReadableStream of UTF-8 SSE bytes that closes after the given frames — WITHOUT any terminal
// `result`/`error` frame unless the caller includes one. Models a clean disconnect.
function sseBody(frames: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const f of frames) controller.enqueue(enc.encode(f))
      controller.close()
    },
  })
}

function okStream(frames: string[]): Response {
  return { ok: true, status: 200, body: sseBody(frames) } as unknown as Response
}

describe('useAgentChatTransport — terminal-event guard', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_LI2_AI_BASE_URL = 'http://li2-ai.test'
  })
  afterEach(() => {
    vi.restoreAllMocks()
    // The Casdoor refresh now rides the shared queryClient under key ['refreshToken'] (so a mint
    // and an axios 401 collapse onto ONE /auth/refresh). Clear it between tests so a cached refresh
    // result cannot leak across cases.
    queryClient.clear()
  })

  it('reports an error when the stream closes without a terminal result/error frame', async () => {
    // First fetch = mint (token), second = the turn stream that ends WITHOUT a result frame.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-1' } }),
      } as unknown as Response)
      .mockResolvedValueOnce(okStream(['event: token\ndata: {"text":"hi"}\n\n']))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))

    const onError = vi.fn()
    const onResult = vi.fn()
    await result.current.runTurn(
      { message: 'hello', session_id: null, turn_id: 't1' },
      { onError, onResult }
    )

    // No terminal frame arrived → the turn must surface an error, NOT resolve as a silent success
    // (which would flip an approval card to a green "Approved" for an unconfirmed write).
    expect(onResult).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('stream ended without a result', 'generic')
  })

  it('does NOT report an error when a terminal result frame is present', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-1' } }),
      } as unknown as Response)
      .mockResolvedValueOnce(
        okStream([
          'event: token\ndata: {"text":"hi"}\n\n',
          'event: result\ndata: {"stop_reason":"end_turn"}\n\n',
        ])
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))

    const onError = vi.fn()
    const onResult = vi.fn()
    await result.current.runTurn(
      { message: 'hello', session_id: null, turn_id: 't1' },
      { onError, onResult }
    )

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('treats an approval_request as terminal — a propose turn ends with no result/error', async () => {
    // A WRITE proposal (turn 1) ends after the approval card with NO result/error frame — the card
    // IS the terminal state, the turn parks for the user's decision (turn.py:1826-1852). The client
    // must NOT mistake this clean park for a dropped stream, or a red "stream ended without a result"
    // + retry panel appears under the card.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-1' } }),
      } as unknown as Response)
      .mockResolvedValueOnce(
        okStream([
          'event: approval_request\ndata: {"proposal_id":"p1","action":{"tool":"create_short_link","mode":"single","links":[{"destination":"https://example.com"}]},"render":"OK?"}\n\n',
        ])
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))

    const onApprovalRequest = vi.fn()
    const onError = vi.fn()
    await result.current.runTurn(
      { message: 'Tạo link tới example.com', session_id: null, turn_id: 't1' },
      { onApprovalRequest, onError }
    )

    expect(onApprovalRequest).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('routes a chart frame to onChart with the parsed structured payload', async () => {
    // A chart event carries the tool's structured data verbatim; the client must parse it and hand
    // it to onChart (so the UI can render a real chart component) — never treat it as prose.
    const chartData = {
      period_days: 30,
      granularity: 'daily',
      buckets: [
        { start: '2026-07-16', link_clicks: 2, qr_scans: 1, nfc_taps: 0, total_interactions: 3 },
      ],
      summary: {
        peak: { start: '2026-07-16', interactions: 3 },
        trend_direction: 'down',
        buckets_with_activity: 1,
      },
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-1' } }),
      } as unknown as Response)
      .mockResolvedValueOnce(
        okStream([
          `event: chart\ndata: ${JSON.stringify({ kind: 'clicks_timeseries', data: chartData })}\n\n`,
          'event: result\ndata: {"stop_reason":"end_turn"}\n\n',
        ])
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))

    const onChart = vi.fn()
    const onError = vi.fn()
    await result.current.runTurn(
      { message: 'vẽ số click theo ngày', session_id: null, turn_id: 't1' },
      { onChart, onError }
    )

    expect(onChart).toHaveBeenCalledTimes(1)
    expect(onChart).toHaveBeenCalledWith({ kind: 'clicks_timeseries', data: chartData })
    expect(onError).not.toHaveBeenCalled()
  })

  it('routes a qr frame to onQr with the parsed short_url + name, non-terminal', async () => {
    // A qr event carries one created link's short_url + name; the client must parse it and hand it
    // to onQr (so the UI can render the QR tile) — and it must NOT count as the terminal frame (the
    // trailing result still is), mirroring the chart-frame test above.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-1' } }),
      } as unknown as Response)
      .mockResolvedValueOnce(
        okStream([
          `event: qr\ndata: ${JSON.stringify({ short_url: 'https://li2.ai/abc123', name: 'Khuyến mãi hè', link_id: 'tp-9' })}\n\n`,
          'event: result\ndata: {"stop_reason":"approved_write"}\n\n',
        ])
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))

    const onQr = vi.fn()
    const onResult = vi.fn()
    const onError = vi.fn()
    await result.current.runTurn(
      { approval: { proposal_id: 'p1', decision: 'approve' }, session_id: null, turn_id: 't1' },
      { onQr, onResult, onError }
    )

    expect(onQr).toHaveBeenCalledTimes(1)
    expect(onQr).toHaveBeenCalledWith({
      short_url: 'https://li2.ai/abc123',
      name: 'Khuyến mãi hè',
      link_id: 'tp-9',
    })
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('routes a status frame to onStatus, distinct from onNotice', async () => {
    // The KB branch's transient progress lines ride `event: status`, NOT `event: notice`. The
    // client must route them to onStatus (a replaceable progress slot the UI auto-clears) and
    // must NOT deliver them to onNotice (which appends persistent amber warnings) — mixing the
    // two is exactly the stale-"Đang đọc…" bug this frame fixes.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-1' } }),
      } as unknown as Response)
      .mockResolvedValueOnce(
        okStream([
          `event: status\ndata: ${JSON.stringify({ text: 'Đang đọc tài liệu…' })}\n\n`,
          'event: result\ndata: {"stop_reason":"end_turn"}\n\n',
        ])
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))

    const onStatus = vi.fn()
    const onNotice = vi.fn()
    const onError = vi.fn()
    await result.current.runTurn(
      { message: 'tạo short link như thế nào', session_id: null, turn_id: 't1' },
      { onStatus, onNotice, onError }
    )

    expect(onStatus).toHaveBeenCalledTimes(1)
    expect(onStatus).toHaveBeenCalledWith({ text: 'Đang đọc tài liệu…' })
    expect(onNotice).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('refreshes the Casdoor session and retries when the mint returns 401', async () => {
    // WHY: the mint call uses a raw fetch that bypasses the axios auto-refresh interceptor. After a
    // long idle the Casdoor access token expires → mint 401s (getSession → null). The hook must
    // call /api/auth/refresh once and retry the mint, so the chat recovers exactly like every other
    // app call — instead of dead-ending on "mint failed 401" until the user manually re-logs in.
    const fetchMock = vi
      .fn()
      // 1) first mint attempt → 401 (access token expired)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      } as unknown as Response)
      // 2) /api/auth/refresh → ok (new access-token cookie set server-side)
      .mockResolvedValueOnce({ ok: true, status: 200 } as unknown as Response)
      // 3) retried mint → ok, returns a token
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-refreshed' } }),
      } as unknown as Response)
      // 4) the turn stream
      .mockResolvedValueOnce(okStream(['event: result\ndata: {"stop_reason":"end_turn"}\n\n']))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))

    const onError = vi.fn()
    const onResult = vi.fn()
    await result.current.runTurn(
      { message: 'tạo short link', session_id: null, turn_id: 't1' },
      { onError, onResult }
    )

    // the refresh endpoint was hit between the two mint attempts
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls).toEqual([
      '/api/agent/session',
      '/api/auth/refresh',
      '/api/agent/session',
      'http://li2-ai.test/turn',
    ])
    // and the turn ultimately succeeded (no mint error surfaced)
    expect(onError).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalled()
  })

  it('redirects to login AND surfaces a mint error when the refresh also fails (refresh token gone)', async () => {
    // WHY: if /auth/refresh fails too (refresh token expired/revoked), the whole session is dead —
    // the hook mirrors the axios interceptor's dead-session behavior (axios.ts:96) and sends the
    // user to /auth/login, instead of leaving them on a chat that only shows a generic error. It
    // still surfaces the error too (so a caught navigation-blocked env is not left hanging). A 403
    // (plan gate) is a different path and must never trigger a refresh; this locks the
    // 401→refresh-fails→redirect+error branch.
    const hrefSpy = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        set href(v: string) {
          hrefSpy(v)
        },
      },
    })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      } as unknown as Response)
      // refresh fails
      .mockResolvedValueOnce({ ok: false, status: 401 } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))

    const onError = vi.fn()
    const onResult = vi.fn()
    await result.current.runTurn(
      { message: 'tạo short link', session_id: null, turn_id: 't1' },
      { onError, onResult }
    )

    // refresh failed → no retry mint, no turn stream; the user is sent to log in AND the error is
    // surfaced (generic kind, not 'not-entitled' which is only for a 403 plan gate)
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls).toEqual(['/api/agent/session', '/api/auth/refresh'])
    expect(hrefSpy).toHaveBeenCalledWith('/auth/login')
    expect(onResult).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][1]).toBe('generic')

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('sendFeedback posts session_id/turn_id/rating with a Bearer token and returns true on 201', async () => {
    // The 👍/👎 rides the SAME authed path as a turn: mint first (no token yet), then POST /feedback
    // directly to li2-ai with the bearer. A 201 is the ONLY success — the caller keeps its optimistic
    // highlight only on true.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-1' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 201 } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))
    const ok = await result.current.sendFeedback('sess-1', 'turn-1', 1)

    expect(ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toBe('http://li2-ai.test/feedback')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      session_id: 'sess-1',
      turn_id: 'turn-1',
      rating: 1,
    })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1')
  })

  it('sendFeedback returns false when the POST is not 201 (best-effort → caller reverts)', async () => {
    // A dropped rating is a miss, not a turn: any non-201 (here a 503) collapses to false so the
    // provider silently reverts the optimistic thumb — no error surface, no retry panel.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { token: 'tok-1' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAgentChatTransport('org-1'))
    const ok = await result.current.sendFeedback('sess-1', 'turn-1', -1)

    expect(ok).toBe(false)
  })
})
