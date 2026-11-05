/**
 * MCP OAuth authorization server — the Phase 3a security checklist, one test per line of it.
 *
 * These are not shape tests. Every case here is a documented attack that the plan's checklist names
 * explicitly, and each failure mode is SILENT in production: a redirect_uri prefix match still logs
 * a successful login, a reusable code still returns a working token, and `plain` PKCE still
 * completes the flow. Nothing crashes when these regress — the server just quietly stops being an
 * authorization server.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHash, randomBytes } from 'node:crypto'
import { FakeMcpOAuthRepository } from '@/__tests__/__mocks__/mcp-oauth-repo.mock'

const { redisState } = vi.hoisted(() => ({
  redisState: { registrationsInWindow: 0, throwOnMulti: false },
}))

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: {
    multi: () => {
      if (redisState.throwOnMulti) throw new Error('redis down')
      const chain = {
        zremrangebyscore: () => chain,
        zcard: () => chain,
        zadd: () => chain,
        expire: () => chain,
        // `checkRateLimit` reads results[1][1] — the zcard, i.e. the count BEFORE this request.
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
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}))

import {
  McpOAuthService,
  OAuthProtocolError,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  type McpAuthorizationRequest,
} from '@/core/services/mcp-oauth.service'

const ISSUER = 'https://app.li2.test'
const USER_ID = '11111111-1111-4111-8111-111111111111'
const REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback'

let repo: FakeMcpOAuthRepository
let service: McpOAuthService

/** A real RFC 7636 verifier/challenge pair — computed, never hard-coded, so the test cannot drift
 *  from the algorithm it is checking. */
function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier, 'ascii').digest('base64url') }
}

function authorizeParams(overrides: Record<string, string | null> = {}): URLSearchParams {
  const base: Record<string, string | null> = {
    response_type: 'code',
    client_id: 'CLIENT',
    redirect_uri: REDIRECT_URI,
    code_challenge: 'CHALLENGE',
    code_challenge_method: 'S256',
    state: 'xyz',
    scope: 'read',
  }
  const merged = { ...base, ...overrides }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== null) params.set(key, value)
  }
  return params
}

/**
 * Run authorize and hand back the error it MUST throw, narrowed.
 *
 * The narrowing is the point: `.catch(e => e as OAuthProtocolError)` would widen the result to
 * `McpAuthorizationRequest | OAuthProtocolError`, and asserting on `.error` of that union is how a
 * test quietly starts passing against a call that resolved instead of rejecting.
 */
async function authorizeError(params: URLSearchParams): Promise<OAuthProtocolError> {
  try {
    await service.validateAuthorizationRequest(params)
  } catch (error) {
    // `.is()` rather than `instanceof`, so the test exercises the same guard the routes use.
    if (OAuthProtocolError.is(error)) return error
    throw error
  }
  throw new Error('expected validateAuthorizationRequest to reject, but it resolved')
}

