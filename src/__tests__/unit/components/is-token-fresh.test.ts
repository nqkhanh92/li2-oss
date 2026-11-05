import { describe, it, expect } from 'vitest'
import { isTokenFresh } from '@/features/agent-chat/hooks/use-agent-chat-transport'

// isTokenFresh is the proactive half of the token-expiry fix: a turn must never START with a
// token that is about to lapse, because a tool back-hop a few seconds into the turn (li2-ai
// forwarding a write to li2-app) has no way to re-mint — only the browser can. These cases
// encode the invariant "fresh iff more than `marginMs` remains", not just mechanical asserts.
describe('isTokenFresh', () => {
  it('is fresh when comfortably more than the margin remains — safe to reuse, no re-mint needed', () => {
    const now = Date.now()
    const expiry = now + 10 * 60 * 1000 // 10 min left
    const margin = 2 * 60 * 1000 // 2 min margin
    expect(isTokenFresh(expiry, now, margin)).toBe(true)
  })

  it('is NOT fresh once within the margin — this is the case that fixes the bug: a turn that starts here would risk lapsing mid-turn, before a later tool back-hop', () => {
    const now = Date.now()
    const expiry = now + 30 * 1000 // 30s left
    const margin = 2 * 60 * 1000 // 2 min margin
    expect(isTokenFresh(expiry, now, margin)).toBe(false)
  })

  it('is NOT fresh once already expired', () => {
    const now = Date.now()
    const expiry = now - 1000 // 1s in the past
    const margin = 2 * 60 * 1000
    expect(isTokenFresh(expiry, now, margin)).toBe(false)
  })

  it('is NOT fresh when expiry is unknown (null) — caller must mint rather than assume freshness', () => {
    const now = Date.now()
    const margin = 2 * 60 * 1000
    expect(isTokenFresh(null, now, margin)).toBe(false)
  })
})
