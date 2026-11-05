/**
 * ============================================================================
 * MCP OAuth 2.1 authorization server — protocol logic (plan Phase 3a).
 * ============================================================================
 *
 * li2-app is the authorization server for the MCP surface, not Casdoor. Casdoor stays the identity
 * provider — this server never sees a password — but it cannot issue the token MCP needs: the
 * deployed instance has no Dynamic Client Registration, its `claims_supported` is a closed list of
 * user-profile fields with no notion of a Li2 organization, and there is nowhere in its flow to put
 * the read/write consent decision (plan §5, shapes (A) and (C), both rejected against the live
 * instance on 2026-07-28).
 *
 * ─── WHY THIS FILE BREAKS THE REPO'S RESPONSE CONVENTIONS ──────────────────────────────────────
 * Nothing here throws `BaseError` and nothing returns `APIResponse`. Those produce li2-app's own
 * envelope (`{data, message, success, i18nMessage}` / `{error: true, message}`), and an OAuth client
 * parses neither. It parses RFC 6749 §5.2: a BARE `{"error": "...", "error_description": "..."}`
 * with one of a fixed set of codes. Wrapping it does not degrade gracefully — the client reports an
 * opaque parse failure and the user sees "couldn't connect" with nothing to debug.
 * `OAuthProtocolError` below therefore extends plain `Error` and carries its own wire shape.
 *
 * ─── WHERE CONSENT LIVES ──────────────────────────────────────────────────────────────────────
 * `validateAuthorizationRequest` validates a full authorize request and stops — it does NOT decide
 * consent. That decision belongs to `/mcp/consent` (Phase 3b), whose CSRF-protected POST at
 * `/api/mcp/oauth/consent` is the ONLY caller of `issueAuthorizationCode`. The two root
 * `.well-known` documents that let a client discover this server are also 3b.
 */
