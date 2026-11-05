/**
 * ============================================================================
 * MCP OAuth 2.1 authorization server — HTTP surface (plan Phase 3a).
 * ============================================================================
 *
 *   POST /api/mcp/oauth/register    RFC 7591 Dynamic Client Registration (unauthenticated!)
 *   GET  /api/mcp/oauth/authorize   RFC 6749 §4.1.1 authorization request + PKCE
 *   POST /api/mcp/oauth/token       authorization_code and refresh_token grants
 *   POST /api/mcp/oauth/revoke      RFC 7009
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⛔ THIS FILE DELIBERATELY IGNORES TWO REPO-WIDE CONVENTIONS. BOTH EXCEPTIONS ARE LOAD-BEARING.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * 1. **No `APIResponse`, no `BaseError.toResponse()`.** Every other route in this app answers with
 *    `{data, message, success, i18nMessage}` or `{error: true, message}`. An OAuth client parses
 *    neither. It parses RFC 6749 §5.1/§5.2 exactly: a token response is a BARE
 *    `{"access_token": …, "token_type": "Bearer", "expires_in": …, "refresh_token": …}` and an
 *    error is a BARE `{"error": "invalid_grant", "error_description": "…"}` with one of a fixed set
 *    of codes. Wrapping either does not degrade gracefully — the client reports an unexplained
 *    parse failure, the user sees "couldn't connect", and nothing in our logs says why.
 *    If a future lint rule or refactor wants to "standardize" this file, the answer is no.
 *
 * 2. **No `withAuth`.** `/register`, `/token` and `/revoke` are called by machines that have no
 *    Casdoor session — that is the entire point of an authorization server. `/authorize` IS a
 *    browser navigation, but its authentication boundary is the `/mcp/consent` page (3b), which is
 *    a protected page and therefore already behind the app's Casdoor middleware. Note the root
 *    `middleware.ts` matcher excludes everything under `api`, so nothing here is session-gated by
 *    accident.
 *
 * All protocol decisions live in `mcp-oauth.service.ts`. This file only moves bytes: parse, call,
 * shape the response.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getIssuer,
  mcpOAuthService,
  OAuthProtocolError,
  verifyConsentToken,
  type ClientRegistrationRequest,
} from '@/core/services/mcp-oauth.service'
import { getSession } from '@/shared/lib/auth/session'
import { logger } from '@/infrastructure/logging/logger'

/** paseto-ts is not involved here, but node crypto, node dns and ioredis all are. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'mcp-oauth-route' })

type RouteContext = { params: { route: string[] } }

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Response shaping — bare RFC bodies, never the app envelope
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * `Cache-Control: no-store` + `Pragma: no-cache` are a MUST on the token endpoint (RFC 6749 §5.1)
 * and are applied to every response here: each one either carries a credential or describes what
 * happened to one, and none of it should survive in a proxy.
 */
function oauthJson(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'cache-control': 'no-store',
      pragma: 'no-cache',
      ...extraHeaders,
    },
  })
}

/**
 * CORS for the machine-to-machine endpoints only.
 *
 * `*` is safe here precisely because these three endpoints have no ambient authority: they read
 * nothing from cookies and everything from the request body, and the proof of possession is the
 * PKCE verifier the caller already holds. Browser-hosted MCP clients cannot reach a token endpoint
 * without this. `/authorize` is deliberately excluded — it is a top-level navigation that DOES
 * depend on the session cookie, and CORS has no business on it.
 */
const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

function oauthError(error: OAuthProtocolError, cors: boolean): Response {
  const headers: Record<string, string> = cors ? { ...CORS_HEADERS } : {}
  if (error.retryAfterSeconds) headers['retry-after'] = String(error.retryAfterSeconds)
  return oauthJson(error.toBody(), error.status, headers)
}

/**
 * Turn any thrown value into something a client can act on.
 *
 * An `OAuthProtocolError` carrying `redirectTo` MUST be reported by redirect rather than as a body —
 * the service only sets it once the client and its redirect_uri are both proven (RFC 6749 §4.1.2.1),
 * so by the time it is set, bouncing the user there is safe.
 */
