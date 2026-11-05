/**
 * MCP OAuth endpoints — the WIRE FORMAT (plan Phase 3a).
 *
 * ★ WHY THESE ARE SEPARATE FROM THE SERVICE TESTS. The service tests prove the protocol decisions
 * are right. These prove the bytes on the wire are right, which is a different failure mode and the
 * one the plan calls out explicitly: li2-app wraps every other response in `APIResponse.ok({data})`
 * or `BaseError.toResponse()`, and an OAuth client parses NEITHER. If someone "standardizes" this
 * route later, no test of the service would notice — the flow would still be correct and every
 * client would still break, reporting nothing more useful than a parse error.
 *
 * So these tests assert the envelope is ABSENT, and pin the exact keys, status codes and cache
 * headers that RFC 6749 §5.1/§5.2, RFC 7591 §3.2 and RFC 7009 §2.2 require.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'

vi.mock('@/core/repositories/mcp-oauth.repository', async () => {
  const { FakeMcpOAuthRepository } = await import('@/__tests__/__mocks__/mcp-oauth-repo.mock')
  const repo = new FakeMcpOAuthRepository()
  return { mcpOAuthRepo: repo, McpOAuthRepository: FakeMcpOAuthRepository }
})

const { redisState } = vi.hoisted(() => ({ redisState: { registrationsInWindow: 0 } }))

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: {
    multi: () => {
      const chain = {
        zremrangebyscore: () => chain,
        zcard: () => chain,
        zadd: () => chain,
        expire: () => chain,
        exec: async () => [
          [null, 0],
          [null, redisState.registrationsInWindow],
          [null, 1],
          [null, 1],
        ],
      }
      return chain
    },
    get: async () => null,
    set: async () => 'OK',
  },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

import { GET, POST, OPTIONS } from '@/app/api/mcp/oauth/[...route]/route'
import { mcpOAuthService } from '@/core/services/mcp-oauth.service'
import { mcpOAuthRepo } from '@/core/repositories/mcp-oauth.repository'
import type { FakeMcpOAuthRepository } from '@/__tests__/__mocks__/mcp-oauth-repo.mock'

const ISSUER = 'https://app.li2.test'
const REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback'
const USER_ID = '11111111-1111-4111-8111-111111111111'
const repo = mcpOAuthRepo as unknown as FakeMcpOAuthRepository

/** The exact body Claude Desktop sent in the Phase 0.2 spike (finding 8). */
const CLAUDE_REGISTRATION = {
  redirect_uris: [REDIRECT_URI],
  token_endpoint_auth_method: 'none',
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  scope: 'openid profile email',
  client_name: 'Claude',
  application_type: 'web',
}

function postJson(segment: string, body: unknown) {
  return POST(
    new NextRequest(`${ISSUER}/api/mcp/oauth/${segment}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
      body: JSON.stringify(body),
    }),
    { params: { route: [segment] } }
  )
}

function postForm(segment: string, form: Record<string, string>) {
  return POST(
    new NextRequest(`${ISSUER}/api/mcp/oauth/${segment}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    }),
    { params: { route: [segment] } }
  )
}

function getAuthorize(query: Record<string, string>) {
  const url = new URL(`${ISSUER}/api/mcp/oauth/authorize`)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return GET(new NextRequest(url, { method: 'GET' }), { params: { route: ['authorize'] } })
}

function pkcePair() {
  const verifier = randomBytes(48).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier, 'ascii').digest('base64url') }
}