import 'server-only'
import { randomBytes, randomUUID, createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import {
  mcpOAuthRepo,
  McpOAuthRepository,
  type McpOAuthTokenRow,
} from '@/core/repositories/mcp-oauth.repository'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { logger } from '@/infrastructure/logging/logger'
import { BaseService } from './base.service'

const log = logger.child({ module: 'mcp-oauth-service' })

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Protocol constants
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Short by design: a code is a bearer credential travelling through a browser redirect and a URL
 *  bar, and RFC 6749 §4.1.2 puts its maximum useful lifetime at ~10 minutes. 60s is enough for a
 *  redirect plus one token call and leaves almost no window to steal it out of a log. */
export const AUTHORIZATION_CODE_TTL_SECONDS = 60

/** Access token 1h, refresh 30d with rotation (plan Phase 3a checklist). */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60

/**
 * ★ THE PREFIXES ARE A CONTRACT, NOT DECORATION — hoisted here in Phase 5 so `/api/mcp` can reject a
 * wrong-prefix bearer BEFORE spending a database round trip on it (the debt 4a left because doing it
 * then meant editing a third file).
 *
 * ⚠️ The early rejection is only safe while `issueTokenPair` below is the ONLY place an access token
 * is ever created — it is (one private method, two callers: code exchange and refresh), and every
 * token it has ever produced carries `ACCESS_TOKEN_PREFIX`. If a second issue site ever appears it
 * MUST use these constants, or `/api/mcp` will 401 a perfectly valid token and the symptom will be a
 * client that mysteriously cannot connect while the database says its grant is fine.
 *
 * They also make a leaked value greppable, and let `/revoke` tell an access token from a refresh
 * token without asking Postgres.
 */
export const ACCESS_TOKEN_PREFIX = 'li2mcp_at_'
export const REFRESH_TOKEN_PREFIX = 'li2mcp_rt_'

/** The only two scopes this server knows. `write` is decided on the consent screen, where the box
 *  ships PRE-TICKED (Kei, 2026-07-30 — this reverses plan §4's original opt-in; the full rationale
 *  and the trade-off accepted with it are in `app/(protected)/mcp/consent/page.tsx`). That makes the
 *  tick the only human gate that exists: unlike the chat panel there is no per-action approval card
 *  in front of an MCP write, so a box left alone grants write across every org the user belongs to
 *  for the life of the grant. */
export const MCP_SCOPES = ['read', 'write'] as const
export type McpScope = (typeof MCP_SCOPES)[number]

/** RFC 7636 §4.1. `plain` is not in this list and never will be — see `validateAuthorizationRequest`. */
export const CODE_CHALLENGE_METHOD = 'S256'

/** Public clients only: MCP clients run on a user's desktop, so a client secret would not be
 *  secret. PKCE is the proof of possession instead. Both clients captured in the Phase 0.2 spike
 *  (Claude Desktop and MCP Inspector) register with exactly this value. */
const SUPPORTED_TOKEN_ENDPOINT_AUTH_METHOD = 'none'

const SUPPORTED_GRANT_TYPES = ['authorization_code', 'refresh_token'] as const
const SUPPORTED_RESPONSE_TYPES = ['code'] as const

/** Bounds on what /register will store. Generous enough for any real client, small enough that a
 *  spammer cannot use the table as free storage. */
const MAX_REDIRECT_URIS = 10
const MAX_REDIRECT_URI_LENGTH = 2048
const MAX_CLIENT_NAME_LENGTH = 128

/** IP-keyed sliding window on the UNAUTHENTICATED registration endpoint. */
const REGISTER_RATE_LIMIT = { maxRequests: 5, windowSeconds: 60 * 60 }

/**
 * IP-keyed sliding window on the OUTBOUND CIMD fetch that `/authorize` can trigger.
 *
 * ★ WHY THIS EXISTS AT ALL. `/authorize` is unauthenticated and resolves the client FIRST, so a
 * caller supplying `client_id=https://anything/...` makes this server perform a DNS lookup and an
 * HTTPS request to a URL of their choosing. Measured on the dev server 2026-07-31: 12 requests,
 * 12 outbound attempts, none refused, while `/register` next door cut off at exactly 5 — the
 * asymmetry was backwards, since the throttled endpoint was the cheap one.
 *
 * ⚠️ The negative cache is NOT a substitute. `CIMD_NEGATIVE_TTL_SECONDS` keys on the exact URL, and
 * varying a query parameter defeats it on every request — which is precisely how the measurement
 * above got 12 fetches out of it.
 *
 * The limit is deliberately generous because only cache MISSES are counted: a real client has one
 * stable `client_id`, so it pays once per cache lifetime, and a developer iterating on their own
 * document is bounded by the 60s negative TTL rather than by this.
 */
export const CIMD_FETCH_RATE_LIMIT = { maxRequests: 30, windowSeconds: 60 * 60 }

/**
 * ⚠️ A `try/catch` around Redis IS NOT A TIMEOUT — the whole rationale lives in the header of
 * `core/mcp/rate-limit.ts`, measured there as `200 in 60135ms`: ioredis buffers commands in an
 * offline queue when the server is unreachable, so the promise never settles and the request hangs
 * instead of failing.
 *
 * That module has its own copy of this bound and deliberately does not export it: `endpoint.test.ts`
 * mocks `@/core/mcp/rate-limit` with a FULL factory, so importing a new symbol from it would break
 * the mock rather than share the code. The duplication is two lines and a constant; the coupling
 * would be a broken test suite and a service that cannot be reasoned about without the tool layer.
 */
const REDIS_DEADLINE_MS = 250

// Client ID Metadata Documents (CIMD) — the SHOULD of spec 2025-11-25; DCR is only a MAY.
const CIMD_MAX_BYTES = 64 * 1024
const CIMD_TIMEOUT_MS = 3_000
const CIMD_DEFAULT_TTL_SECONDS = 300
const CIMD_MIN_TTL_SECONDS = 60
const CIMD_MAX_TTL_SECONDS = 24 * 60 * 60
/** Negative results are cached too, briefly: it stops a bad client_id from becoming a free outbound
 *  request generator, at the cost of a minute's delay for a client that fixes its document. */
const CIMD_NEGATIVE_TTL_SECONDS = 60

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Wire errors
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** RFC 6749 §4.1.2.1 / §5.2 plus the two registration-specific codes from RFC 7591 §3.2.2. */
export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'server_error'
  | 'temporarily_unavailable'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'

/**
 * ★ WHY THIS EXISTS INSTEAD OF `instanceof`. Next builds a SEPARATE webpack bundle per route, and
 * each one gets its own copy of this module — so `OAuthProtocolError` is several distinct class
 * objects at runtime, one per importing bundle. `instanceof` compares identity between them and
 * returns false.
 *
 * That is normally invisible, because a throw and its catch live in the same bundle. What makes it
 * bite here is the DEV-ONLY `globalThis._mcpOAuthService` cache at the bottom of this file: one
 * shared service instance is handed to every bundle, so the error is constructed by whichever
 * bundle loaded FIRST and checked by whichever bundle is handling the request. Proven live on
 * 2026-07-29 — the identical `/authorize` request answered `401 invalid_client` when the OAuth route
 * warmed first and `500 server_error` when `/.well-known/oauth-authorization-server` did.
 *
 * `Symbol.for` reads from the cross-realm global symbol registry, so every copy of this module
 * resolves the SAME symbol. The check is structural and cannot be broken by bundling, by the
 * singleton cache, or by a future importer.
 */
const OAUTH_PROTOCOL_ERROR = Symbol.for('li2.mcp.OAuthProtocolError')

/**
 * An error the CLIENT is meant to read, in the client's own format.
 *
 * ⚠️ Extends `Error`, NOT `BaseError` — see the file header. Do not "fix" this to match the rest of
 * the repo; `BaseError.toResponse()` emits li2-app's envelope and would break every OAuth client.
 *
 * ⚠️ Test it with `OAuthProtocolError.is(x)`, never `x instanceof OAuthProtocolError` — see above.
 * A unit test cannot catch the difference: vitest loads this module exactly once.
 */
export class OAuthProtocolError extends Error {
  readonly error: OAuthErrorCode
  readonly description: string
  readonly status: number
  /**
   * Set only once the client and its `redirect_uri` are both proven. RFC 6749 §4.1.2.1: an error
   * discovered BEFORE that point must be shown to the user directly, because reporting it by
   * redirect would mean bouncing the user to a URI an attacker supplied.
   */
  readonly redirectTo?: string
  /** RFC 7009 §2.2.1 sends `Retry-After` alongside a 429. */
  readonly retryAfterSeconds?: number

  constructor(
    error: OAuthErrorCode,
    description: string,
    options: { status?: number; redirectTo?: string; retryAfterSeconds?: number } = {}
  ) {
    super(`${error}: ${description}`)
    this.name = 'OAuthProtocolError'
    this.error = error
    this.description = description
    this.status = options.status ?? 400
    this.redirectTo = options.redirectTo
    this.retryAfterSeconds = options.retryAfterSeconds
    // Non-enumerable so it stays out of logs and `JSON.stringify`; defined here rather than as a
    // class field because a computed symbol key is not allowed in a class property declaration.
    Object.defineProperty(this, OAUTH_PROTOCOL_ERROR, { value: true, enumerable: false })
  }

  /** The bundle-proof replacement for `instanceof` — see `OAUTH_PROTOCOL_ERROR` above. */
  static is(value: unknown): value is OAuthProtocolError {
    return typeof value === 'object' && value !== null && OAUTH_PROTOCOL_ERROR in value
  }

  /** The exact JSON body an OAuth client expects. No envelope, no extra keys. */
  toBody(): { error: OAuthErrorCode; error_description: string } {
    return { error: this.error, error_description: this.description }
  }
}

/**
 * ★ THE ONE STRING EVERY GRANT FAILURE RETURNS.
 *
 * Wrong client, wrong redirect_uri, wrong PKCE verifier, expired code, replayed code, unknown
 * refresh token — all of them answer with this. Splitting them into honest, specific messages would
 * turn the token endpoint into an oracle: "expired" versus "unknown" tells an attacker their guessed
 * code was once real, and "wrong client" confirms a client_id exists. The server-side log keeps the
 * real reason; the client only ever learns that the grant did not work.
 */
function invalidGrant(): OAuthProtocolError {
  return new OAuthProtocolError(
    'invalid_grant',
    'The authorization grant is invalid, expired, or has already been used.'
  )
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Crypto helpers
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** 256 bits of entropy, URL-safe. Prefixes exist so a leaked value is greppable and so `/revoke`
 *  and the Phase 4 bearer check can tell the kinds apart without a database round trip. */
function generateSecret(prefix: string): string {
  return `${prefix}${randomBytes(32).toString('base64url')}`
}

/**
 * SHA-256 hex. Correct here precisely because it is fast: these inputs are 256-bit random values,
 * so there is no dictionary to attack and no work factor to buy, and a deterministic digest is what
 * makes O(1) lookup-by-hash possible. The same choice for a password would be a bug.
 */
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

/** Compare two strings without leaking where they diverge. Hashing first makes the inputs
 *  fixed-length, so `timingSafeEqual` cannot throw on a length mismatch — and length itself stops
 *  being a side channel. */
function constantTimeEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest()
  const hb = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(ha, hb)
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Consent CSRF (Phase 3b)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Long enough to read the screen, short enough that a token lifted from a shoulder-surfed page or a
 *  stale browser tab is worthless. A user who dawdles gets a clean "start again", not a silent grant. */
const CONSENT_TOKEN_TTL_SECONDS = 10 * 60

/**
 * Derived from the key the MCP surface already cannot run without, with domain separation, rather
 * than from a new env var. A dedicated secret would be one more thing to set correctly in production
 * and would fail as a 500 on the consent screen the first time somebody forgot — this cannot be
 * absent wherever Phase 4 can mint a PASETO at all. Rotating that key invalidates consent forms
 * opened in the preceding ten minutes, which is an acceptable trade for one fewer deploy-time knob.
 */
function consentSigningKey(): Buffer {
  const root = process.env.AGENT_PASETO_PRIVATE_KEY
  if (!root) {
    throw new OAuthProtocolError(
      'server_error',
      'The authorization server is not configured.',
      { status: 500 }
    )
  }
  return createHmac('sha256', root).update('li2:mcp:consent-csrf:v1').digest()
}

/**
 * ★ WHY THE CONSENT POST NEEDS THIS AT ALL, given the session cookie is `SameSite=Lax`.
 *
 * The attack this stops is not generic: an attacker registers their OWN client, generates their own
 * PKCE pair, and gets a victim's browser to POST consent for it. They already hold the verifier, so
 * a code delivered to their `redirect_uri` is a complete grant on the victim's account — no
 * interception required. `SameSite=Lax` does block a cross-site POST from carrying the session, but
 * it is a browser policy rather than a property of this endpoint, and it says nothing about a
 * same-site path that can be made to issue a request.
 *
 * So the token is bound to the user AND to the exact authorization request, not merely to the
 * session: a token minted for one client cannot approve another, and it cannot approve a different
 * `redirect_uri` or PKCE challenge for the same client either. It is signed rather than stored
 * because there is nothing here worth a round trip — the binding is the whole value.
 */
export function mintConsentToken(userId: string, request: McpAuthorizationRequest): string {
  const expiresAt = Math.floor(Date.now() / 1000) + CONSENT_TOKEN_TTL_SECONDS
  return `${expiresAt}.${consentSignature(expiresAt, userId, request)}`
}

export function verifyConsentToken(
  token: string,
  userId: string,
  request: McpAuthorizationRequest
): boolean {
  const separator = token.indexOf('.')
  if (separator <= 0) return false

  const expiresAt = Number(token.slice(0, separator))
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false

  return constantTimeEquals(
    token.slice(separator + 1),
    consentSignature(expiresAt, userId, request)
  )
}

/**
 * The fields are joined with `\n`, which cannot occur in any of them — a URL, a base64url challenge,
 * a UUID and a space-separated scope list are all newline-free. A separator that CAN appear in a
 * field lets two different tuples produce one signed string, and the whole binding evaporates.
 *
 * `requestedScopes` is in here so the POST cannot be replayed against a WIDER request than the one
 * the page rendered. Without it, a token minted for a client that asked only for `read` would also
 * validate a submission claiming `scope=read write`, and `issueAuthorizationCode`'s subset check —
 * which compares against whatever the POST claims was requested — would wave it through. The rule
 * that consent may only narrow what the client asked for has to be anchored to the original request,
 * not to the form.
 */
function consentSignature(
  expiresAt: number,
  userId: string,
  request: McpAuthorizationRequest
): string {
  return createHmac('sha256', consentSigningKey())
    .update(
      [
        expiresAt,
        userId,
        request.client.clientId,
        request.redirectUri,
        request.codeChallenge,
        request.requestedScopes.join(' '),
      ].join('\n')
    )
    .digest('base64url')
}

/**
 * PKCE S256 verification (RFC 7636 §4.6): `BASE64URL(SHA256(ASCII(code_verifier))) == code_challenge`.
 *
 * The verifier charset and length are checked first, per RFC 7636 §4.1. That is not decoration: a
 * client that gets this wrong is almost always one that would otherwise have fallen back to `plain`,
 * and the check keeps a low-entropy verifier from ever reaching the comparison.
 */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  if (codeVerifier.length < 43 || codeVerifier.length > 128) return false
  if (!/^[A-Za-z0-9\-._~]+$/.test(codeVerifier)) return false
  const computed = createHash('sha256').update(codeVerifier, 'ascii').digest('base64url')
  return constantTimeEquals(computed, codeChallenge)
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Issuer + redirect URI rules
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The `iss` value, and the base of every endpoint URL this server advertises.
 *
 * Phase 3b's two `.well-known` documents MUST report the same string — RFC 8414 §3.3 makes clients
 * reject a document whose `issuer` differs from where they fetched it, and the Phase 0.2 spike hit
 * exactly that (an https-less issuer made Claude Desktop abort before it ever POSTed /register).
 */
export function getIssuer(): string {
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL
  if (!base) {
    throw new OAuthProtocolError(
      'server_error',
      'The authorization server is not configured.',
      { status: 500 }
    )
  }
  return new URL(base).origin
}

/** WHATWG `URL.hostname` lower-cases names and keeps the brackets on an IPv6 literal, so these three
 *  strings are the complete set — see `loopbackRedirectParts`. */
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * What may appear in `redirect_uris` at registration.
 *
 * https only, with one exception: loopback http, which RFC 8252 §7.3 requires for native clients and
 * which MCP Inspector depends on (`http://localhost:6274/oauth/callback`). Claude Desktop's callback
 * is the fixed https URL `https://claude.ai/api/mcp/auth_callback`.
 *
 * Fragments are rejected because RFC 6749 §3.1.2 forbids them and because the authorization response
 * is appended as a query — a fragment in the registered value could only ever cause a silent
 * mismatch later.
 */
function isAcceptableRedirectUri(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_REDIRECT_URI_LENGTH) {
    return false
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.hash) return false
  if (url.username || url.password) return false
  if (url.protocol === 'https:') return true
  if (url.protocol === 'http:') return LOOPBACK_HOSTNAMES.has(url.hostname)
  return false
}

/**
 * Split a loopback `http:` redirect URI into the parts that must match, or `null` if it is not one.
 *
 * The `http:` test is what keeps the port relaxation below from leaking into https clients, and it
 * is deliberately the FIRST thing checked: `https://localhost:8443/cb` must be treated exactly like
 * any other https URI, not as a loopback.
 *
 * Userinfo and fragments return `null` rather than being stripped. Neither can appear in a
 * registered URI (`isAcceptableRedirectUri` refuses both), so a candidate carrying one is a
 * candidate trying to look like something it is not.
 */
function loopbackRedirectParts(
  value: string
): { hostname: string; pathname: string; search: string } | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'http:') return null
  if (!LOOPBACK_HOSTNAMES.has(url.hostname)) return null
  if (url.username || url.password || url.hash) return null
  return { hostname: url.hostname, pathname: url.pathname, search: url.search }
}

