'use client'

/**
 * Phase 0 seam-prover panel (task-0.7), updated for task-1a.3 session continuity.
 * Deliberately minimal — not a feature, just proves the auth hops, SSE transport, and
 * session continuity work end-to-end before Phase 1b ships the real chat UX.
 *
 * Transport note: native EventSource cannot send Authorization headers, so this uses fetch-based
 * streaming. Do NOT copy the use-sse-notifications.ts pattern here.
 */

import { useState } from 'react'

interface AgentProbePanelProps {
  orgId: string
}

type PanelState = 'idle' | 'minting' | 'streaming' | 'done' | 'error'

interface ResultEvent {
  stop_reason: string | null
  model: string
}

type FeedbackRating = 1 | -1

export function AgentProbePanel({ orgId }: AgentProbePanelProps) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<PanelState>('idle')
  const [token, setToken] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  // Correlation id for feedback (task-1b.3 Decision #1) — read from the `session` SSE event.
  // May be absent if P3 (the correlation-id emit) is reverted while P5 is live — the feedback
  // control must hide in that case, never POST turn_id: undefined (rollback-safety criterion).
  const [correlationTurnId, setCorrelationTurnId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [notices, setNotices] = useState<string[]>([])
  const [result, setResult] = useState<ResultEvent | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [vote, setVote] = useState<FeedbackRating | null>(null)
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  function addLog(msg: string) {
    setLog((prev) => [...prev, `${new Date().toISOString().slice(11, 23)} ${msg}`])
  }

  async function mintToken(): Promise<string> {
    const res = await fetch('/api/agent/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(`mint failed ${res.status}: ${body?.message ?? res.statusText}`)
    }
    const body = await res.json()
    return body.data.token as string
  }

  async function runTurn(
    currentToken: string,
    userMessage: string,
    currentSessionId: string | null,
    retried = false,
  ): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_LI2_AI_BASE_URL
    if (!baseUrl) throw new Error('NEXT_PUBLIC_LI2_AI_BASE_URL is not set')

    setState('streaming')
    setToken(currentToken)
    const turnId = crypto.randomUUID()
    addLog(`→ POST ${baseUrl}/turn (turn_id=${turnId} session_id=${currentSessionId ?? 'null'})`)

    const res = await fetch(`${baseUrl}/turn`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        session_id: currentSessionId,
        turn_id: turnId,
      }),
    })

    // Pre-stream HTTP errors (auth/admission/dedup/session/spend gates fire before body starts)
    if (!res.ok) {
      if (res.status === 401 && !retried) {
        addLog('← 401 from li2-ai — re-minting once')
        const fresh = await mintToken()
        addLog('← fresh token minted')
        return runTurn(fresh, userMessage, currentSessionId, true)
      }
      const body = await res.json().catch(() => ({}))
      throw new Error(`turn failed ${res.status}: ${body?.error ?? res.statusText}`)
    }

    addLog(`← 200 streaming`)

    // Fetch-based SSE reader — splits on \n\n, parses event:/data: frames
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    // Track receipt with a local, NOT React state: setResult() schedules a re-render but does
    // not update the `result` const captured in this closure, so reading it post-loop is stale.
    let gotResult = false

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      // Process complete SSE frames (terminated by \n\n)
      const frames = buf.split('\n\n')
      buf = frames.pop() ?? '' // last item may be incomplete

      for (const frame of frames) {
        if (!frame.trim()) continue
        const lines = frame.split('\n')
        let eventType = 'message'
        let dataLine = ''
        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim()
          if (line.startsWith('data:')) dataLine = line.slice(5).trim()
        }
        addLog(`← SSE event:${eventType} data:${dataLine.slice(0, 120)}`)

        if (eventType === 'session') {
          const parsed = JSON.parse(dataLine) as { session_id: string | null; turn_id?: string }
          // A null session_id means the turn ran untraced (DB blip) — keep whatever
          // session_id we already had rather than overwriting it with null.
          if (parsed.session_id !== null) {
            setSessionId(parsed.session_id)
          }
          // turn_id may be absent (a P3 revert while P5 is live) — the feedback control must
          // hide in that case, never POST turn_id: undefined (rollback-safety criterion).
          setCorrelationTurnId(parsed.turn_id ?? null)
        } else if (eventType === 'token') {
          const parsed = JSON.parse(dataLine) as { text: string }
          setAnswer((prev) => prev + parsed.text)
        } else if (eventType === 'notice') {
          const parsed = JSON.parse(dataLine) as { text: string }
          setNotices((prev) => [...prev, parsed.text])
        } else if (eventType === 'result') {
          const parsed = JSON.parse(dataLine) as ResultEvent
          gotResult = true
          setResult(parsed)
          setState('done')
        } else if (eventType === 'error') {
          const parsed = JSON.parse(dataLine) as { message: string }
          throw new Error(`agent error: ${parsed.message}`)
        }
      }
    }

    // Stream ended without a result event
    if (!gotResult) {
      throw new Error('stream ended with no result event')
    }
  }

  async function handleSend() {
    if (!message.trim()) return
    setResult(null)
    setErrorMsg(null)
    setAnswer('')
    setNotices([])
    setLog([])
    setCorrelationTurnId(null)
    setVote(null)
    setFeedbackError(null)
    setState('minting')

    try {
      addLog('→ POST /api/agent/session')
      const mintedToken = await mintToken()
      addLog(`← token minted (exp 15m)`)
      await runTurn(mintedToken, message, sessionId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setState('error')
      addLog(`✗ ${msg}`)
    }
  }

  function handleNewSession() {
    setSessionId(null)
    setAnswer('')
    setNotices([])
    setResult(null)
    setErrorMsg(null)
    setLog([])
    setToken(null)
    setCorrelationTurnId(null)
    setVote(null)
    setFeedbackError(null)
    setState('idle')
  }

  async function submitFeedback(
    rating: FeedbackRating,
    retried = false,
    tokenOverride?: string,
  ) {
    // Token is threaded by PARAMETER (like runTurn's currentToken), not read from state:
    // setToken() does not update the `token` closure variable synchronously, so a retry that
    // re-read `token` would resend the SAME expired token and 401 again. The fresh token from
    // the 401 re-mint is passed straight into the recursive call via tokenOverride.
    const authToken = tokenOverride ?? token
    // Disabled by the caller (see the button's `disabled`) whenever sessionId or
    // correlationTurnId is null — this is defence-in-depth against a stale closure.
    if (!authToken || !sessionId || !correlationTurnId) return

    const baseUrl = process.env.NEXT_PUBLIC_LI2_AI_BASE_URL
    if (!baseUrl) {
      setFeedbackError('NEXT_PUBLIC_LI2_AI_BASE_URL is not set')
      return
    }

    setFeedbackBusy(true)
    setFeedbackError(null)
    try {
      const res = await fetch(`${baseUrl}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          turn_id: correlationTurnId,
          rating,
        }),
      })

      if (!res.ok) {
        if (res.status === 401 && !retried) {
          const fresh = await mintToken()
          setToken(fresh)
          setFeedbackBusy(false)
          return submitFeedback(rating, true, fresh)
        }
        const body = await res.json().catch(() => ({}))
        throw new Error(`feedback failed ${res.status}: ${body?.error ?? res.statusText}`)
      }

      setVote(rating)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFeedbackError(msg)
    } finally {
      setFeedbackBusy(false)
    }
  }

  const busy = state === 'minting' || state === 'streaming'

  return (
    <div style={{ fontFamily: 'monospace', padding: 24, maxWidth: 700 }}>
      <h2 style={{ marginBottom: 8 }}>Agent Probe — session continuity tester</h2>
      <p style={{ color: '#666', marginBottom: 16, fontSize: 13 }}>
        org_id: <code>{orgId}</code>
        {' · '}
        session_id: <code>{sessionId ?? '(new session)'}</code>
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message…"
          disabled={busy}
          style={{ flex: 1, padding: '8px 10px' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy) handleSend()
          }}
        />
        <button onClick={handleSend} disabled={busy || !message.trim()} style={{ padding: '8px 20px' }}>
          {state === 'minting' ? 'Minting…' : state === 'streaming' ? 'Streaming…' : 'Send'}
        </button>
        <button onClick={handleNewSession} disabled={busy} style={{ padding: '8px 14px' }}>
          New session
        </button>
      </div>

      {/* Streamed answer */}
      {(answer || state === 'streaming') && (
        <div
          style={{
            background: '#fafafa',
            border: '1px solid #ddd',
            padding: 12,
            borderRadius: 4,
            marginBottom: 16,
            whiteSpace: 'pre-wrap',
          }}
        >
          {answer || '…'}
        </div>
      )}

      {/* Feedback control (task-1b.3 P5) — only after a terminal turn with a non-empty answer
          (Decision #4). Hidden (not disabled) when sessionId or correlationTurnId is missing —
          an untraced turn, or a P3 revert with no turn_id, has no row to reference. */}
      {state === 'done' && answer.trim() && sessionId !== null && correlationTurnId !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            aria-label="Rate this response helpful"
            aria-pressed={vote === 1}
            onClick={() => submitFeedback(1)}
            disabled={feedbackBusy}
            style={{
              padding: '4px 10px',
              fontSize: 16,
              background: vote === 1 ? '#e0ffe0' : 'transparent',
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: feedbackBusy ? 'default' : 'pointer',
            }}
          >
            👍
          </button>
          <button
            type="button"
            aria-label="Rate this response unhelpful"
            aria-pressed={vote === -1}
            onClick={() => submitFeedback(-1)}
            disabled={feedbackBusy}
            style={{
              padding: '4px 10px',
              fontSize: 16,
              background: vote === -1 ? '#ffe0e0' : 'transparent',
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: feedbackBusy ? 'default' : 'pointer',
            }}
          >
            👎
          </button>
          {feedbackError && (
            <span style={{ color: '#c00', fontSize: 12 }}>✗ {feedbackError}</span>
          )}
        </div>
      )}

      {/* Notices */}
      {notices.map((n, i) => (
        <div
          key={i}
          style={{
            background: '#fff8e1',
            border: '1px solid #e0a800',
            padding: 10,
            borderRadius: 4,
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          ⚠ {n}
        </div>
      ))}

      {/* Event log */}
      {log.length > 0 && (
        <div
          style={{
            background: '#111',
            color: '#0f0',
            padding: 12,
            borderRadius: 4,
            fontSize: 12,
            marginBottom: 16,
            whiteSpace: 'pre-wrap',
          }}
        >
          {log.join('\n')}
        </div>
      )}

      {/* Result */}
      {state === 'done' && result && (
        <div style={{ background: '#f0fff0', border: '1px solid #090', padding: 12, borderRadius: 4 }}>
          <strong>✓ result</strong>
          <pre style={{ marginTop: 8, fontSize: 13 }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Error */}
      {state === 'error' && errorMsg && (
        <div style={{ background: '#fff0f0', border: '1px solid #c00', padding: 12, borderRadius: 4 }}>
          <strong>✗ error</strong>
          <pre style={{ marginTop: 8, fontSize: 13 }}>{errorMsg}</pre>
        </div>
      )}
    </div>
  )
}
