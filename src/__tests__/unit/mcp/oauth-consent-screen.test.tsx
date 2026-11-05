/**
 * MCP consent screen — the redirect destination the user is shown before pressing Allow.
 *
 * ─── WHY THIS FILE EXISTS AT ALL ────────────────────────────────────────────────────────────────
 * `redirectUriIsRegistered` ignores the port of a loopback redirect URI (RFC 8252 §7.3, required for
 * Claude Code to connect). That means any process on the user's machine can bind a port and satisfy
 * the match, and NOTHING server-side can distinguish it from the real client. The consent screen is
 * therefore not decoration here — it is the compensating control the relaxation was accepted against.
 *
 * A missing warning is silent in exactly the way that matters: the flow still completes, the tests
 * for the matcher still pass, and the only difference is that the human never learns the code is
 * going to an unverifiable program on their own computer. So the copy is asserted, not reviewed.
 *
 * The predicate is deliberately NOT stubbed — `isLoopbackRedirectUri` is imported for real, so this
 * file and the matcher cannot drift apart in opposite directions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import type { McpAuthorizationRequest, ResolvedClient } from '@/core/services/mcp-oauth.service'

const state = vi.hoisted(() => ({
  request: null as McpAuthorizationRequest | null,
}))

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: { get: async () => null, set: async () => 'OK', multi: () => ({}) },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`unexpected redirect to ${url}`)
  },
}))

vi.mock('@/shared/lib/auth/session', () => ({
  getSession: async () => ({ id: 'user-1', email: 'kei@li2.test' }),
}))

vi.mock('@/core/services/organization.service', () => ({
  organizationService: { getUserOrgs: async () => [{ id: 'org-1', name: 'Li2' }] },
}))

vi.mock('@/shared/lib/plan/plans', () => ({
  getOrganizationPlan: async () => ({ advanced_features_allowed: ['mcp_access'] }),
}))

/**
 * ⚠️ SPREAD, not replace. Replacing this module would stub out `isLoopbackRedirectUri` — the very
 * function under test — and the warning assertions below would then only prove that the test file
 * agrees with itself.
 */
vi.mock('@/core/services/mcp-oauth.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/services/mcp-oauth.service')>()
  return {
    ...actual,
    mintConsentToken: () => 'consent-token',
    mcpOAuthService: {
      validateAuthorizationRequest: async () => {
        if (!state.request) throw new Error('test did not set an authorization request')
        return state.request
      },
    },
  }
})

import McpConsentPage from '@/app/(protected)/mcp/consent/page'

const LOOPBACK_WARNING = 'runs on your own computer'

function client(redirectUris: string[]): ResolvedClient {
  return {
    clientId: 'li2mcp_test',
    clientName: 'Claude Code',
    redirectUris,
    source: 'registered',
  }
}

/** Render the server component. It is `async`, so it is awaited into an element tree first — React
 *  18's `renderToStaticMarkup` cannot resolve an async component on its own. */
async function renderConsent(request: McpAuthorizationRequest): Promise<string> {
  state.request = request
  const params = {
    client_id: request.client.clientId,
    redirect_uri: request.redirectUri,
    response_type: 'code',
    scope: request.requestedScopes.join(' '),
    code_challenge: request.codeChallenge,
    code_challenge_method: 'S256',
  }
  const element = (await McpConsentPage({ searchParams: params })) as ReactElement
  return renderToStaticMarkup(element)
}

function authorizationRequest(
  overrides: Partial<McpAuthorizationRequest> = {}
): McpAuthorizationRequest {
  return {
    client: client(['https://claude.ai/api/mcp/auth_callback']),
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
  process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://app.li2.test'
  state.request = null
})

describe('consent screen — the redirect destination is visible', () => {
  it('names the hostname the code will be delivered to', async () => {
    const html = await renderConsent(authorizationRequest())
    expect(html).toContain('claude.ai')
  })

  it('names the loopback hostname too, rather than hiding a local destination', async () => {
    const html = await renderConsent(
      authorizationRequest({
        client: client(['http://localhost/callback', 'http://127.0.0.1/callback']),
        redirectUri: 'http://localhost:3118/callback',
      })
    )
    expect(html).toContain('localhost')
  })
})

describe('consent screen — the loopback warning', () => {
  it('warns when every registered redirect URI is loopback', async () => {
    // Claude Code's real Client ID Metadata Document shape. This is the case the port relaxation
    // was added for, so it is the case that must carry the warning.
    const html = await renderConsent(
      authorizationRequest({
        client: client(['http://localhost/callback', 'http://127.0.0.1/callback']),
        redirectUri: 'http://localhost:3118/callback',
      })
    )
    expect(html).toContain(LOOPBACK_WARNING)
  })

  it('stays silent for a hosted client whose identity is anchored to a domain', async () => {
    // ⚠ THE NEGATIVE CONTROL. Without it, a warning rendered unconditionally would pass the test
    // above — and a warning shown on every connect is a warning nobody reads by the time it matters.
    const html = await renderConsent(authorizationRequest())
    expect(html).not.toContain(LOOPBACK_WARNING)
  })

  it('stays silent when the client ALSO has a real https callback', async () => {
    // The trigger is "all registered URIs are loopback", not "this one is". A client that can also
    // be reached at a verified domain has an identity; warning about it dilutes the real signal.
    const html = await renderConsent(
      authorizationRequest({
        client: client(['http://localhost/callback', 'https://claude.ai/api/mcp/auth_callback']),
        redirectUri: 'http://localhost:3118/callback',
      })
    )
    expect(html).toContain('localhost')
    expect(html).not.toContain(LOOPBACK_WARNING)
  })
})