/** Does this client only ever come back to the user's own machine? Drives the consent-screen warning
 *  that is the human half of the port relaxation (plan §5 / MCP consent requirements). */
export function isLoopbackRedirectUri(value: string): boolean {
  return loopbackRedirectParts(value) !== null
}

/**
 * ★ EXACT STRING EQUALITY, with ONE exception: the port of a loopback `http:` URI.
 *
 * Every classic redirect_uri bypass lives in the "helpful" version of this function: a prefix match
 * lets `https://good.com/cb` accept `https://good.com/cb.evil.com`, and normalizing case or a
 * trailing slash re-opens the same door in smaller print. RFC 6749 §3.1.2.3 and the OAuth 2.1 draft
 * both say simple string comparison; https clients get exactly that and nothing else.
 *
 * The exception is forced by RFC 8252 §7.3, which requires a native client to bind an EPHEMERAL
 * loopback port and requires the AS to ignore it — the client cannot know the number at registration
 * time. Claude Code depends on it: it declares `http://localhost/callback` and
 * `http://127.0.0.1/callback` in its Client ID Metadata Document and then listens on whatever port
 * the OS handed it (`http://localhost:3118/callback`). Against a strict matcher every connection
 * attempt dies with "does not exactly match a registered redirect URI".
 *
 * What is still compared, and why each one matters:
 *   - **scheme** — an https registration can never be satisfied by an http candidate, or vice versa.
 *   - **hostname** — `localhost` and `127.0.0.1` are NOT interchangeable. They resolve differently
 *     (hosts file, IPv6 preference), and a client that means both registers both, as Claude Code does.
 *   - **path and query** — `http://localhost:3118/evil` against a registered `/callback` is still an
 *     open redirector on the user's own machine. This is the part a sloppy relaxation drops.
 *
 * ⚠️ The residual risk this accepts, in one sentence: any process on the user's machine can bind a
 * port and present itself as the registered client. That is inherent to RFC 8252 and unfixable at
 * this layer — the compensating control is the consent screen, which shows the redirect hostname and
 * warns explicitly when every registered URI is loopback.
 */