function toErrorResponse(error: unknown, cors: boolean): Response {
  // `.is()`, not `instanceof` — this module and the service are separate webpack bundles at runtime
  // and each holds its own copy of the class. See `OAUTH_PROTOCOL_ERROR` in the service.
  if (OAuthProtocolError.is(error)) {
    // 303, not 302: this helper is reached from the POST handler too (a Stage-2 failure in the
    // consent re-validation throws a `redirectTo`-carrying error), and that redirect must not be
    // replayed as a POST to the client's redirect_uri.
    if (error.redirectTo) return redirectResponse(error.redirectTo, 303)
    return oauthError(error, cors)
  }
  // Anything else is our bug, and its message may describe internals. The client gets the RFC code
  // and nothing more; the detail stays in the log.
  log.error({ err: error }, '[mcp-oauth] unhandled error')
  return oauthJson(
    { error: 'server_error', error_description: 'The authorization server encountered an error.' },
    500,
    cors ? CORS_HEADERS : {}
  )
}

/**
 * `no-store`: the URL of an authorization response contains a code.
 *
 * ★ `status` IS REQUIRED ON PURPOSE — do not restore the `= 302` default. 303 is the status for
 * anything reachable from a POST: it is the one that tells the browser to re-issue as GET, whereas a
 * 302 after a POST is re-sent as a POST by some clients and would arrive at the third-party
 * `redirect_uri` as a cross-origin POST carrying an authorization code.
 *
 * That distinction used to live only in this comment while the parameter defaulted to 302, and the
 * default silently captured `toErrorResponse` — which the POST handler reaches too. Requiring the
 * caller to state it moves the decision out of prose and into the type, where it cannot be missed.
 */
function redirectResponse(location: string, status: 302 | 303): Response {
  return new NextResponse(null, {
    status,
    headers: { location, 'cache-control': 'no-store', pragma: 'no-cache' },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Request parsing
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * RFC 6749 §4.1.3 specifies `application/x-www-form-urlencoded` and that is what both real clients
 * send. JSON is accepted as well because it costs five lines and turns "some SDK posted JSON" from
 * a baffling `invalid_request` into a working exchange.
 */
async function readParams(request: NextRequest): Promise<URLSearchParams> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null)
    const params = new URLSearchParams()
    if (body && typeof body === 'object') {
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        if (typeof value === 'string') params.set(key, value)
      }
    }
    return params
  }
  return new URLSearchParams(await request.text())
}

/**
 * The IP the registration rate limit counts against.
 *
 * `cf-connecting-ip` is preferred because production sits behind Cloudflare (the app's own
 * middleware already reads `cf-ipcountry`), and unlike `x-forwarded-for` it cannot be extended by
 * the caller. The `x-forwarded-for` fallback keeps this working in dev and behind a plain proxy;
 * a caller who spoofs it only shifts which bucket they exhaust, and 'unknown' collapses everyone
 * without a header into one shared bucket, which is the correct fail-safe direction.
 */
function clientIp(request: NextRequest): string {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() ?? 'unknown'
}