/** Register a client, then run authorize + the consent step 3b will own, to reach a live code. */
async function connectClient(challenge: string, scopes: ('read' | 'write')[] = ['read']) {
  const registration = await (await postJson('register', CLAUDE_REGISTRATION)).json()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: registration.client_id,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'opaque-state',
    scope: scopes.join(' '),
  })
  const request = await mcpOAuthService.validateAuthorizationRequest(params)
  const { code } = await mcpOAuthService.issueAuthorizationCode(request, USER_ID, scopes)
  return { clientId: registration.client_id as string, code }
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_BASE_URL = ISSUER
  redisState.registrationsInWindow = 0
  repo.reset()
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('POST /register', () => {
  it('answers 201 with a bare RFC 7591 body — no data/message/success envelope', async () => {
    const response = await postJson('register', CLAUDE_REGISTRATION)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(response.headers.get('cache-control')).toBe('no-store')
    // ⛔ The envelope must not be here. These three keys are what `APIResponse.ok` would have added.
    expect(body).not.toHaveProperty('data')
    expect(body).not.toHaveProperty('success')
    expect(body).not.toHaveProperty('i18nMessage')

    expect(Object.keys(body).sort()).toEqual([
      'client_id',
      'client_id_issued_at',
      'client_name',
      'grant_types',
      'redirect_uris',
      'response_types',
      'scope',
      'token_endpoint_auth_method',
    ])
    expect(body.client_id).toMatch(/^li2mcp_[0-9a-f]{32}$/)
    expect(body).not.toHaveProperty('client_secret')
  })

  it('answers a bad registration with a bare RFC 7591 error', async () => {
    const response = await postJson('register', { redirect_uris: ['http://evil.example/cb'] })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(Object.keys(body).sort()).toEqual(['error', 'error_description'])
    expect(body.error).toBe('invalid_redirect_uri')
    expect(body).not.toHaveProperty('data')
  })

  it('answers 429 with Retry-After once the IP window is full', async () => {
    redisState.registrationsInWindow = 5
    const response = await postJson('register', CLAUDE_REGISTRATION)

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('3600')
    expect((await response.json()).error).toBe('temporarily_unavailable')
    // Rejected before the body was ever read — no row was written.
    expect(repo.clients.size).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('GET /authorize', () => {
  it('redirects a valid request to the consent page, carrying the request verbatim', async () => {
    const registration = await (await postJson('register', CLAUDE_REGISTRATION)).json()
    const response = await getAuthorize({
      response_type: 'code',
      client_id: registration.client_id,
      redirect_uri: REDIRECT_URI,
      code_challenge: pkcePair().challenge,
      code_challenge_method: 'S256',
      state: 'opaque-state',
      scope: 'read',
      resource: `${ISSUER}/api/mcp`, // RFC 8707 — accepted, never a reason to refuse
    })

    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location')!)
    // ⚠️ 3b owns this page. Until it exists this redirect 404s — the documented end of 3a.
    expect(location.pathname).toBe('/mcp/consent')
    expect(location.searchParams.get('client_id')).toBe(registration.client_id)
    expect(location.searchParams.get('resource')).toBe(`${ISSUER}/api/mcp`)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('reports an unknown client as a body, NOT as a redirect', async () => {
    // RFC 6749 §4.1.2.1 — redirecting before the client is proven is an open redirector.
    const response = await getAuthorize({
      response_type: 'code',
      client_id: 'li2mcp_00000000000000000000000000000000',
      redirect_uri: 'https://evil.example.com/cb',
      code_challenge: 'x',
      code_challenge_method: 'S256',
    })

    expect(response.status).toBe(401)
    expect(response.headers.get('location')).toBeNull()
    expect(await response.json()).toEqual({
      error: 'invalid_client',
      error_description: 'Unknown or unusable client.',
    })
  })

  it('reports a post-validation error BY REDIRECT, with state and RFC 9207 iss', async () => {
    const registration = await (await postJson('register', CLAUDE_REGISTRATION)).json()
    const response = await getAuthorize({
      response_type: 'code',
      client_id: registration.client_id,
      redirect_uri: REDIRECT_URI,
      code_challenge: 'x',
      code_challenge_method: 'plain', // rejected: S256 or nothing
      state: 'opaque-state',
    })

    /**
     * 303, not 302 — load-bearing, not incidental to this test's subject.
     *
     * The same `toErrorResponse` helper serves the consent POST, where a Stage-2 re-validation
     * failure also carries a `redirectTo`. A 302 answering a POST is re-sent as a POST by some
     * clients, which would deliver an authorization response to the third-party `redirect_uri` as a
     * cross-origin POST. This used to be an unstated `= 302` default on `redirectResponse`; if it
     * ever reads 302 here again, that default has come back.
     */
    expect(response.status).toBe(303)
    const location = new URL(response.headers.get('location')!)
    expect(location.origin + location.pathname).toBe(REDIRECT_URI)
    expect(location.searchParams.get('error')).toBe('invalid_request')
    expect(location.searchParams.get('state')).toBe('opaque-state')
    expect(location.searchParams.get('iss')).toBe(ISSUER)
  })

  it('does not answer /authorize with CORS headers', async () => {
    // It is a top-level navigation that depends on the session cookie; CORS has no place on it.
    const registration = await (await postJson('register', CLAUDE_REGISTRATION)).json()
    const response = await getAuthorize({
      response_type: 'code',
      client_id: registration.client_id,
      redirect_uri: REDIRECT_URI,
      code_challenge: pkcePair().challenge,
      code_challenge_method: 'S256',
    })
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('POST /token', () => {
  it('answers the authorization_code grant with a bare RFC 6749 §5.1 body', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await connectClient(challenge)

    const response = await postForm('token', {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
      resource: `${ISSUER}/api/mcp`, // accepted and ignored
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    // RFC 6749 §5.1 makes both of these a MUST on this endpoint.
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('pragma')).toBe('no-cache')

    expect(Object.keys(body).sort()).toEqual([
      'access_token',
      'expires_in',
      'refresh_token',
      'scope',
      'token_type',
    ])
    expect(body.token_type).toBe('Bearer')
    expect(body.expires_in).toBe(3600)
    expect(body.scope).toBe('read')
    expect(body).not.toHaveProperty('data')
    expect(body).not.toHaveProperty('success')
  })

  it('accepts a JSON body as well as form-encoded', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await connectClient(challenge)

    const response = await postJson('token', {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    })
    expect(response.status).toBe(200)
  })

  it('answers a reused code with a bare invalid_grant', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await connectClient(challenge)
    const form = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }

    expect((await postForm('token', form)).status).toBe(200)

    const replay = await postForm('token', form)
    expect(replay.status).toBe(400)
    expect(await replay.json()).toEqual({
      error: 'invalid_grant',
      error_description: 'The authorization grant is invalid, expired, or has already been used.',
    })
  })

  it('rotates on the refresh_token grant', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await connectClient(challenge)
    const first = await (
      await postForm('token', {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      })
    ).json()

    const rotated = await postForm('token', {
      grant_type: 'refresh_token',
      refresh_token: first.refresh_token,
      client_id: clientId,
    })
    const body = await rotated.json()
    expect(rotated.status).toBe(200)
    expect(body.refresh_token).not.toBe(first.refresh_token)

    // The old refresh token is dead the moment it is used.
    const replay = await postForm('token', {
      grant_type: 'refresh_token',
      refresh_token: first.refresh_token,
      client_id: clientId,
    })
    expect(replay.status).toBe(400)
    expect((await replay.json()).error).toBe('invalid_grant')
  })

  it('names a structurally missing parameter, which leaks nothing about any grant', async () => {
    const response = await postForm('token', { grant_type: 'authorization_code' })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'invalid_request',
      error_description: 'client_id is required.',
    })
  })

  it('rejects an unsupported grant type', async () => {
    const response = await postForm('token', { grant_type: 'password', client_id: 'x' })
    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('unsupported_grant_type')
  })

  it('carries CORS so browser-hosted clients can reach it', async () => {
    const response = await postForm('token', { grant_type: 'password', client_id: 'x' })
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('POST /revoke', () => {
  it('answers 200 with an empty body for a real token', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await connectClient(challenge)
    const tokens = await (
      await postForm('token', {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      })
    ).json()

    const response = await postForm('revoke', { token: tokens.access_token, client_id: clientId })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
    expect(await mcpOAuthService.validateAccessToken(tokens.access_token)).toBeNull()
  })

  it('answers an unknown token IDENTICALLY — RFC 7009 §2.2 forbids an oracle here', async () => {
    const response = await postForm('revoke', { token: 'li2mcp_at_never_existed', client_id: 'x' })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('Routing', () => {
  it('answers an unknown endpoint in the OAuth error shape, not the app envelope', async () => {
    const response = await postJson('introspect', {})
    expect(response.status).toBe(404)
    expect(Object.keys(await response.json()).sort()).toEqual(['error', 'error_description'])
  })

  it('answers a CORS preflight on the machine endpoints', async () => {
    const response = await OPTIONS(
      new NextRequest(`${ISSUER}/api/mcp/oauth/token`, { method: 'OPTIONS' }),
      { params: { route: ['token'] } }
    )
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('refuses a preflight on /authorize', async () => {
    const response = await OPTIONS(
      new NextRequest(`${ISSUER}/api/mcp/oauth/authorize`, { method: 'OPTIONS' }),
      { params: { route: ['authorize'] } }
    )
    expect(response.status).toBe(405)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
})