function redirectUriIsRegistered(registered: readonly string[], candidate: string): boolean {
  if (registered.some((uri) => uri === candidate)) return true

  const target = loopbackRedirectParts(candidate)
  if (!target) return false
  return registered.some((uri) => {
    const known = loopbackRedirectParts(uri)
    return (
      known !== null &&
      known.hostname === target.hostname &&
      known.pathname === target.pathname &&
      known.search === target.search
    )
  })
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SSRF-hardened CIMD fetching
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export interface ResolvedClient {
  clientId: string
  clientName: string
  redirectUris: string[]
  /** `registered` clients have a row in `mcp_oauth_clients`; `cimd` clients have none, by design. */
  source: 'registered' | 'cimd'
}

/**
 * Is this `client_id` a CIMD URL rather than a registered id?
 *
 * The test is the URL scheme, and it is unambiguous because ids this server issues are opaque and
 * start with `li2mcp_` — they can never be mistaken for a URL.
 */
export function isCimdClientId(clientId: string): boolean {
  return clientId.startsWith('https://')
}

/** RFC 1918 and friends, plus the ranges that matter most in a cloud VM: 169.254.169.254 is the
 *  instance metadata endpoint, and 100.64/10 is the carrier/VPC shared range. */
function isPublicIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false
  const [a, b] = parts
  if (a === 0) return false // 0.0.0.0/8 "this network"
  if (a === 10) return false // private
  if (a === 127) return false // loopback
  if (a === 100 && b >= 64 && b <= 127) return false // 100.64/10 CGNAT / shared address space
  if (a === 169 && b === 254) return false // 169.254/16 link-local — cloud instance metadata
  if (a === 172 && b >= 16 && b <= 31) return false // private
  if (a === 192 && b === 0) return false // 192.0.0/24 IETF protocol assignments + TEST-NET-1
  if (a === 192 && b === 168) return false // private
  if (a === 198 && (b === 18 || b === 19)) return false // 198.18/15 benchmarking
  if (a === 198 && b === 51) return false // TEST-NET-2
  if (a === 203 && b === 0) return false // TEST-NET-3
  if (a >= 224) return false // 224/4 multicast, 240/4 reserved, 255.255.255.255 broadcast
  return true
}

function isPublicIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0] // drop any zone id
  if (addr === '::' || addr === '::1') return false
  // ::ffff:a.b.c.d and ::a.b.c.d reach an IPv4 destination — judge them by IPv4 rules.
  const mapped = /^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(addr)
  if (mapped) return isPublicIpv4(mapped[1])
  const head = addr.split(':')[0]
  if (!head) return false // starts with `::` and was not matched above — refuse rather than guess
  const first = Number.parseInt(head, 16)
  if (!Number.isFinite(first)) return false
  if ((first & 0xfe00) === 0xfc00) return false // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return false // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return false // ff00::/8 multicast
  if (first === 0x2002) return false // 2002::/16 6to4 — can encapsulate a private IPv4 destination
  return true
}

function isPublicAddress(address: string, family: number): boolean {
  return family === 4 ? isPublicIpv4(address) : isPublicIpv6(address)
}

/**
 * ★ THE SSRF GATE. Everything below this line is a fetch of a URL an unauthenticated stranger chose.
 *
 * Five controls, each closing a different door:
 *   1. **https + default port only.** No `file:`, no `gopher:`, no plaintext, and no port number —
 *      an attacker-chosen port turns this endpoint into an internal port scanner, and the CIMD spec
 *      requires https anyway.
 *   2. **No credentials in the URL**, which some parsers and proxies disagree about.
 *   3. **DNS pre-flight against every resolved address.** A hostname is not safe just because it is
 *      not `localhost`: `metadata.google.internal`, an attacker's A record pointing at 169.254.169.254,
 *      and an IPv6 AAAA alongside a harmless IPv4 all resolve into the private space. EVERY address
 *      must be public, not just the first.
 *   4. **`redirect: 'error'`.** Following redirects would hand the whole check back to the attacker:
 *      a public URL that 302s to 169.254.169.254 defeats step 3 completely.
 *   5. **Timeout and a streamed byte cap.** `content-length` is a claim, not a fact, so the body is
 *      counted as it arrives.
 *
 * ⚠️ KNOWN RESIDUAL RISK — DNS rebinding. Between step 3's lookup and the socket connect, the
 *    attacker's DNS can answer differently. Closing it needs a custom undici dispatcher that
 *    connects to the exact address we validated; that is a real dependency-level change and is
 *    deliberately out of scope for v1. The exposure is bounded: the response must then also be a
 *    valid CIMD document whose `client_id` equals the URL, and the only thing an attacker gains is
 *    the ability to register a client whose metadata came from an internal host. Revisit if this
 *    endpoint is ever used to fetch anything whose CONTENT is returned to the caller.
 */
async function assertUrlIsSafeToFetch(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new OAuthProtocolError('invalid_client', 'Unknown or unusable client.', { status: 401 })
  }

  const reject = (reason: string) => {
    log.warn({ reason, host: url.hostname }, '[mcp-oauth] CIMD fetch refused')
    return new OAuthProtocolError('invalid_client', 'Unknown or unusable client.', { status: 401 })
  }

  if (url.protocol !== 'https:') throw reject('non_https')
  if (url.port) throw reject('non_default_port')
  if (url.username || url.password) throw reject('embedded_credentials')

  let addresses: { address: string; family: number }[]
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true })
  } catch {
    throw reject('dns_failure')
  }
  if (addresses.length === 0) throw reject('dns_empty')
  if (!addresses.every((a) => isPublicAddress(a.address, a.family))) throw reject('private_address')

  return url
}

/** Read a response body with a hard byte ceiling, counting what actually arrives rather than
 *  trusting the declared `content-length`. Returns null if the cap is hit. */
