/**
 * MCP OAuth consent token — the binding, not the signature (plan Phase 3b).
 *
 * That an HMAC verifies is uninteresting. What these tests hold down is WHAT it is bound to, because
 * every loosening below is invisible in production: the flow still works, the screen still says the
 * right thing, and the only difference is that a grant can now be obtained without the user ever
 * seeing the request. The attack is concrete — an attacker registers their own client and holds
 * their own PKCE verifier, so a code minted for them is a complete grant on the victim's account.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: { get: async () => null, set: async () => 'OK', multi: () => ({}) },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

import {
  mintConsentToken,
  verifyConsentToken,
  OAuthProtocolError,
  type McpAuthorizationRequest,
} from '@/core/services/mcp-oauth.service'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

function authorizationRequest(
  overrides: Partial<McpAuthorizationRequest> = {}
): McpAuthorizationRequest {
  return {
    client: {
      clientId: 'li2mcp_client_a',
      clientName: 'Claude',
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
      source: 'registered',
    },
    redirectUri: 'https://claude.ai/api/mcp/auth_callback',
    state: 'xyz',
    requestedScopes: ['read', 'write'],
    codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    resource: null,
    ...overrides,
  }
}

beforeEach(() => {
  process.env.AGENT_PASETO_PRIVATE_KEY = 'test-signing-root-key'
  vi.useRealTimers()
})

describe('consent token', () => {
  it('verifies the request it was minted for', () => {
    const request = authorizationRequest()
    expect(verifyConsentToken(mintConsentToken(USER_ID, request), USER_ID, request)).toBe(true)
  })

  /**
   * Session fixation in reverse: without this, a token harvested from an attacker's own consent
   * screen would approve the same client for whoever else's session posts it.
   */
  it('rejects a token minted for a different user', () => {
    const request = authorizationRequest()
    const token = mintConsentToken(OTHER_USER_ID, request)
    expect(verifyConsentToken(token, USER_ID, request)).toBe(false)
  })

  /** The core CSRF property: a token for the client the user actually saw cannot approve another. */
  it('rejects a token minted for a different client', () => {
    const token = mintConsentToken(USER_ID, authorizationRequest())
    const attacker = authorizationRequest({
      client: {
        clientId: 'li2mcp_attacker',
        clientName: 'Also Claude',
        redirectUris: ['https://evil.example/cb'],
        source: 'registered',
      },
    })
    expect(verifyConsentToken(token, USER_ID, attacker)).toBe(false)
  })

  /**
   * A client may register several redirect URIs, so the same client_id can front both an honest
   * callback and one an attacker controls. Binding the client alone would let a token approved for
   * the first be redeemed against the second.
   */
  it('rejects a token replayed against a different redirect_uri of the same client', () => {
    const token = mintConsentToken(USER_ID, authorizationRequest())
    const moved = authorizationRequest({ redirectUri: 'https://claude.ai/api/mcp/other_callback' })
    expect(verifyConsentToken(token, USER_ID, moved)).toBe(false)
  })

  /**
   * Binding the PKCE challenge is what stops a token being reused across two concurrent connect
   * attempts — including one the attacker started with a verifier they hold.
   */
  it('rejects a token replayed against a different PKCE challenge', () => {
    const token = mintConsentToken(USER_ID, authorizationRequest())
    const swapped = authorizationRequest({ codeChallenge: 'ZZZZlhoa2OwvFrEMTJguCHaoeK1t8URWbuGJZZZZ' })
    expect(verifyConsentToken(token, USER_ID, swapped)).toBe(false)
  })

  /**
   * ★ The privilege-escalation case. `issueAuthorizationCode` checks granted ⊆ requested against
   * whatever the POST claims was requested, so if scope were not signed, a token minted for a
   * read-only request would validate a submission claiming `scope=read write` — and consent would
   * have widened the client's request instead of narrowing it.
   */
  it('rejects a token minted for a narrower requested scope', () => {
    const token = mintConsentToken(USER_ID, authorizationRequest({ requestedScopes: ['read'] }))
    const widened = authorizationRequest({ requestedScopes: ['read', 'write'] })
    expect(verifyConsentToken(token, USER_ID, widened)).toBe(false)
  })

  it('rejects an expired token', () => {
    const request = authorizationRequest()
    const token = mintConsentToken(USER_ID, request)
    // 10-minute TTL; jump past it rather than sleeping.
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 11 * 60 * 1000)
    expect(verifyConsentToken(token, USER_ID, request)).toBe(false)
  })

  /**
   * The expiry is inside the signature, so pushing it out invalidates the whole token. Without that
   * the TTL would be a suggestion the client gets to edit.
   */
  it('rejects a token whose expiry has been extended by hand', () => {
    const request = authorizationRequest()
    const token = mintConsentToken(USER_ID, request)
    const forged = `${Number(token.split('.')[0]) + 86400}.${token.split('.').slice(1).join('.')}`
    expect(verifyConsentToken(forged, USER_ID, request)).toBe(false)
  })

  it.each(['', 'no-separator', '.', 'abc.def', `${Date.now()}.`])(
    'rejects the malformed token %j without throwing',
    (token) => {
      expect(verifyConsentToken(token, USER_ID, authorizationRequest())).toBe(false)
    }
  )
})

/**
 * Next compiles a separate bundle per route, so `mcp-oauth.service.ts` exists as several distinct
 * module copies at runtime and `OAuthProtocolError` is several distinct class objects. Combined with
 * the dev-only `globalThis` service cache, an error thrown by one bundle's class was being checked
 * against another's — `instanceof` said false and every OAuth failure became an opaque 500. Verified
 * live on 2026-07-29: the same `/authorize` request answered 401 or 500 depending purely on which
 * route was warmed first.
 *
 * This suite cannot reproduce that — vitest loads the module once — so the second case FAKES a
 * foreign copy: an error carrying the registry symbol but no relation to the local class. That is
 * exactly what the route sees, and `instanceof` is what fails on it.
 */
describe('OAuthProtocolError.is — bundle-proof type guard', () => {
  it('accepts an error from the local class', () => {
    expect(OAuthProtocolError.is(new OAuthProtocolError('invalid_grant', 'nope'))).toBe(true)
  })

  it('accepts an error from a FOREIGN copy of the class, which instanceof rejects', () => {
    class ForeignOAuthProtocolError extends Error {
      constructor() {
        super('invalid_grant: nope')
        Object.defineProperty(this, Symbol.for('li2.mcp.OAuthProtocolError'), { value: true })
      }
    }
    const foreign = new ForeignOAuthProtocolError()

    // This line IS the negative control for the lint rule that bans `instanceof` here: it has to
    // execute the banned pattern to prove the pattern returns the wrong answer.
    // eslint-disable-next-line no-restricted-syntax
    expect(foreign instanceof OAuthProtocolError).toBe(false) // ← the production bug, in one line
    expect(OAuthProtocolError.is(foreign)).toBe(true)
  })

  it.each([null, undefined, 'a string', 42, new Error('unrelated'), {}])(
    'rejects %p',
    (value) => {
      expect(OAuthProtocolError.is(value)).toBe(false)
    }
  )
})