function missingParam(name: string): OAuthProtocolError {
  // Naming a structurally missing parameter leaks nothing about any grant — unlike every semantic
  // failure, which collapses into one `invalid_grant` (see the service).
  return new OAuthProtocolError('invalid_request', `${name} is required.`)
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// GET — /authorize
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const segment = params.route.join('/')
  if (segment !== 'authorize') return notFound(false)

  try {
    const query = request.nextUrl.searchParams

    /**
     * ⚠️ MUST STAY ABOVE `validateAuthorizationRequest` — that call is what goes outbound.
     *
     * Client resolution is its FIRST step (the order is a security property, see the service), and
     * for a URL-shaped `client_id` resolution means a DNS lookup plus an HTTPS fetch to an address
     * this unauthenticated caller chose. Metering after the call would meter nothing.
     *
     * Only cache misses are charged, so this costs a real client one Redis read and nothing else.
     */
    const quota = await mcpOAuthService.consumeCimdFetchQuota(
      clientIp(request),
      query.get('client_id')
    )
    if (!quota.allowed) {
      return oauthError(
        new OAuthProtocolError(
          'temporarily_unavailable',
          'Too many client lookups from this address. Try again later.',
          { status: 429, retryAfterSeconds: quota.retryAfter }
        ),
        false
      )
    }

    // Validates client → redirect_uri → response_type → PKCE, in that order and for that reason
    // (see `validateAuthorizationRequest`). Anything wrong throws; nothing is issued here.
    await mcpOAuthService.validateAuthorizationRequest(query)

    /**
     * Hand off to the consent screen (`src/app/(protected)/mcp/consent/page.tsx`), which
     * re-validates these same parameters and owns the read/write decision (plan §4).
     *
     * The whole query string is forwarded verbatim rather than repackaged into a server-side
     * "pending request" record: there is nothing secret in it, it keeps this route stateless, and it
     * means the consent page validates the SAME input the client actually sent.
     *
     * ⚠️ THE LOGGED-OUT PATH DEPENDS ON `casdoor/middleware.ts`. `/mcp/consent` must stay in its
     * `saveRedirectPath` list AND that branch must keep appending `request.nextUrl.search` —
     * `pathname` alone carries no query string, so dropping either silently returns the user from
     * login to a consent screen with no idea which client is asking. Both were broken before Phase
     * 3b; there is no test that catches a regression here, only a logged-out browser run.
     */
    /**
     * ★ `getIssuer()`, NOT `request.nextUrl.origin` — measured 2026-07-30, Phase 6 smoke.
     *
     * The consent screen MUST be served from the same origin as the published `issuer`: that is the
     * origin the browser will send as `Origin` to the consent POST below, and the origin the `iss`
     * parameter claims on the way back (RFC 9207). RFC 8414 §3.3 makes an issuer mismatch fatal and
     * clients reject the code without explaining why.
     *
     * `nextUrl.origin` cannot be trusted to be that value. Behind a proxy the dev server resolved it
     * to its own listen address (`https://localhost:3000`) even with `Host` AND `X-Forwarded-Host`
     * both set correctly — it took the scheme from `X-Forwarded-Proto` and the host from neither.
     * Claude Desktop followed that redirect off the tunnel and the flow died there.
     */
    const consentUrl = new URL('/mcp/consent', getIssuer())
    consentUrl.search = query.toString()
    // 302 stated explicitly to preserve exactly what Phase 6 measured on this GET→GET hop.
    return redirectResponse(consentUrl.toString(), 302)
  } catch (error) {
    return toErrorResponse(error, false)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// POST — /register, /token, /revoke
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const segment = params.route.join('/')
  /**
   * `consent` is the odd one out: it is a browser form submission carrying the session cookie, not a
   * machine-to-machine call. It gets no `Access-Control-Allow-Origin: *` — the reasoning that makes
   * `*` safe on the other three (no ambient authority, PKCE as the proof of possession) is exactly
   * what does not hold here.
   */
  const cors = segment !== 'consent'
  try {
    switch (segment) {
      case 'register':
        return await handleRegister(request)
      case 'token':
        return await handleToken(request)
      case 'revoke':
        return await handleRevoke(request)
      case 'consent':
        return await handleConsent(request)
      default:
        return notFound(true)
    }
  } catch (error) {
    return toErrorResponse(error, cors)
  }
}

export async function OPTIONS(_request: NextRequest, { params }: RouteContext): Promise<Response> {
  const segment = params.route.join('/')
  if (segment === 'authorize') return new NextResponse(null, { status: 405, headers: { allow: 'GET' } })
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

async function handleRegister(request: NextRequest): Promise<Response> {
  /**
   * ⚠️ The rate limit runs BEFORE the body is even parsed. This is the one endpoint in the app that
   * writes a row for an anonymous caller, so the cheapest possible rejection is the right one — and
   * `consumeRegistrationQuota` fails CLOSED if Redis is unreachable, unlike the app's usual
   * `withRateLimit`. See its comment for why the difference is deliberate.
   */
  const quota = await mcpOAuthService.consumeRegistrationQuota(clientIp(request))
  if (!quota.allowed) {
    return oauthError(
      new OAuthProtocolError(
        'temporarily_unavailable',
        'Too many client registrations from this address. Try again later.',
        { status: 429, retryAfterSeconds: quota.retryAfter }
      ),
      true
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return oauthError(
      new OAuthProtocolError('invalid_client_metadata', 'A JSON registration body is required.'),
      true
    )
  }

  const registered = await mcpOAuthService.registerClient(body as ClientRegistrationRequest)
  // RFC 7591 §3.2.1: 201 Created. No `client_secret` — these are public clients (see the service).
  return oauthJson(registered, 201, CORS_HEADERS)
}

async function handleToken(request: NextRequest): Promise<Response> {
  const params = await readParams(request)
  const grantType = params.get('grant_type')

  // Public clients (`token_endpoint_auth_method: none`) still identify themselves; the service binds
  // this against the client_id stored with the code or refresh token, and never looks the client up.
  const clientId = params.get('client_id')
  if (!clientId) throw missingParam('client_id')

  if (grantType === 'authorization_code') {
    const code = params.get('code')
    const redirectUri = params.get('redirect_uri')
    const codeVerifier = params.get('code_verifier')
    if (!code) throw missingParam('code')
    if (!redirectUri) throw missingParam('redirect_uri')
    // PKCE is mandatory, so a missing verifier is a malformed request rather than a failed proof.
    if (!codeVerifier) throw missingParam('code_verifier')

    const tokens = await mcpOAuthService.exchangeAuthorizationCode({
      code,
      clientId,
      redirectUri,
      codeVerifier,
    })
    return oauthJson(tokens, 200, CORS_HEADERS)
  }

  if (grantType === 'refresh_token') {
    const refreshToken = params.get('refresh_token')
    if (!refreshToken) throw missingParam('refresh_token')

    const tokens = await mcpOAuthService.refreshAccessToken({
      refreshToken,
      clientId,
      requestedScope: params.get('scope'),
    })
    return oauthJson(tokens, 200, CORS_HEADERS)
  }

  // RFC 8707 `resource` is read by neither branch — accepted and ignored, which plan §5 requires:
  // MCP clients send it, and refusing a request for carrying it would break every one of them.
  return oauthError(
    new OAuthProtocolError(
      'unsupported_grant_type',
      'Supported grant types are authorization_code and refresh_token.'
    ),
    true
  )
}

async function handleRevoke(request: NextRequest): Promise<Response> {
  const params = await readParams(request)
  const token = params.get('token')
  if (!token) throw missingParam('token')

  await mcpOAuthService.revokeToken({ token, clientId: params.get('client_id') })

  /**
   * RFC 7009 §2.2: 200 for a successful revocation AND for an invalid token, with no body. The
   * indistinguishability is the point — otherwise this endpoint becomes a free oracle for testing
   * whether a token string is real.
   */
  return new NextResponse(null, {
    status: 200,
    headers: { 'cache-control': 'no-store', pragma: 'no-cache', ...CORS_HEADERS },
  })
}

/**
 * The consent decision — the only caller of `issueAuthorizationCode`.
 *
 * Everything the form posted is treated as untrusted and re-validated. The signed `consent_token` is
 * what makes that safe to act on: it proves this exact user was shown this exact request (client,
 * redirect_uri, PKCE challenge and requested scopes) within the last ten minutes. Without it, an
 * attacker could register their own client, generate their own PKCE pair, and get a victim's browser
 * to post a consent they never saw — and since the attacker holds the verifier, the resulting code
 * is a complete grant on the victim's account.
 */
async function handleConsent(request: NextRequest): Promise<Response> {
  const form = await readParams(request)

  /**
   * Defence in depth, deliberately NOT the primary control — the signed `consent_token` below is,
   * because it is bound to the user and to the exact request and an attacker cannot obtain one.
   *
   * ⚠️ A PRESENT origin must match; an ABSENT one is allowed through to the token check. Requiring
   * it looks stricter and is actually just fragile: `Origin` on a form POST is browser- and
   * referrer-policy-dependent, and the first version of this endpoint rejected every legitimate
   * submission because the page's own `Referrer-Policy: no-referrer` made browsers send
   * `Origin: null` (verified live 2026-07-29). Anything that skips the origin still has to produce a
   * valid token, so this branch only ever catches the cheap cross-site attempts early.
   *
   * ⚠️ KNOWN GAP (measured 2026-07-30, Phase 6): "absent" means the header is genuinely missing.
   * A literal `Origin: null` arrives as the STRING "null", which is not JS `null`, so it is treated
   * as present-and-mismatched and rejected — i.e. the referrer-policy case described above is not
   * actually covered by this branch. Left as-is deliberately rather than fixed mid-smoke.
   *
   * ★ Compared against `getIssuer()`, not `request.nextUrl.origin`: the consent page is served from
   * the issuer origin (see `/authorize` above), so the issuer is what a legitimate browser sends
   * here. `nextUrl.origin` resolved to the dev server's own listen address behind a proxy, which
   * would reject every genuine submission.
   */
  const origin = request.headers.get('origin')
  if (origin !== null && origin !== getIssuer()) {
    log.warn({ origin }, '[mcp-oauth] consent rejected: cross-origin form post')
    throw new OAuthProtocolError('invalid_request', 'This request did not come from Li2.')
  }

  const session = await getSession(request)
  if (!session) {
    /**
     * The session expired while the screen was open. Send them back through login with the request
     * intact rather than failing — `saveRedirectPath` covers `/mcp/consent`.
     *
     * Only the authorization request travels: the consent token is bound to a session that no longer
     * exists and the decision fields belong to a form that is about to be re-rendered, so echoing
     * either would put dead credentials in a URL that crosses Casdoor and lands in browser history.
     */
    const retry = new URLSearchParams(form)
    for (const key of ['consent_token', 'decision', 'grant_write']) retry.delete(key)
    // Same reason as the consent redirect: the login round-trip must land back on the issuer origin.
    const login = new URL('/auth/login', getIssuer())
    login.searchParams.set('redirect_to', `/mcp/consent?${retry.toString()}`)
    return redirectResponse(login.toString(), 303)
  }

  // Re-validated from the POST body, exactly as the page re-validated it from the query string.
  const authorizationRequest = await mcpOAuthService.validateAuthorizationRequest(form)

  const consentToken = form.get('consent_token') ?? ''
  if (!verifyConsentToken(consentToken, session.id, authorizationRequest)) {
    log.warn(
      { clientId: authorizationRequest.client.clientId, userId: session.id },
      '[mcp-oauth] consent rejected: token missing, expired, or bound to a different request'
    )
    throw new OAuthProtocolError(
      'access_denied',
      'This consent form has expired or was altered. Start the connection again.'
    )
  }

  /**
   * `read` is granted whenever it was asked for; `write` unless the user UNTICKED it, since that box
   * ships pre-ticked (`mcp/consent/page.tsx`). Framing it as a filter over `requestedScopes` rather
   * than a list built from scratch is what keeps consent NARROWING-only — there is no path here that
   * adds a scope the client did not request.
   */
  const grantWrite = form.get('grant_write') !== null
  const grantedScopes = authorizationRequest.requestedScopes.filter(
    (scope) => scope === 'read' || grantWrite
  )

  /**
   * Anything that is not an explicit "allow" is a denial, including a malformed `decision`. An empty
   * grant is one too: a client can legitimately request `scope=write` alone, and leaving the box
   * unticked on that request means "no" — not an `invalid_scope` error about a form the user filled
   * in correctly. RFC 6749 §4.1.2.1 tells the client either way, so it stops waiting.
   */
  if (form.get('decision') !== 'allow' || grantedScopes.length === 0) {
    return redirectResponse(mcpOAuthService.buildConsentDenialRedirect(authorizationRequest), 303)
  }

  const { redirectTo } = await mcpOAuthService.issueAuthorizationCode(
    authorizationRequest,
    session.id,
    grantedScopes
  )
  return redirectResponse(redirectTo, 303)
}

function notFound(cors: boolean): Response {
  return oauthJson(
    { error: 'invalid_request', error_description: 'Unknown authorization server endpoint.' },
    404,
    cors ? CORS_HEADERS : {}
  )
}