async function readBodyCapped(response: Response, maxBytes: number): Promise<string | null> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return null

  const reader = response.body?.getReader()
  if (!reader) return null

  const chunks: Buffer[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Respect the document's own caching wishes, clamped so neither extreme hurts us: an
 *  `max-age=1` would let a client turn every authorize into an outbound fetch, and a `max-age` of a
 *  year would make a compromised document unrecoverable. */
function cacheTtlFromHeaders(headers: Headers): number | null {
  const cc = (headers.get('cache-control') ?? '').toLowerCase()
  if (cc.includes('no-store') || cc.includes('no-cache')) return null
  const match = /max-age\s*=\s*(\d+)/.exec(cc)
  if (!match) return CIMD_DEFAULT_TTL_SECONDS
  const seconds = Number(match[1])
  if (!Number.isFinite(seconds)) return CIMD_DEFAULT_TTL_SECONDS
  return Math.min(Math.max(seconds, CIMD_MIN_TTL_SECONDS), CIMD_MAX_TTL_SECONDS)
}

export interface CimdFetchResult {
  client: ResolvedClient
  /** From the document's own `Cache-Control`, clamped. `null` means it asked not to be cached. */
  cacheTtlSeconds: number | null
}

/**
 * Fetch and validate a Client ID Metadata Document (spec 2025-11-25).
 *
 * Exported so the SSRF rules can be tested directly rather than through five layers of authorize.
 * Throws `OAuthProtocolError('invalid_client')` for every failure — one message, whether the URL was
 * blocked, the fetch failed, or the document lied about its own `client_id`.
 */
export async function fetchClientIdMetadataDocument(clientId: string): Promise<CimdFetchResult> {
  const url = await assertUrlIsSafeToFetch(clientId)
  const invalid = () =>
    new OAuthProtocolError('invalid_client', 'Unknown or unusable client.', { status: 401 })

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      // See control 4 in `assertUrlIsSafeToFetch` — following a redirect would void the DNS check.
      redirect: 'error',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(CIMD_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch {
    log.warn({ host: url.hostname }, '[mcp-oauth] CIMD fetch failed')
    throw invalid()
  }

  if (!response.ok) throw invalid()

  const body = await readBodyCapped(response, CIMD_MAX_BYTES)
  if (body === null) {
    log.warn({ host: url.hostname }, '[mcp-oauth] CIMD document exceeded the size cap')
    throw invalid()
  }

  let doc: unknown
  try {
    doc = JSON.parse(body)
  } catch {
    throw invalid()
  }
  if (typeof doc !== 'object' || doc === null) throw invalid()
  const record = doc as Record<string, unknown>

  /**
   * ★ The document must name itself, byte for byte, as the URL we fetched it from. Without this a
   * client_id URL under an attacker's control could claim to BE some other client — the metadata
   * would be trusted for a client the attacker does not own, redirect_uris included.
   */
  if (record.client_id !== clientId) {
    log.warn({ host: url.hostname }, '[mcp-oauth] CIMD client_id does not match its own URL')
    throw invalid()
  }

  const redirectUris = normalizeRedirectUris(record.redirect_uris)
  if (!redirectUris) throw invalid()

  return {
    client: {
      clientId,
      clientName: normalizeClientName(record.client_name),
      redirectUris,
      source: 'cimd',
    },
    cacheTtlSeconds: cacheTtlFromHeaders(response.headers),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Shared metadata validation (used by both /register and CIMD)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function normalizeRedirectUris(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_REDIRECT_URIS) return null
  const uris = value.filter((v): v is string => typeof v === 'string')
  if (uris.length !== value.length) return null
  if (!uris.every(isAcceptableRedirectUri)) return null
  return uris
}

/** Client-supplied display text. Capped here; the consent page (3b) is still responsible for
 *  escaping it — this string is chosen by whoever called /register. */
function normalizeClientName(value: unknown): string {
  if (typeof value !== 'string') return 'Unnamed MCP client'
  const trimmed = value.trim().slice(0, MAX_CLIENT_NAME_LENGTH)
  return trimmed.length > 0 ? trimmed : 'Unnamed MCP client'
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Public shapes
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** RFC 7591 §3.1 request, as far as we care about it. Everything else a client sends is accepted and
 *  dropped — see `registerClient`. */
export interface ClientRegistrationRequest {
  redirect_uris?: unknown
  client_name?: unknown
  token_endpoint_auth_method?: unknown
  grant_types?: unknown
  response_types?: unknown
  [key: string]: unknown
}

/** RFC 7591 §3.2.1 response. Bare, no envelope. */
export interface ClientRegistrationResponse {
  client_id: string
  client_id_issued_at: number
  client_name: string
  redirect_uris: string[]
  token_endpoint_auth_method: string
  grant_types: string[]
  response_types: string[]
  scope: string
}

/** A fully validated authorize request. 3b renders consent from this and hands it back unchanged. */
export interface McpAuthorizationRequest {
  client: ResolvedClient
  redirectUri: string
  state: string | null
  requestedScopes: McpScope[]
  codeChallenge: string
  /** RFC 8707. Accepted and recorded; deliberately not used to narrow the grant in v1 (plan §5). */
  resource: string | null
}

/** RFC 6749 §5.1. Bare, no envelope, and `Cache-Control: no-store` is the route's job. */
export interface McpTokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope: string
}

/** What Phase 4 gets back from a valid bearer. */
export interface McpAccessTokenClaims {
  userId: string
  clientId: string
  scopes: McpScope[]
  expiresAt: string
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export class McpOAuthService extends BaseService<McpOAuthRepository> {
  constructor(repo: McpOAuthRepository) {
    super(repo)
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // /register — RFC 7591 Dynamic Client Registration
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * ⚠️ IP-keyed sliding window on an endpoint with NO authentication and a database write behind it.
   *
   * Fails CLOSED, unlike `withRateLimit` which lets requests through when Redis is unreachable.
   * That middleware guards endpoints that are already behind `withAuth`, so failing open costs a
   * burst from a known user; here it would cost unbounded anonymous rows. A Redis outage blocking
   * NEW client registrations is a real but small loss — already-connected clients never touch this
   * path, and neither does CIMD.
   */
  async consumeRegistrationQuota(ip: string): Promise<{ allowed: boolean; retryAfter: number }> {
    const count = await this.countInWindow(
      REDIS_KEYS.MCP_OAUTH.REGISTER_IP(ip),
      REGISTER_RATE_LIMIT.windowSeconds
    )

    if (count === null) {
      log.error({ ip }, '[mcp-oauth] registration rate limiter unavailable — failing closed')
      return { allowed: false, retryAfter: 60 }
    }
    if (count >= REGISTER_RATE_LIMIT.maxRequests) {
      log.warn({ ip }, '[mcp-oauth] registration rate limit hit')
      return { allowed: false, retryAfter: REGISTER_RATE_LIMIT.windowSeconds }
    }
    return { allowed: true, retryAfter: 0 }
  }

  /**
   * Quota on the outbound CIMD fetch an unauthenticated `/authorize` can trigger (see
   * `CIMD_FETCH_RATE_LIMIT`).
   *
   * ★ FAILS OPEN, the opposite of `consumeRegistrationQuota` directly above, and the difference is
   * not an oversight. `core/mcp/rate-limit.ts` states the rule this follows: never fail open at a
   * layer that decides AUTHORITY, but failing open at a layer that only MEASURES is allowed.
   * Registration guards an unauthenticated database WRITE, so its failure mode is unbounded
   * anonymous rows — authority. This one only counts fetches; nothing it decides grants anything.
   * Failing it closed would mean a Redis outage stops every user from connecting any client at all,
   * which is a far worse outage than an unmetered window on an endpoint that was completely
   * unmetered until today.
   */
  async consumeCimdFetchQuota(
    ip: string,
    clientId: string | null
  ): Promise<{ allowed: boolean; retryAfter: number }> {
    const free = { allowed: true, retryAfter: 0 }

    // Only a URL-shaped client_id goes outbound; a registered one is a local table lookup.
    if (!clientId || !isCimdClientId(clientId)) return free

    // Already resolved, or already known bad: `resolveClient` will answer from Redis without going
    // outbound, so there is nothing to meter. This is the clause that keeps a real client — one
    // stable client_id, cached — from ever meaningfully spending quota.
    const cached = await this.withRedisDeadline(
      this.readCimdCache(REDIS_KEYS.MCP_OAUTH.CIMD(hashSecret(clientId))),
      null
    )
    if (cached) return free

    const count = await this.countInWindow(
      REDIS_KEYS.MCP_OAUTH.CIMD_FETCH_IP(ip),
      CIMD_FETCH_RATE_LIMIT.windowSeconds
    )

    if (count === null) {
      log.error({ ip }, '[mcp-oauth] CIMD fetch limiter unavailable — failing OPEN, see method doc')
      return free
    }
    if (count >= CIMD_FETCH_RATE_LIMIT.maxRequests) {
      log.warn({ ip, clientId }, '[mcp-oauth] CIMD fetch rate limit hit')
      return { allowed: false, retryAfter: CIMD_FETCH_RATE_LIMIT.windowSeconds }
    }
    return free
  }

  /**
   * One sliding window, shared by both quotas above so they cannot drift apart. Returns the count
   * BEFORE this call was recorded, or `null` if Redis did not answer in time — the caller decides
   * what `null` means, because that is the fail-open/fail-closed decision and it differs per caller.
   */
  private async countInWindow(key: string, windowSeconds: number): Promise<number | null> {
    const now = Math.floor(Date.now() / 1000)
    return this.withRedisDeadline(
      (async () => {
        const results = await redis
          .multi()
          .zremrangebyscore(key, 0, now - windowSeconds)
          .zcard(key)
          .zadd(key, now, `${now}-${randomBytes(6).toString('hex')}`)
          .expire(key, windowSeconds)
          .exec()
        return (results?.[1]?.[1] as number) || 0
      })(),
      null
    )
  }

  /**
   * Bound a Redis call and substitute `fallback` if it does not answer — see `REDIS_DEADLINE_MS`
   * for why the `try/catch` alone is not enough.
   *
   * ⚠️ The losing promise is NOT cancelled; ioredis has no abort. It settles later into nothing,
   * which is harmless: the command still lands or does not, and the counter stays correct for the
   * next call. What matters is that the caller stopped waiting.
   */
  private async withRedisDeadline<T>(work: Promise<T>, fallback: T): Promise<T> {
    let timer: NodeJS.Timeout | undefined
    try {
      return await Promise.race([
        work,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), REDIS_DEADLINE_MS)
        }),
      ])
    } catch {
      return fallback
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  /**
   * Register a client (RFC 7591).
   *
   * ★ THE CONTRACT COMES FROM TWO REAL PAYLOADS, not from reading the RFC. Captured in the Phase 0.2
   * spike: Claude Desktop sends `{redirect_uris, token_endpoint_auth_method, grant_types,
   * response_types, scope, client_name, application_type}`; MCP Inspector sends the same core set but
   * with `client_uri` instead of `application_type`. The tails differ and will keep differing, so
   * unknown fields are ACCEPTED AND DROPPED — rejecting them would break a client for sending a
   * field the RFC allows. Exactly three things are stored: name, redirect URIs, auth method.
   *
   * Under spec 2025-11-25 this endpoint is a MAY, kept for older clients; CIMD is the SHOULD and
   * writes nothing here at all.
   */
  async registerClient(request: ClientRegistrationRequest): Promise<ClientRegistrationResponse> {
    const redirectUris = normalizeRedirectUris(request.redirect_uris)
    if (!redirectUris) {
      throw new OAuthProtocolError(
        'invalid_redirect_uri',
        `redirect_uris must be an array of 1 to ${MAX_REDIRECT_URIS} absolute https URIs without a fragment (http is accepted only for loopback).`
      )
    }

    const authMethod = request.token_endpoint_auth_method ?? SUPPORTED_TOKEN_ENDPOINT_AUTH_METHOD
    if (authMethod !== SUPPORTED_TOKEN_ENDPOINT_AUTH_METHOD) {
      throw new OAuthProtocolError(
        'invalid_client_metadata',
        `Only token_endpoint_auth_method "${SUPPORTED_TOKEN_ENDPOINT_AUTH_METHOD}" is supported; clients authenticate with PKCE.`
      )
    }

    // `grant_types` / `response_types` are known RFC 7591 fields, so they are validated rather than
    // dropped — but only if sent, since both are optional and both real clients send exactly ours.
    if (request.grant_types !== undefined) {
      if (
        !Array.isArray(request.grant_types) ||
        !request.grant_types.every((g) => SUPPORTED_GRANT_TYPES.includes(g as never))
      ) {
        throw new OAuthProtocolError(
          'invalid_client_metadata',
          `Supported grant_types are: ${SUPPORTED_GRANT_TYPES.join(', ')}.`
        )
      }
    }
    if (request.response_types !== undefined) {
      if (
        !Array.isArray(request.response_types) ||
        !request.response_types.every((r) => SUPPORTED_RESPONSE_TYPES.includes(r as never))
      ) {
        throw new OAuthProtocolError(
          'invalid_client_metadata',
          `The only supported response_type is "${SUPPORTED_RESPONSE_TYPES[0]}".`
        )
      }
    }

    const clientId = `li2mcp_${randomBytes(16).toString('hex')}`
    const clientName = normalizeClientName(request.client_name)

    await this.repo.createClient({
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: SUPPORTED_TOKEN_ENDPOINT_AUTH_METHOD,
    })

    log.info({ clientId, clientName }, '[mcp-oauth] client registered')

    return {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: SUPPORTED_TOKEN_ENDPOINT_AUTH_METHOD,
      grant_types: [...SUPPORTED_GRANT_TYPES],
      response_types: [...SUPPORTED_RESPONSE_TYPES],
      // Advertised, not granted. What the user actually consents to is decided on the consent
      // screen, where `read` is implicit and the `write` box defaults to TICKED (see MCP_SCOPES).
      scope: MCP_SCOPES.join(' '),
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Client resolution
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Resolve a `client_id` to its metadata, by whichever of the two mechanisms applies.
   *
   * This is the ONLY place either mechanism is consulted. The token endpoint deliberately never
   * looks a client up — it only checks that the `client_id` presented matches the one already bound
   * to the code or refresh token. That keeps CIMD and DCR clients identical downstream, and means
   * the token endpoint cannot leak whether a given client_id exists.
   */
  async resolveClient(clientId: string): Promise<ResolvedClient> {
    const unknownClient = () =>
      new OAuthProtocolError('invalid_client', 'Unknown or unusable client.', { status: 401 })

    if (isCimdClientId(clientId)) {
      const cacheKey = REDIS_KEYS.MCP_OAUTH.CIMD(hashSecret(clientId))
      const cached = await this.readCimdCache(cacheKey)
      if (cached === 'invalid') throw unknownClient()
      if (cached) return cached

      try {
        const { client, cacheTtlSeconds } = await fetchClientIdMetadataDocument(clientId)
        if (cacheTtlSeconds !== null) await this.writeCimdCache(cacheKey, client, cacheTtlSeconds)
        return client
      } catch (error) {
        await this.writeCimdCacheNegative(cacheKey)
        throw error
      }
    }

    const row = await this.repo.findClient(clientId)
    if (!row) throw unknownClient()
    return {
      clientId: row.client_id,
      clientName: row.client_name,
      redirectUris: row.redirect_uris,
      source: 'registered',
    }
  }

  /** Cache reads never block a request: a Redis problem costs one extra outbound fetch, not a
   *  failed authorization. Contrast `consumeRegistrationQuota`, which fails closed on purpose. */
  private async readCimdCache(key: string): Promise<ResolvedClient | 'invalid' | null> {
    try {
      const raw = await redis.get(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as ResolvedClient | { invalid: true }
      return 'invalid' in parsed ? 'invalid' : parsed
    } catch {
      return null
    }
  }

  /** `ttlSeconds` comes from the document's own `Cache-Control`, already clamped by
   *  `cacheTtlFromHeaders`. A document that says `no-store` is never cached at all — the caller
   *  skips this method entirely rather than substituting a default. */
  private async writeCimdCache(
    key: string,
    resolved: ResolvedClient,
    ttlSeconds: number
  ): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(resolved), 'EX', ttlSeconds)
    } catch {
      /* cache is an optimization; losing it costs one refetch */
    }
  }

  private async writeCimdCacheNegative(key: string): Promise<void> {
    try {
      await redis.set(key, JSON.stringify({ invalid: true }), 'EX', CIMD_NEGATIVE_TTL_SECONDS)
    } catch {
      /* see above */
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // /authorize — RFC 6749 §4.1.1 + PKCE
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Validate an authorize request. Does NOT issue anything and does NOT decide consent.
   *
   * ★ ORDER IS THE SECURITY PROPERTY HERE. The client is resolved first and its `redirect_uri` is
   * proven second, because RFC 6749 §4.1.2.1 forbids reporting an error by redirect until both are
   * known good — otherwise an attacker gets an open redirector, and a phishing page collects errors
   * with the victim's `state`. Errors found before that point carry no `redirectTo` and the route
   * must show them directly; every error after it carries one.
   */
  async validateAuthorizationRequest(params: URLSearchParams): Promise<McpAuthorizationRequest> {
    const clientId = params.get('client_id')
    if (!clientId) {
      throw new OAuthProtocolError('invalid_request', 'client_id is required.')
    }

    // ── Stage 1: unredirectable. Nothing below may be reported to a redirect_uri. ────────────────
    const client = await this.resolveClient(clientId)

    const redirectUri = params.get('redirect_uri')
    if (!redirectUri || !redirectUriIsRegistered(client.redirectUris, redirectUri)) {
      // Deliberately the same message whether the parameter was missing or simply did not match:
      // a client that mis-registers learns it did, and nothing else learns which URIs are on file.
      log.warn({ clientId }, '[mcp-oauth] authorize rejected: redirect_uri not registered')
      throw new OAuthProtocolError(
        'invalid_request',
        'redirect_uri is missing or does not exactly match a registered redirect URI.'
      )
    }

    // ── Stage 2: redirectable. `state` is echoed and `iss` is attached (RFC 9207). ───────────────
    const state = params.get('state')
    const fail = (error: OAuthErrorCode, description: string) =>
      new OAuthProtocolError(error, description, {
        redirectTo: this.buildAuthorizationErrorRedirect(redirectUri, error, description, state),
      })

    if (params.get('response_type') !== 'code') {
      throw fail('unsupported_response_type', 'Only response_type=code is supported.')
    }

    const codeChallenge = params.get('code_challenge')
    const codeChallengeMethod = params.get('code_challenge_method')
    if (!codeChallenge) {
      throw fail('invalid_request', 'PKCE is required: code_challenge is missing.')
    }
    /**
     * ★ S256 OR NOTHING. A missing `code_challenge_method` is REJECTED rather than defaulted, even
     * though RFC 7636 §4.3 says the default is `plain` — that default is the whole problem. `plain`
     * sends the verifier in the authorize URL, so anyone who can read the URL (browser history, a
     * proxy log, a referrer) can complete the exchange, which is exactly the attack PKCE exists to
     * stop. Every MCP client supports S256; there is nobody to be compatible with here.
     */
    if (codeChallengeMethod !== CODE_CHALLENGE_METHOD) {
      throw fail(
        'invalid_request',
        `code_challenge_method must be "${CODE_CHALLENGE_METHOD}"; "plain" is not supported.`
      )
    }

    return {
      client,
      redirectUri,
      state,
      requestedScopes: this.narrowRequestedScopes(params.get('scope')),
      codeChallenge,
      // RFC 8707 resource indicator. MCP clients send it and MUST NOT be refused for doing so
      // (plan §5); v1 records it and grants the same thing regardless.
      resource: params.get('resource'),
    }
  }

  /**
   * Reduce a requested `scope` string to what this server actually has.
   *
   * Unknown values are DROPPED rather than answered with `invalid_scope`. Real clients ask for
   * things we do not model — Claude Desktop asked for `openid profile email` in the spike — and
   * failing the whole authorization over a scope we would have ignored anyway is a worse outcome
   * than quietly granting less. An empty result falls back to `read`, which is the least privilege
   * this server can grant and the value plan §5 wants in the 401 challenge.
   */
  private narrowRequestedScopes(raw: string | null): McpScope[] {
    const asked = (raw ?? '').split(/\s+/).filter(Boolean)
    const supported = asked.filter((s): s is McpScope => MCP_SCOPES.includes(s as McpScope))
    const unique = Array.from(new Set(supported))
    return unique.length > 0 ? unique : ['read']
  }

  /** RFC 6749 §4.1.2.1 error redirect, with RFC 9207 `iss`. Query parameters, never a fragment. */
  private buildAuthorizationErrorRedirect(
    redirectUri: string,
    error: OAuthErrorCode,
    description: string,
    state: string | null
  ): string {
    const url = new URL(redirectUri)
    url.searchParams.set('error', error)
    url.searchParams.set('error_description', description)
    if (state !== null) url.searchParams.set('state', state)
    url.searchParams.set('iss', getIssuer())
    return url.toString()
  }

  /**
   * Where the browser goes when the user says no (plan Phase 3b).
   *
   * A refusal is a protocol OUTCOME, not a dead end: RFC 6749 §4.1.2.1 defines `access_denied`
   * precisely so the client learns the flow is over. Dropping the user on a "cancelled" page instead
   * leaves the client waiting on a callback that will never arrive, and a user who has to force-quit
   * it. Safe to redirect because this is only ever reached after `validateAuthorizationRequest` has
   * proven both the client and the `redirect_uri`.
   */
  buildConsentDenialRedirect(request: McpAuthorizationRequest): string {
    return this.buildAuthorizationErrorRedirect(
      request.redirectUri,
      'access_denied',
      'The user declined the request.',
      request.state
    )
  }

  /**
   * Mint an authorization code and build the redirect back to the client.
   *
   * ⚠️ EXACTLY ONE CALLER, AND IT MUST STAY THAT WAY: the CSRF-protected consent POST in
   * `app/api/mcp/oauth/[...route]/route.ts`. It passes the session's user id and the scopes the user
   * actually ticked. Anything else calling this would be issuing a credential for a grant no human
   * approved — the consent screen is the only place the read/write decision is made (plan §4).
   *
   * `grantedScopes` must be a subset of `request.requestedScopes`: consent may narrow what a client
   * asked for, never widen it. A step-up for `write` is a NEW authorize carrying `scope=read write`,
   * which is exactly how plan §5's `insufficient_scope` flow is meant to work.
   */
  async issueAuthorizationCode(
    request: McpAuthorizationRequest,
    userId: string,
    grantedScopes: McpScope[]
  ): Promise<{ code: string; redirectTo: string }> {
    const unique = Array.from(new Set(grantedScopes))
    if (unique.length === 0) {
      throw new OAuthProtocolError('invalid_scope', 'At least one scope must be granted.')
    }
    if (!unique.every((scope) => request.requestedScopes.includes(scope))) {
      throw new OAuthProtocolError(
        'invalid_scope',
        'Consent cannot grant a scope the client did not request.'
      )
    }

    const code = generateSecret('li2mcp_code_')
    await this.repo.createCode({
      code_hash: hashSecret(code),
      client_id: request.client.clientId,
      user_id: userId,
      scopes: unique,
      code_challenge: request.codeChallenge,
      redirect_uri: request.redirectUri,
      expires_at: new Date(Date.now() + AUTHORIZATION_CODE_TTL_SECONDS * 1000).toISOString(),
    })

    // A CIMD client has no row to mark. For a registered one this is what keeps it out of the 24h
    // never-used sweep, so it must not be skipped or made best-effort.
    if (request.client.source === 'registered') {
      await this.repo.markClientGranted(request.client.clientId)
    }

    const url = new URL(request.redirectUri)
    url.searchParams.set('code', code)
    if (request.state !== null) url.searchParams.set('state', request.state)
    /**
     * RFC 9207. Lets the client prove WHICH authorization server answered, closing the mix-up attack
     * where a malicious AS relays a code issued by an honest one. The 2026-07-28 MCP draft raises
     * validating this to a client-side MUST; emitting it now is correct under both versions.
     */
    url.searchParams.set('iss', getIssuer())

    log.info(
      { clientId: request.client.clientId, userId, scopes: unique },
      '[mcp-oauth] authorization code issued'
    )
    return { code, redirectTo: url.toString() }
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // /token — authorization_code grant
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Exchange an authorization code for a token pair (RFC 6749 §4.1.3).
   *
   * ⚠️ THE CODE IS DESTROYED BEFORE ANY CHECK RUNS. `claimCodeAtomically` is a single
   * DELETE...RETURNING, so every failure below has already consumed the code — a wrong verifier
   * burns it, a wrong redirect_uri burns it. That is the correct behaviour and RFC 6749 §4.1.2 asks
   * for it: a code that took part in a failed exchange may have been intercepted, and letting a
   * client "try again" with it is precisely the replay we are preventing.
   *
   * Every failure answers with the same `invalid_grant` — see `invalidGrant()`.
   */
  async exchangeAuthorizationCode(input: {
    code: string
    clientId: string
    redirectUri: string
    codeVerifier: string
  }): Promise<McpTokenResponse> {
    const claimed = await this.repo.claimCodeAtomically(hashSecret(input.code))
    if (!claimed) {
      log.warn({ clientId: input.clientId }, '[mcp-oauth] code exchange failed: unknown or reused')
      throw invalidGrant()
    }

    const reject = (reason: string) => {
      log.warn({ clientId: input.clientId, reason }, '[mcp-oauth] code exchange rejected')
      return invalidGrant()
    }

    if (claimed.client_id !== input.clientId) throw reject('client_mismatch')
    // RFC 6749 §4.1.3: the redirect_uri presented here MUST equal the one used at /authorize.
    if (claimed.redirect_uri !== input.redirectUri) throw reject('redirect_uri_mismatch')
    if (new Date(claimed.expires_at).getTime() <= Date.now()) throw reject('expired')
    if (!verifyPkceS256(input.codeVerifier, claimed.code_challenge)) throw reject('pkce_mismatch')

    return this.issueTokenPair({
      grantId: randomUUID(),
      clientId: claimed.client_id,
      userId: claimed.user_id,
      scopes: claimed.scopes as McpScope[],
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // /token — refresh_token grant
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Rotate a refresh token (RFC 6749 §6 + RFC 9700 §4.14.2).
   *
   * ★ THE ORDER OF THE FIRST TWO CHECKS MATTERS. The row is READ and its `client_id` verified BEFORE
   * anything is written. If the claim came first, anyone holding a stolen refresh token could revoke
   * a victim's grant just by presenting it with the wrong `client_id` — a denial of service handed
   * out for free. Reading first costs one query and removes that entirely; the atomic claim further
   * down is still the only thing that decides who wins a genuine race.
   *
   * ★ REPLAY OF AN ALREADY-ROTATED TOKEN KILLS THE WHOLE CHAIN. Presenting a refresh token that has
   * already been rotated means two parties hold it, and there is no way to tell the thief from the
   * owner — so both lose it and the user reconnects. RFC 9700 recommends exactly this. The known
   * cost is real: a client that loses the network mid-refresh and retries with the old token gets
   * disconnected rather than resumed. That is the accepted price of rotation.
   */
  async refreshAccessToken(input: {
    refreshToken: string
    clientId: string
    requestedScope: string | null
  }): Promise<McpTokenResponse> {
    const hash = hashSecret(input.refreshToken)
    const reject = (reason: string) => {
      log.warn({ clientId: input.clientId, reason }, '[mcp-oauth] refresh rejected')
      return invalidGrant()
    }

    const existing = await this.repo.findAnyTokenByRefreshHash(hash)
    if (!existing) throw reject('unknown_refresh_token')
    if (existing.client_id !== input.clientId) throw reject('client_mismatch')

    if (existing.revoked_at !== null) {
      const revoked = await this.repo.revokeGrantFamily(existing.grant_id)
      log.error(
        { clientId: input.clientId, grantId: existing.grant_id, revoked },
        '[mcp-oauth] refresh token REPLAY detected — entire grant family revoked'
      )
      throw invalidGrant()
    }

    if (
      !existing.refresh_expires_at ||
      new Date(existing.refresh_expires_at).getTime() <= Date.now()
    ) {
      throw reject('refresh_expired')
    }

    const claimed = await this.repo.claimRefreshTokenAtomically(hash)
    // Lost a concurrent race: another request rotated this token between the read and the claim.
    if (!claimed) throw reject('lost_rotation_race')

    return this.issueTokenPair({
      grantId: claimed.grant_id,
      clientId: claimed.client_id,
      userId: claimed.user_id,
      scopes: this.narrowGrantedScopes(claimed.scopes as McpScope[], input.requestedScope),
    })
  }

  /**
   * RFC 6749 §6: a refresh may narrow the granted scope, never widen it.
   *
   * Anything unrecognised or ungranted is dropped instead of raising `invalid_scope`. Answering
   * "you never had write" is a true statement about someone else's grant, and the client can learn
   * what it holds from the `scope` field of the response it already gets back.
   */
  private narrowGrantedScopes(granted: McpScope[], requestedScope: string | null): McpScope[] {
    if (!requestedScope) return granted
    const asked = requestedScope.split(/\s+/).filter(Boolean)
    const intersection = granted.filter((scope) => asked.includes(scope))

    /**
     * A request that overlaps the grant in NOTHING is treated as if `scope` had been omitted, which
     * §6 defines as the originally granted scope. It is the rule above taken to its limit, and it
     * cannot widen anything: `intersection` is a subset of `granted` by construction, so the worst
     * case returns what the user already approved at consent time.
     *
     * ⚠️ It is silent, though, and that is the part worth knowing: a client that meant to drop a
     * scope but sent a name that matches nothing gets its FULL grant back with no signal that its
     * request was ignored. Raising `invalid_scope` instead is a deliberate non-choice here (see
     * above) — revisiting it is a product decision, not a bug fix.
     */
    return intersection.length > 0 ? intersection : granted
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // /revoke — RFC 7009
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Revoke a grant. Never throws for an unknown token: RFC 7009 §2.2 requires 200 either way, so
   * that a client cannot use this endpoint to test whether a token string is real.
   *
   * Revokes the whole rotation family rather than the single row. "Disconnect this agent" is what
   * the user means, and leaving other generations alive would make revocation depend on which of
   * two interchangeable strings the client happened to send.
   */
  async revokeToken(input: { token: string; clientId: string | null }): Promise<void> {
    const row = await this.repo.findTokenByEitherHash(hashSecret(input.token))
    if (!row) return
    // A client may only revoke its own grants; silently ignoring the mismatch keeps this from
    // becoming a way to knock other clients offline.
    if (input.clientId !== null && row.client_id !== input.clientId) return

    const revoked = await this.repo.revokeGrantFamily(row.grant_id)
    log.info({ clientId: row.client_id, grantId: row.grant_id, revoked }, '[mcp-oauth] grant revoked')
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Bearer validation (consumed by Phase 4)
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Validate an opaque access token. Returns null for anything invalid — Phase 4 answers all of them
   * with the same 401 plus `WWW-Authenticate: Bearer resource_metadata="…"`, which is what starts a
   * client's discovery.
   */
  async validateAccessToken(accessToken: string): Promise<McpAccessTokenClaims | null> {
    const row = await this.repo.findLiveTokenByAccessHash(hashSecret(accessToken))
    if (!row) return null
    if (new Date(row.expires_at).getTime() <= Date.now()) return null
    return {
      userId: row.user_id,
      clientId: row.client_id,
      scopes: row.scopes as McpScope[],
      expiresAt: row.expires_at,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // Shared token minting
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /** One row holds both tokens, so revoking it kills the pair together — see the migration's note
   *  on why an access token deliberately dies with its refresh token. */
  private async issueTokenPair(input: {
    grantId: string
    clientId: string
    userId: string
    scopes: McpScope[]
  }): Promise<McpTokenResponse> {
    const accessToken = generateSecret(ACCESS_TOKEN_PREFIX)
    const refreshToken = generateSecret(REFRESH_TOKEN_PREFIX)
    const now = Date.now()

    const row: McpOAuthTokenRow = await this.repo.createToken({
      grant_id: input.grantId,
      access_token_hash: hashSecret(accessToken),
      refresh_token_hash: hashSecret(refreshToken),
      client_id: input.clientId,
      user_id: input.userId,
      scopes: input.scopes,
      expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
      refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
    })

    log.info(
      { clientId: input.clientId, userId: input.userId, grantId: row.grant_id, scopes: input.scopes },
      '[mcp-oauth] token pair issued'
    )

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope: input.scopes.join(' '),
    }
  }
}

export const mcpOAuthService =
  globalThis._mcpOAuthService ?? new McpOAuthService(mcpOAuthRepo)

if (process.env.NODE_ENV !== 'production') globalThis._mcpOAuthService = mcpOAuthService