/** Register a client and drive authorize+consent to a live code. */
async function grantCode(options: { challenge: string; scopes?: ('read' | 'write')[] } = { challenge: 'X' }) {
  const registered = await service.registerClient({
    client_name: 'Claude',
    redirect_uris: [REDIRECT_URI],
    token_endpoint_auth_method: 'none',
  })
  const request = await service.validateAuthorizationRequest(
    authorizeParams({
      client_id: registered.client_id,
      code_challenge: options.challenge,
      scope: (options.scopes ?? ['read']).join(' '),
    })
  )
  const { code } = await service.issueAuthorizationCode(request, USER_ID, options.scopes ?? ['read'])
  return { clientId: registered.client_id, code, request }
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_BASE_URL = ISSUER
  redisState.registrationsInWindow = 0
  redisState.throwOnMulti = false
  repo = new FakeMcpOAuthRepository()
  service = new McpOAuthService(repo as never)
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('/register — the contract captured from two real clients', () => {
  /** Verbatim from the Phase 0.2 spike (finding 8). Claude Desktop's callback is a fixed https URL. */
  const CLAUDE_DESKTOP_PAYLOAD = {
    redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'openid profile email',
    client_name: 'Claude',
    application_type: 'web',
  }

  /** Verbatim from the same spike (finding 5). Note the tail differs: `client_uri`, not
   *  `application_type` — which is exactly why unknown fields must be tolerated. */
  const MCP_INSPECTOR_PAYLOAD = {
    redirect_uris: ['http://localhost:6274/oauth/callback/debug'],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    client_name: 'MCP Inspector',
    client_uri: 'https://github.com/modelcontextprotocol/inspector',
    scope: 'openid profile email',
  }

  it('accepts Claude Desktop’s payload and stores only name, URIs, and auth method', async () => {
    const response = await service.registerClient(CLAUDE_DESKTOP_PAYLOAD)

    expect(response.client_id).toMatch(/^li2mcp_[0-9a-f]{32}$/)
    expect(response).not.toHaveProperty('client_secret') // public client — PKCE is the proof

    const stored = repo.clients.get(response.client_id)!
    // `application_type` and `scope` were accepted and dropped: three fields, no more.
    expect(stored).toMatchObject({
      client_name: 'Claude',
      redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      token_endpoint_auth_method: 'none',
    })
    expect(stored).not.toHaveProperty('application_type')
    expect(stored.last_granted_at).toBeNull() // sweep candidate until a grant completes
  })

  it('accepts MCP Inspector’s payload, whose tail differs from Claude’s', async () => {
    const response = await service.registerClient(MCP_INSPECTOR_PAYLOAD)
    expect(response.client_name).toBe('MCP Inspector')
    // Loopback http is allowed (RFC 8252 §7.3) — Inspector cannot work otherwise.
    expect(response.redirect_uris).toEqual(['http://localhost:6274/oauth/callback/debug'])
  })

  it('rejects a plaintext non-loopback redirect_uri', async () => {
    await expect(
      service.registerClient({ redirect_uris: ['http://evil.example.com/cb'] })
    ).rejects.toMatchObject({ error: 'invalid_redirect_uri' })
  })

  it('rejects a redirect_uri carrying a fragment', async () => {
    // RFC 6749 §3.1.2 forbids it, and it could only ever cause a silent mismatch later.
    await expect(
      service.registerClient({ redirect_uris: ['https://ok.example.com/cb#frag'] })
    ).rejects.toMatchObject({ error: 'invalid_redirect_uri' })
  })

  it('rejects a client asking to authenticate with a secret', async () => {
    await expect(
      service.registerClient({
        redirect_uris: [REDIRECT_URI],
        token_endpoint_auth_method: 'client_secret_post',
      })
    ).rejects.toMatchObject({ error: 'invalid_client_metadata' })
  })

  it('rate-limits by IP and fails CLOSED when Redis is unreachable', async () => {
    expect(await service.consumeRegistrationQuota('1.2.3.4')).toMatchObject({ allowed: true })

    redisState.registrationsInWindow = 5
    expect(await service.consumeRegistrationQuota('1.2.3.4')).toMatchObject({ allowed: false })

    // Unlike `withRateLimit`, an outage must not open the one unauthenticated DB write in the app.
    redisState.registrationsInWindow = 0
    redisState.throwOnMulti = true
    expect(await service.consumeRegistrationQuota('1.2.3.4')).toMatchObject({ allowed: false })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('/authorize — an https redirect_uri is matched by exact string, nothing else', () => {
  let clientId: string

  beforeEach(async () => {
    const registered = await service.registerClient({
      client_name: 'Claude',
      redirect_uris: [REDIRECT_URI],
    })
    clientId = registered.client_id
  })

  it('accepts the registered URI', async () => {
    const request = await service.validateAuthorizationRequest(authorizeParams({ client_id: clientId }))
    expect(request.redirectUri).toBe(REDIRECT_URI)
  })

  it.each([
    ['one extra character', `${REDIRECT_URI}x`],
    ['a trailing slash', `${REDIRECT_URI}/`],
    ['a different case', REDIRECT_URI.toUpperCase()],
    ['a suffixed host', 'https://claude.ai.evil.com/api/mcp/auth_callback'],
    ['an extra query parameter', `${REDIRECT_URI}?next=https://evil.com`],
    ['a path traversal back to the same string', 'https://claude.ai/api/mcp/../mcp/auth_callback'],
  ])('rejects %s', async (_label, candidate) => {
    // Each of these is accepted by SOME "helpful" matcher — prefix, normalized, case-insensitive.
    // The point of the exact-match rule is that all six fail.
    await expect(
      service.validateAuthorizationRequest(
        authorizeParams({ client_id: clientId, redirect_uri: candidate })
      )
    ).rejects.toBeInstanceOf(OAuthProtocolError)
  })

  it('reports an unmatched redirect_uri WITHOUT redirecting', async () => {
    // RFC 6749 §4.1.2.1: redirecting here would hand an attacker an open redirector.
    const error = await authorizeError(
      authorizeParams({ client_id: clientId, redirect_uri: 'https://evil.com/cb' })
    )
    expect(error.redirectTo).toBeUndefined()
  })

  it('reports an unknown client as invalid_client, without redirecting', async () => {
    const error = await authorizeError(authorizeParams({ client_id: 'li2mcp_deadbeef' }))
    expect(error.error).toBe('invalid_client')
    expect(error.redirectTo).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
/**
 * The ONE documented exception to exact matching: the port of a loopback `http:` URI (RFC 8252 §7.3).
 *
 * ★ READ THE NEGATIVE CASES FIRST. A relaxation that is too wide passes every "accepts" test in this
 * block — that is exactly what makes it dangerous. The tests that can actually fail are the ones
 * asserting a REJECT, above all `does not leak into https`: if the port were dropped before the
 * scheme was checked, `https://x.com:8443/cb` would satisfy a registration for `https://x.com/cb`
 * and every hosted client's callback would become port-agnostic. That is the regression this block
 * exists to catch; the loopback acceptances are just the feature.
 */
describe('/authorize — loopback redirect_uri ignores the port, and NOTHING else', () => {
  /** Claude Code's real Client ID Metadata Document shape: both loopback hosts, no port, because the
   *  OS assigns the port at listen time (docs.claude.com, "Authentication for connectors"). */
  const CLAUDE_CODE_URIS = ['http://localhost/callback', 'http://127.0.0.1/callback']

  async function registerWith(redirectUris: string[]): Promise<string> {
    const registered = await service.registerClient({
      client_name: 'Claude Code',
      redirect_uris: redirectUris,
    })
    return registered.client_id
  }

  async function authorizeWith(clientId: string, redirectUri: string) {
    return service.validateAuthorizationRequest(
      authorizeParams({ client_id: clientId, redirect_uri: redirectUri })
    )
  }

  it.each([
    ['localhost on an ephemeral port', 'http://localhost:3118/callback'],
    ['127.0.0.1 on an ephemeral port', 'http://127.0.0.1:51000/callback'],
    // The bare registered strings must keep working — the relaxation is additive, not a replacement.
    ['the bare registered localhost URI', 'http://localhost/callback'],
    ['the bare registered 127.0.0.1 URI', 'http://127.0.0.1/callback'],
  ])('accepts %s', async (_label, candidate) => {
    const clientId = await registerWith(CLAUDE_CODE_URIS)
    const request = await authorizeWith(clientId, candidate)
    // The CONCRETE uri is carried forward, not the registered template: the code is bound to the
    // port the client is really listening on, and /token compares that string exactly (below).
    expect(request.redirectUri).toBe(candidate)
  })

  it.each([
    // ⚠ The whole point of keeping the path in the comparison. Without it, any local process could
    // collect the code at a path of its choosing on a port of its choosing.
    ['a different path on a loopback port', 'http://localhost:3118/evil'],
    ['a path prefix of the registered one', 'http://localhost:3118/call'],
    ['an added query parameter', 'http://localhost:3118/callback?next=https://evil.com'],
    // localhost and 127.0.0.1 resolve differently; a client that means both registers both.
    ['a loopback host that was not registered', 'http://[::1]:3118/callback'],
    ['a non-loopback host on a loopback-looking port', 'http://evil.local:3118/callback'],
    ['a host that merely contains "localhost"', 'http://localhost.evil.com:3118/callback'],
    // Dropping the port must never drag the scheme along with it.
    ['https against an http registration', 'https://localhost:8443/callback'],
    // Userinfo is refused rather than stripped — see `loopbackRedirectParts`.
    ['embedded userinfo', 'http://evil.com@localhost:3118/callback'],
  ])('rejects %s', async (_label, candidate) => {
    const clientId = await registerWith(CLAUDE_CODE_URIS)
    await expect(authorizeWith(clientId, candidate)).rejects.toBeInstanceOf(OAuthProtocolError)
  })

  it('rejects a loopback candidate when only one of the two loopback hosts is registered', async () => {
    // Registering `localhost` alone must NOT imply `127.0.0.1`. They are different origins to the
    // browser and to the hosts file, and treating them as aliases widens the match for free.
    const clientId = await registerWith(['http://localhost/callback'])
    await expect(
      authorizeWith(clientId, 'http://127.0.0.1:3118/callback')
    ).rejects.toBeInstanceOf(OAuthProtocolError)
  })

  it('⭐ does not leak into https: a port variant of a registered https URI is still refused', async () => {
    // THE test of this change. Every "accepts" case above passes under a matcher that strips the
    // port unconditionally; only this one fails. If it ever goes green while the assertion is
    // `rejects`, the relaxation escaped the loopback branch.
    const clientId = await registerWith(['https://x.com/cb'])
    await expect(authorizeWith(clientId, 'https://x.com:8443/cb')).rejects.toBeInstanceOf(
      OAuthProtocolError
    )

    // Negative control: the same client, same code path, with the exact registered string — proves
    // the rejection above is about the port and not about the fixture failing to register at all.
    const ok = await authorizeWith(clientId, 'https://x.com/cb')
    expect(ok.redirectUri).toBe('https://x.com/cb')
  })

  it('refuses to redirect when a loopback candidate does not match', async () => {
    // Unchanged property, re-asserted on the new branch: an unproven redirect_uri may not be used to
    // report the error, or the relaxation would have added an open redirector (RFC 6749 §4.1.2.1).
    const clientId = await registerWith(CLAUDE_CODE_URIS)
    const error = await authorizeError(
      authorizeParams({ client_id: clientId, redirect_uri: 'http://localhost:3118/evil' })
    )
    expect(error.redirectTo).toBeUndefined()
  })

  it('/token still demands the exact concrete URI the code was issued against', async () => {
    // The relaxation belongs to /authorize only. RFC 6749 §4.1.3 compares the token request's
    // redirect_uri to the one recorded with the code — a port-blind comparison HERE would let a
    // process listening on another port redeem a code minted for the real client.
    const { verifier, challenge } = pkcePair()
    const clientId = await registerWith(CLAUDE_CODE_URIS)
    const issued = 'http://localhost:3118/callback'

    const first = await service.validateAuthorizationRequest(
      authorizeParams({ client_id: clientId, redirect_uri: issued, code_challenge: challenge })
    )
    const { code: stolen } = await service.issueAuthorizationCode(first, USER_ID, ['read'])
    await expect(
      service.exchangeAuthorizationCode({
        code: stolen,
        clientId,
        redirectUri: 'http://localhost:9999/callback',
        codeVerifier: verifier,
      })
    ).rejects.toBeInstanceOf(OAuthProtocolError)

    // Negative control on a FRESH code — the claim above is atomic and burns the code, so reusing it
    // here would prove nothing. Same client, same verifier, only the port differs.
    const second = await service.validateAuthorizationRequest(
      authorizeParams({ client_id: clientId, redirect_uri: issued, code_challenge: challenge })
    )
    const { code } = await service.issueAuthorizationCode(second, USER_ID, ['read'])
    const tokens = await service.exchangeAuthorizationCode({
      code,
      clientId,
      redirectUri: issued,
      codeVerifier: verifier,
    })
    expect(tokens.access_token).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('/authorize — PKCE is mandatory and S256-only', () => {
  let clientId: string

  beforeEach(async () => {
    const registered = await service.registerClient({ redirect_uris: [REDIRECT_URI] })
    clientId = registered.client_id
  })

  it('rejects code_challenge_method=plain', async () => {
    // `plain` puts the verifier in the authorize URL, where browser history and proxy logs can read
    // it — the exact attack PKCE exists to stop.
    const error = await authorizeError(
      authorizeParams({ client_id: clientId, code_challenge_method: 'plain' })
    )
    expect(error.error).toBe('invalid_request')
    expect(error.description).toContain('plain')
  })

  it('rejects an ABSENT code_challenge_method rather than defaulting to plain', async () => {
    // RFC 7636 §4.3 says the default is `plain`. That default is the bug; we refuse instead.
    await expect(
      service.validateAuthorizationRequest(
        authorizeParams({ client_id: clientId, code_challenge_method: null })
      )
    ).rejects.toBeInstanceOf(OAuthProtocolError)
  })

  it('rejects a missing code_challenge', async () => {
    await expect(
      service.validateAuthorizationRequest(
        authorizeParams({ client_id: clientId, code_challenge: null })
      )
    ).rejects.toBeInstanceOf(OAuthProtocolError)
  })

  it('carries state and RFC 9207 iss on a redirectable error', async () => {
    const error = await authorizeError(
      authorizeParams({ client_id: clientId, response_type: 'token', state: 'abc123' })
    )
    const url = new URL(error.redirectTo!)
    expect(url.searchParams.get('error')).toBe('unsupported_response_type')
    expect(url.searchParams.get('state')).toBe('abc123')
    expect(url.searchParams.get('iss')).toBe(ISSUER)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('/authorize — scopes and the RFC 8707 resource parameter', () => {
  let clientId: string

  beforeEach(async () => {
    const registered = await service.registerClient({ redirect_uris: [REDIRECT_URI] })
    clientId = registered.client_id
  })

  it('accepts `resource` and does not refuse the request for carrying it', async () => {
    // Plan §5: MCP clients send it; ignoring the value is fine, rejecting the request is not.
    const request = await service.validateAuthorizationRequest(
      authorizeParams({ client_id: clientId, resource: 'https://app.li2.test/api/mcp' })
    )
    expect(request.resource).toBe('https://app.li2.test/api/mcp')
  })

  it('drops unknown scopes instead of failing, and falls back to read', async () => {
    // Claude Desktop really did ask for `openid profile email` (spike finding 8).
    const request = await service.validateAuthorizationRequest(
      authorizeParams({ client_id: clientId, scope: 'openid profile email' })
    )
    expect(request.requestedScopes).toEqual(['read'])
  })

  it('keeps write when it was explicitly requested', async () => {
    const request = await service.validateAuthorizationRequest(
      authorizeParams({ client_id: clientId, scope: 'read write' })
    )
    expect(request.requestedScopes).toEqual(['read', 'write'])
  })

  it('refuses to let consent grant a scope the client never asked for', async () => {
    // Plan §4: write is opt-in on the consent screen, but consent may only NARROW the request.
    const request = await service.validateAuthorizationRequest(
      authorizeParams({ client_id: clientId, scope: 'read' })
    )
    await expect(service.issueAuthorizationCode(request, USER_ID, ['write'])).rejects.toMatchObject({
      error: 'invalid_scope',
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('issueAuthorizationCode — what lands in the redirect and in the table', () => {
  it('returns code + state + iss, and stores only a hash', async () => {
    const { challenge } = pkcePair()
    const { code, request } = await grantCode({ challenge })

    const url = new URL(
      (await service.issueAuthorizationCode(request, USER_ID, ['read'])).redirectTo
    )
    expect(url.origin + url.pathname).toBe(REDIRECT_URI)
    expect(url.searchParams.get('code')).toBeTruthy()
    expect(url.searchParams.get('state')).toBe('xyz')
    expect(url.searchParams.get('iss')).toBe(ISSUER)

    // The raw code exists only in the redirect; the table holds its digest.
    const stored = [...repo.codes.values()]
    expect(stored.some((row) => row.code_hash === code)).toBe(false)
    expect(repo.codes.has(createHash('sha256').update(code, 'utf8').digest('hex'))).toBe(true)
  })

  it('marks a registered client as granted, keeping it out of the 24h sweep', async () => {
    const { clientId } = await grantCode({ challenge: 'X' })
    expect(repo.clients.get(clientId)!.last_granted_at).not.toBeNull()
  })

  it('expires the code in 60 seconds', async () => {
    await grantCode({ challenge: 'X' })
    const row = [...repo.codes.values()][0]
    const ttlMs = new Date(row.expires_at).getTime() - new Date(row.created_at).getTime()
    expect(ttlMs).toBeGreaterThan(55_000)
    expect(ttlMs).toBeLessThanOrEqual(60_000)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('/token — the authorization code is single-use and atomically claimed', () => {
  it('exchanges a valid code exactly once', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })

    const tokens = await service.exchangeAuthorizationCode({
      code,
      clientId,
      redirectUri: REDIRECT_URI,
      codeVerifier: verifier,
    })
    expect(tokens.token_type).toBe('Bearer')
    expect(tokens.expires_in).toBe(ACCESS_TOKEN_TTL_SECONDS)
    expect(tokens.access_token).toMatch(/^li2mcp_at_/)
    expect(tokens.refresh_token).toMatch(/^li2mcp_rt_/)
    expect(tokens.scope).toBe('read')
  })

  it('rejects the SECOND use of the same code', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })
    const input = { code, clientId, redirectUri: REDIRECT_URI, codeVerifier: verifier }

    await service.exchangeAuthorizationCode(input)
    await expect(service.exchangeAuthorizationCode(input)).rejects.toMatchObject({
      error: 'invalid_grant',
    })
  })

  it('lets exactly ONE of two concurrent exchanges win', async () => {
    // The atomicity test. `claimCodeAtomically` is a single DELETE…RETURNING; the fake repository
    // reproduces the row lock by mutating before its first await (see the mock's header). A
    // read-then-delete implementation would let BOTH of these succeed.
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })
    const input = { code, clientId, redirectUri: REDIRECT_URI, codeVerifier: verifier }

    const results = await Promise.allSettled([
      service.exchangeAuthorizationCode(input),
      service.exchangeAuthorizationCode(input),
    ])

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    expect(repo.tokens).toHaveLength(1)
  })

  it('BURNS the code even when the exchange fails', async () => {
    // RFC 6749 §4.1.2: a code that took part in a failed exchange may have been intercepted, so a
    // retry must not work. This is why the claim happens before any validation.
    const { challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })
    const { verifier: wrongVerifier } = pkcePair()

    await expect(
      service.exchangeAuthorizationCode({
        code,
        clientId,
        redirectUri: REDIRECT_URI,
        codeVerifier: wrongVerifier,
      })
    ).rejects.toMatchObject({ error: 'invalid_grant' })

    expect(repo.codes.size).toBe(0)
  })

  it('rejects a wrong code_verifier', async () => {
    const { challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })
    await expect(
      service.exchangeAuthorizationCode({
        code,
        clientId,
        redirectUri: REDIRECT_URI,
        codeVerifier: pkcePair().verifier,
      })
    ).rejects.toMatchObject({ error: 'invalid_grant' })
  })

  it('rejects a verifier that is too short to carry the required entropy', async () => {
    // RFC 7636 §4.1 sets 43-128 characters. A short verifier is brute-forceable.
    const short = 'abc'
    const challenge = createHash('sha256').update(short, 'ascii').digest('base64url')
    const { clientId, code } = await grantCode({ challenge })
    await expect(
      service.exchangeAuthorizationCode({
        code,
        clientId,
        redirectUri: REDIRECT_URI,
        codeVerifier: short,
      })
    ).rejects.toMatchObject({ error: 'invalid_grant' })
  })

  it('rejects a code presented by a different client', async () => {
    const { verifier, challenge } = pkcePair()
    const { code } = await grantCode({ challenge })
    const other = await service.registerClient({ redirect_uris: [REDIRECT_URI] })

    await expect(
      service.exchangeAuthorizationCode({
        code,
        clientId: other.client_id,
        redirectUri: REDIRECT_URI,
        codeVerifier: verifier,
      })
    ).rejects.toMatchObject({ error: 'invalid_grant' })
  })

  it('rejects a redirect_uri that differs from the one used at /authorize', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })
    await expect(
      service.exchangeAuthorizationCode({
        code,
        clientId,
        redirectUri: `${REDIRECT_URI}/`,
        codeVerifier: verifier,
      })
    ).rejects.toMatchObject({ error: 'invalid_grant' })
  })

  it('rejects an expired code', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })
    const row = [...repo.codes.values()][0]
    row.expires_at = new Date(Date.now() - 1000).toISOString()

    await expect(
      service.exchangeAuthorizationCode({ code, clientId, redirectUri: REDIRECT_URI, codeVerifier: verifier })
    ).rejects.toMatchObject({ error: 'invalid_grant' })
  })

  it('answers every one of those failures with a BYTE-IDENTICAL error', async () => {
    // The anti-oracle property. Distinguishable messages would tell an attacker whether a guessed
    // code was once real, or confirm that a client_id exists.
    const messages = new Set<string>()
    const collect = async (fn: () => Promise<unknown>) => {
      const error = (await fn().catch((e) => e)) as OAuthProtocolError
      messages.add(`${error.error}|${error.description}|${error.status}`)
    }

    const a = await grantCode({ challenge: pkcePair().challenge })
    await collect(() =>
      service.exchangeAuthorizationCode({
        code: a.code,
        clientId: a.clientId,
        redirectUri: REDIRECT_URI,
        codeVerifier: pkcePair().verifier, // wrong verifier
      })
    )
    await collect(() =>
      service.exchangeAuthorizationCode({
        code: 'li2mcp_code_never_existed',
        clientId: a.clientId,
        redirectUri: REDIRECT_URI,
        codeVerifier: pkcePair().verifier, // unknown code
      })
    )
    const b = await grantCode({ challenge: pkcePair().challenge })
    ;[...repo.codes.values()].forEach((row) => {
      row.expires_at = new Date(Date.now() - 1000).toISOString()
    })
    await collect(() =>
      service.exchangeAuthorizationCode({
        code: b.code,
        clientId: b.clientId,
        redirectUri: REDIRECT_URI,
        codeVerifier: pkcePair().verifier, // expired
      })
    )
    await collect(() =>
      service.refreshAccessToken({
        refreshToken: 'li2mcp_rt_nonsense',
        clientId: a.clientId,
        requestedScope: null,
      })
    )

    expect(messages.size).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('/token — refresh rotation', () => {
  async function connectedClient(scopes: ('read' | 'write')[] = ['read']) {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge, scopes })
    const tokens = await service.exchangeAuthorizationCode({
      code,
      clientId,
      redirectUri: REDIRECT_URI,
      codeVerifier: verifier,
    })
    return { clientId, tokens }
  }

  it('issues a new pair and gives the refresh token a 30-day life', async () => {
    const { clientId, tokens } = await connectedClient()
    const rotated = await service.refreshAccessToken({
      refreshToken: tokens.refresh_token,
      clientId,
      requestedScope: null,
    })

    expect(rotated.access_token).not.toBe(tokens.access_token)
    expect(rotated.refresh_token).not.toBe(tokens.refresh_token)

    const row = repo.tokens.at(-1)!
    const lifeMs = new Date(row.refresh_expires_at!).getTime() - new Date(row.created_at).getTime()
    expect(Math.round(lifeMs / 1000)).toBeCloseTo(REFRESH_TOKEN_TTL_SECONDS, -1)
  })

  it('kills the OLD refresh token the moment it is used', async () => {
    const { clientId, tokens } = await connectedClient()
    await service.refreshAccessToken({
      refreshToken: tokens.refresh_token,
      clientId,
      requestedScope: null,
    })

    await expect(
      service.refreshAccessToken({ refreshToken: tokens.refresh_token, clientId, requestedScope: null })
    ).rejects.toMatchObject({ error: 'invalid_grant' })
  })

  it('kills the old ACCESS token too — the pair dies together', async () => {
    const { clientId, tokens } = await connectedClient()
    expect(await service.validateAccessToken(tokens.access_token)).not.toBeNull()

    await service.refreshAccessToken({
      refreshToken: tokens.refresh_token,
      clientId,
      requestedScope: null,
    })
    expect(await service.validateAccessToken(tokens.access_token)).toBeNull()
  })

  it('revokes the WHOLE chain when an already-rotated refresh token is replayed', async () => {
    // RFC 9700 §4.14.2. Two parties hold the token and we cannot tell owner from thief, so both
    // lose it. The accepted cost: a client that retries after a dropped response is disconnected.
    const { clientId, tokens } = await connectedClient()
    const second = await service.refreshAccessToken({
      refreshToken: tokens.refresh_token,
      clientId,
      requestedScope: null,
    })

    await expect(
      service.refreshAccessToken({ refreshToken: tokens.refresh_token, clientId, requestedScope: null })
    ).rejects.toMatchObject({ error: 'invalid_grant' })

    // The currently-valid generation went down with it.
    expect(await service.validateAccessToken(second.access_token)).toBeNull()
    expect(repo.tokens.every((t) => t.revoked_at !== null)).toBe(true)
  })

  it('does NOT let a wrong client_id revoke someone else’s grant', async () => {
    // The read-then-check ordering exists for this: claiming first would turn a stolen refresh token
    // into a free denial of service against the real owner.
    const { tokens } = await connectedClient()
    await expect(
      service.refreshAccessToken({
        refreshToken: tokens.refresh_token,
        clientId: 'li2mcp_someone_else',
        requestedScope: null,
      })
    ).rejects.toMatchObject({ error: 'invalid_grant' })

    expect(repo.tokens.every((t) => t.revoked_at === null)).toBe(true)
    expect(await service.validateAccessToken(tokens.access_token)).not.toBeNull()
  })

  it('lets a refresh NARROW the scope but never widen it', async () => {
    const { clientId, tokens } = await connectedClient(['read', 'write'])

    const narrowed = await service.refreshAccessToken({
      refreshToken: tokens.refresh_token,
      clientId,
      requestedScope: 'read',
    })
    expect(narrowed.scope).toBe('read')

    const widened = await service.refreshAccessToken({
      refreshToken: narrowed.refresh_token,
      clientId,
      requestedScope: 'read write',
    })
    expect(widened.scope).toBe('read') // the grant is `read` now; asking for write changes nothing
  })

  it('rejects an expired refresh token', async () => {
    const { clientId, tokens } = await connectedClient()
    repo.tokens[0].refresh_expires_at = new Date(Date.now() - 1000).toISOString()
    await expect(
      service.refreshAccessToken({ refreshToken: tokens.refresh_token, clientId, requestedScope: null })
    ).rejects.toMatchObject({ error: 'invalid_grant' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('/revoke — RFC 7009', () => {
  async function connected() {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })
    const tokens = await service.exchangeAuthorizationCode({
      code,
      clientId,
      redirectUri: REDIRECT_URI,
      codeVerifier: verifier,
    })
    return { clientId, tokens }
  }

  it('kills the grant when handed the access token', async () => {
    const { clientId, tokens } = await connected()
    await service.revokeToken({ token: tokens.access_token, clientId })
    expect(await service.validateAccessToken(tokens.access_token)).toBeNull()
  })

  it('kills the grant when handed the refresh token, including its access token', async () => {
    const { clientId, tokens } = await connected()
    await service.revokeToken({ token: tokens.refresh_token, clientId })
    expect(await service.validateAccessToken(tokens.access_token)).toBeNull()
  })

  it('revokes every generation of a rotated chain', async () => {
    const { clientId, tokens } = await connected()
    const second = await service.refreshAccessToken({
      refreshToken: tokens.refresh_token,
      clientId,
      requestedScope: null,
    })
    await service.revokeToken({ token: second.access_token, clientId })
    expect(repo.tokens.every((t) => t.revoked_at !== null)).toBe(true)
  })

  it('stays silent for an unknown token — it must not be an existence oracle', async () => {
    await expect(
      service.revokeToken({ token: 'li2mcp_at_never_existed', clientId: 'whoever' })
    ).resolves.toBeUndefined()
  })

  it('ignores a revocation aimed at another client’s grant', async () => {
    const { tokens } = await connected()
    await service.revokeToken({ token: tokens.access_token, clientId: 'li2mcp_someone_else' })
    expect(await service.validateAccessToken(tokens.access_token)).not.toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('validateAccessToken — the check Phase 4 will run on every MCP request', () => {
  it('returns the user, client and scopes, and nothing about the org', async () => {
    // Plan §4.1: the grant is user-level. An org_id anywhere in here would be the multi-org model
    // quietly collapsing back into one-org-per-grant.
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge, scopes: ['read', 'write'] })
    const tokens = await service.exchangeAuthorizationCode({
      code,
      clientId,
      redirectUri: REDIRECT_URI,
      codeVerifier: verifier,
    })

    const claims = await service.validateAccessToken(tokens.access_token)
    expect(claims).toMatchObject({ userId: USER_ID, clientId, scopes: ['read', 'write'] })
    expect(claims).not.toHaveProperty('orgId')
    expect(claims).not.toHaveProperty('org_id')
  })

  it('returns null for an expired access token', async () => {
    const { verifier, challenge } = pkcePair()
    const { clientId, code } = await grantCode({ challenge })
    const tokens = await service.exchangeAuthorizationCode({
      code,
      clientId,
      redirectUri: REDIRECT_URI,
      codeVerifier: verifier,
    })
    repo.tokens[0].expires_at = new Date(Date.now() - 1000).toISOString()
    expect(await service.validateAccessToken(tokens.access_token)).toBeNull()
  })

  it('returns null for a token that was never issued', async () => {
    expect(await service.validateAccessToken('li2mcp_at_nope')).toBeNull()
  })
})

// A compile-time assertion, not a runtime one: `McpAuthorizationRequest` must stay org-free so that
// nothing downstream can start caching an organization into the grant (plan §4.1).
const _orgFreeGrant: keyof McpAuthorizationRequest extends 'orgId' ? never : true = true
void _orgFreeGrant
