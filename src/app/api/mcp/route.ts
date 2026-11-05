/**
 * ============================================================================
 * Li2 MCP server — the protected resource (plan Phase 4a).
 * ============================================================================
 *
 * POST /api/mcp — a stateless MCP Streamable-HTTP endpoint behind an opaque OAuth bearer.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⛔ THIS FILE SPEAKS A THIRD RESPONSE DIALECT. THREE NOW COEXIST IN THIS REPO; DO NOT MIX THEM.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 *   `/api/*`             → li2-app's `APIResponse` envelope `{data, message, success, i18nMessage}`
 *   `/api/mcp/oauth/*`   → bare RFC 6749 bodies (that file documents its own exception)
 *   `/api/mcp`  (here)   → JSON-RPC 2.0 / MCP, which is neither
 * The OAuth route's exception is NOT this route's exception. An MCP client parses JSON-RPC; an
 * envelope around it is an unexplained parse failure at the client with nothing in our logs.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * THE 401 IS THE FRONT DOOR, NOT AN ERROR PATH.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * A brand-new MCP client knows one thing: this URL. It POSTs here with no credential, reads
 * `WWW-Authenticate` off the 401, and that header is the ONLY thing that tells it where the
 * `.well-known` documents live. Drop `resource_metadata` and the entire Phase 3a/3b authorization
 * server becomes unreachable — the client cannot bootstrap and simply reports that it could not
 * connect. Every 401 this file can produce carries it; there is no branch that does not.
 *
 * `scope` on the challenge is the second half of that (spec 2025-11-25 SHOULD, confirmed in the
 * Phase 0.2 spike): clients treat the challenge scope as authoritative, and a challenge WITHOUT it
 * makes them request every scope in `scopes_supported` — observed live, Claude asked for everything.
 *
 * ⚠️ WE CHALLENGE WITH BOTH SCOPES, AND THAT REVERSES THE FIRST DRAFT OF PLAN §4 (Kei, 2026-07-30).
 * §4 originally challenged with `read` alone to make least privilege the default. Phase 6 measured
 * what that actually produces: a spec-conformant client asks for exactly `read`, so the consent
 * screen never renders the write checkbox, so `tools/list` hides `create_short_link`, so the model
 * never calls it, so no `insufficient_scope` is ever raised — and v1 has no step-up flow either
 * (`errors.ts`). The result was a write feature that NO client could switch on, by any route.
 *
 * The correction is that the challenge is the wrong place to enforce least privilege. It advertises
 * what a client may ASK for; the consent tick decides what is GRANTED. Asking for both is what makes
 * the user's choice reachable at all.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * SCOPE IS ENFORCED BY HIDING.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * `tools/list` returns only the tools the grant's scopes cover, so a read-only connection never even
 * sees `create_short_link`. That is a product decision, not just a security one: a model that can
 * see a tool will eventually try it, and "you may not do that" mid-task is a worse experience than
 * the capability never existing. The call-side check stays anyway — hiding is not enforcement.
 *
 * ⛔ `MCP_ACCESS` IS NOT GATED HERE. It is per-ORG, and the org arrives as a tool argument (plan
 * §4.1), so it can only be checked once a call names one — that is `call-tool.ts` in Phase 4b. A
 * user whose orgs all lack the entitlement still authenticates and still lists tools; the calls fail.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⛔⛔ NOTHING IN THIS FILE MAY EVER LOG A TOOL ARGUMENT. (Phase 5)
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * `create_short_link` accepts a link `password`. li2-ai solved this once, with a single masker
 * (`mask_secret_args`, `trust/guardrails.py`) so the card builder and the history builder cannot
 * drift. This server takes the other branch of that same choice and logs NO arguments at all — there
 * is no second consumer here to keep in sync, and "log nothing" is the only version of the rule that
 * cannot rot when a future tool gains a secret field nobody remembers to declare.
 *
 * `org_id` is the ONE exception and it is not really one: it is an identifier, not a value, it is the
 * tenant axis every one of these log lines exists to record, and `readOrgIdForLog` below will only
 * ever return a well-formed UUID or null. Read that function before adding a field to the log line.
 *
 * `runtime = 'nodejs'`: paseto-ts (Phase 4b's mint) and ioredis both need node crypto/net.
 */
import { NextRequest } from 'next/server'
import { validate as isUuid } from 'uuid'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Implementation,
} from '@modelcontextprotocol/sdk/types.js'
import { APP_VERSION } from '@/core/constants/app-version'
import { MCP_TOOLS, getMcpTool } from '@/core/mcp/tools'
import { callTool } from '@/core/mcp/call-tool'
import {
  McpToolError,
  insufficientScope,
  rateLimited,
  toToolErrorResult,
  unknownTool,
} from '@/core/mcp/errors'
import {
  consumeMcpRateLimit,
  peekMcpRateLimit,
  MCP_RATE_LIMIT_WINDOWS,
  type McpRateLimitIdentity,
  type McpRateLimitWindow,
} from '@/core/mcp/rate-limit'
import { ARTIFACT_BODY_HEADROOM_BYTES } from '@/core/helpers/artifact-upload-limit'
import { ARTIFACT_MAX_BYTES } from '@/core/types/artifact.type'
import {
  ACCESS_TOKEN_PREFIX,
  getIssuer,
  mcpOAuthService,
  MCP_SCOPES,
  type McpAccessTokenClaims,
  type McpScope,
} from '@/core/services/mcp-oauth.service'
import { logger } from '@/infrastructure/logging/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'mcp-endpoint' })

/**
 * ★ The branding block a directory listing and a consent dialog render (P0.3).
 *
 * A FUNCTION, not a const, and that is not style: `websiteUrl` and the icon URL come from
 * `NEXT_PUBLIC_APP_BASE_URL`, and a module-level const would freeze whatever that variable held at
 * import time — which in the test suite is nothing, because vitest hoists imports above the line
 * that sets it. Read per `initialize` instead; it is three string joins.
 *
 * `name` stays `li2-mcp` FOREVER. Clients key their stored connector on it, so renaming it to "Li2"
 * for looks would read as a different server to every client that already trusts this one. `title`
 * is the field that exists for the pretty name — that is the `name`/`title` split in MCP
 * `BaseMetadata`, the same one the 21 tools now use.
 *
 * `version` is the app's real release (`package.json`), not a number maintained here. The old
 * hand-typed `'0.1.0'` had not moved in four waves and told a reviewer nothing true.
 *
 * ⚠️ THE ICON IS AN SVG BECAUSE THE REPO HAS NO SQUARE PNG. `public/images/logo.png` is 251×74 — a
 * wordmark, which a client crops to a square and ruins — while `mini_logo.svg` is a 200×200 mark.
 * `sizes: ['any']` is what the spec asks for on a scalable format. The day a 512×512 PNG lands in
 * `public/`, add it as a SECOND entry rather than replacing this one: some clients refuse SVG on the
 * grounds that it can carry script.
 *
 * Only fields in the SDK's `ImplementationSchema` are sent (`name`, `title`, `version`,
 * `websiteUrl`, `icons`, `description`). An unknown key would be dropped or rejected by a strict
 * client, so nothing invented goes in here.
 */
function serverInfo(): Implementation {
  const info: Implementation = {
    name: 'li2-mcp',
    title: 'Li2',
    version: APP_VERSION,
  }

  let base: string
  try {
    base = getIssuer()
  } catch {
    // A missing base URL already breaks discovery one layer up; branding is not worth a 500 here.
    return info
  }

  return {
    ...info,
    websiteUrl: base,
    icons: [{ src: `${base}/images/mini_logo.svg`, mimeType: 'image/svg+xml', sizes: ['any'] }],
  }
}

/**
 * ★ DNS-rebinding protection — the Origin allow-list (P0.2, spec MUST).
 *
 * ⚠️ READ THE ASYMMETRY BEFORE TOUCHING THIS, because getting it wrong locks out the clients that
 * matter most. The SDK (`webStandardStreamableHttp.js`, `validateRequestHeaders`) checks Origin
 * ONLY WHEN THE HEADER IS PRESENT — a request with no Origin passes. That is what keeps Claude Code,
 * MCP Inspector and every other non-browser client working: they send no Origin at all, and a
 * "deny unless allowed" rule would 403 all of them while every browser-hosted client sailed through.
 * The attack this defends against is a web page in a victim's browser pointed at this URL, and a
 * browser ALWAYS attaches Origin, so the gap is not the one it looks like.
 *
 * ⛔ `allowedHosts` IS DELIBERATELY NOT SET, and it is the trap in the same SDK function: the Host
 * check has no such "only if present" escape — it rejects when the header is missing OR unlisted,
 * and it reads `host`, which behind LiHi's reverse proxy is the INTERNAL hop, not
 * `app.example.com` (the real name arrives in `x-forwarded-host`, which the SDK never
 * looks at). Enabling it would 403 every single request in production while passing in dev. Host
 * validation that is worth anything belongs at Traefik, which already terminates the real hostname.
 */
const DEFAULT_MCP_ALLOWED_ORIGINS = [
  'https://claude.ai',
  'https://claude.com',
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://platform.openai.com',
]

/**
 * `MCP_ALLOWED_ORIGINS` (CSV) EXTENDS the defaults, never replaces them — a deployment adding its
 * own console origin must not be able to drop claude.ai by forgetting to repeat it. The app's own
 * origin is added because the Li2 UI itself is a legitimate caller.
 *
 * Computed per request for the same reason `serverInfo` is: the env is read after import in tests,
 * and in production this is a handful of string operations on a path that already does a Postgres
 * round trip.
 */
function allowedOrigins(): string[] {
  const configured = (process.env.MCP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  let appOrigin: string[] = []
  try {
    appOrigin = [getIssuer()]
  } catch {
    appOrigin = []
  }

  return [...new Set([...DEFAULT_MCP_ALLOWED_ORIGINS, ...configured, ...appOrigin])]
}

/** RFC 9728. The `[[...suffix]]` route serves both this bare path and the path-suffixed variant. */
const RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource'

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// LAYER 0 — the declared body size
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Room for the JSON-RPC wrapping itself, on top of what the back hop will accept.
 *
 * A `publish_artifact` call does not send the file alone: it sends it inside
 * `{"jsonrpc":"2.0","method":"tools/call","params":{"arguments":{"html":"…"}}}`, with every quote,
 * backslash and control character in the HTML escaped on the way in. So a body that is exactly the
 * back hop's limit is legitimate traffic and must pass. One megabyte is ~10% of the file ceiling,
 * which covers the envelope, the org_id and the escaping of ordinary HTML.
 */
const MCP_ENVELOPE_HEADROOM_BYTES = 1024 * 1024

/**
 * 12 MB, and it is DERIVED rather than typed: 10 MB artifact (`ARTIFACT_MAX_BYTES`) + 1 MB back-hop
 * headroom (`ARTIFACT_BODY_HEADROOM_BYTES`, the same number `rejectOversizedAgentBody` allows) + 1 MB
 * for the JSON-RPC envelope. Raising the artifact ceiling therefore raises this one too, which is the
 * whole point — a literal `12 * 1024 * 1024` here would silently become the real ceiling the day
 * `ARTIFACT_MAX_BYTES` moves, and the symptom would be a 413 from a layer nobody looks at.
 */
const MCP_MAX_BODY_BYTES =
  ARTIFACT_MAX_BYTES + ARTIFACT_BODY_HEADROOM_BYTES + MCP_ENVELOPE_HEADROOM_BYTES

/**
 * ★ LAYER 0 — refuse on the DECLARED size, before anything reads the body.
 *
 * The real size limit used to live one hop away: `rejectOversizedAgentBody` checks `Content-Length`
 * at `/api/agent/tools/*`, so a 30 MB base64 blob sent to `/api/mcp` was buffered whole by Node, put
 * through `JSON.parse`, dispatched, forwarded — and refused only then. Nothing was broken by that;
 * it was just paid for in RAM, once per junk request, with no cap on how many arrive at once.
 *
 * ⚠️ IT ONLY READS THE HEADER, AND A MISSING HEADER IS NOT A REFUSAL. Measuring the body would mean
 * reading the body, which is the cost this check exists to avoid; and a chunked request legitimately
 * carries no `Content-Length` (HTTP/1.1 §3.3.1), so refusing on absence would refuse honest clients
 * to catch a dishonest one. The back hop's own layer-0 is what still covers that path.
 *
 * ⚠️ IT RUNS BEFORE AUTHENTICATION, so an oversized unauthenticated POST gets this 413 instead of the
 * 401 challenge. Deliberate: the whole value of the check is not paying for the body, and a token
 * lookup is a Postgres round trip. It leaks nothing a client cannot already read off this file's
 * public behaviour, and no real client is bootstrapping discovery with a 12 MB body.
 */
function rejectOversizedRpcBody(request: NextRequest): Response | null {
  const header = request.headers.get('content-length')
  if (header === null) return null

  const declared = Number(header)
  if (!Number.isFinite(declared) || declared <= MCP_MAX_BODY_BYTES) return null

  // Both numbers are the client's own and ours: no path, no tool, no hint of where the second limit
  // is enforced. `id: null` because the body that would have carried the id was never parsed.
  return jsonRpcError(
    413,
    -32600,
    `Request body too large: ${declared} bytes declared, limit ${MCP_MAX_BODY_BYTES} bytes.`
  )
}

/** `60 calls per minute`. The unit map covers the two windows that exist and degrades to seconds
 *  rather than guessing a name for a third one. */
function describeWindow(window: McpRateLimitWindow): string {
  const unit =
    window.seconds === 60
      ? 'minute'
      : window.seconds === 3600
        ? 'hour'
        : `${window.seconds} seconds`
  return `${window.maxCalls} calls per ${unit}`
}

/** `60 calls per minute and 1000 calls per hour`, in the limiter's own window order. */
const RATE_LIMIT_BUDGET = MCP_RATE_LIMIT_WINDOWS.map(describeWindow).join(' and ')

/**
 * ⚠️ THE ONE PLACE THE LIMITS ARE PUBLISHED, AND THAT REVERSES `rate-limit.ts`' DEFAULT.
 *
 * The verdict's `window`/`limit` fields are deliberately kept out of every refusal we send, because a
 * client pacing itself against numbers we intend to change is a client we can no longer change them
 * for. The instructions are the exception on purpose: the audience is the MODEL, before it starts, and
 * a model that knows the budget spreads its calls out, while a model that discovers it by being
 * refused has already spent the budget to find out. `retry-after` on the 429 remains the only thing a
 * client is asked to obey.
 *
 * ★ READ OFF `MCP_RATE_LIMIT_WINDOWS`, never typed here. The whole failure mode of this string is the
 * one the roster comment below records — a sentence that was true when written and silently false
 * afterwards. Tightening the limiter rewrites this sentence in the same commit.
 */
const RATE_LIMIT_SENTENCE =
  `Every tool shares one budget per connection, at most ${RATE_LIMIT_BUDGET}, ` +
  'so batch what you can and never retry a refusal in a loop.'

/**
 * Sent to the client's model alongside the tool list. Short, and only about ordering across tools —
 * per-tool behaviour belongs in the descriptions (`core/mcp/tools.ts`), where a client that ignores
 * `instructions` (several do) still sees it.
 *
 * ⚠️ States the RULE, not the ROSTER. Which tools need an org_id already lives in each tool's JSON
 * Schema `required` array — naming them again here would duplicate that schema and grow with every
 * tool added. It already drifted once: before `get_doc_page` shipped this said "every tool except
 * list_orgs and find_li2_docs needs an org_id", which went silently false the moment `get_doc_page`
 * (tool 9, also org-free) landed. No test reads this string, so the wrong sentence ran live until
 * caught by accident. That is also why there is no SERVER_INSTRUCTIONS-vs-MCP_TOOLS consistency
 * test — stating the rule instead of the roster leaves nothing left to drift.
 *
 * The docs sentence is the F4 lesson written down: the client will not fetch a URL a connector
 * returns, so "answer from the page" and "do not hand over a link" is the behaviour to ask for.
 * ⛔ Its effect on tool-call rates is UNMEASURED — see plan checklist 3e. It is here because the
 * instructions describe the server and were describing half of it, not because a measurement earned
 * it. Do not cite it as a proven lever.
 */
const SERVER_INSTRUCTIONS =
  "Li2 is a link, QR and NFC marketing platform. Tools that act on a customer's own data " +
  'declare org_id as a required parameter; call list_orgs first and use the ids it returns. ' +
  'Before any call that creates, changes or deletes something, name the organization you are ' +
  'about to act in, so the user can stop you if it is the wrong one. ' +
  'An artifact is content Li2 hosts behind its own short link and QR code: serve_url is the ' +
  'address to share with people, and short_url is what the QR encodes. Deleting an artifact does ' +
  'not retire the QR codes already printed — they stay alive and show a taken-down page. ' +
  'Disabling a short link is reversible; deleting one is not and any printed QR goes dead. ' +
  'For a how-to or concept question about Li2 itself, call find_li2_docs and then ' +
  'get_doc_page to read the page — do not answer from memory, and do not hand the user a ' +
  `link instead. ${RATE_LIMIT_SENTENCE}`

/**
 * CORS, on the same reasoning the OAuth machine endpoints use: this endpoint has NO ambient
 * authority. It reads no cookie and no session — the bearer token is the entire credential, and a
 * cross-origin page cannot attach one it does not already hold. Without this, a browser-hosted MCP
 * client dies at the preflight and never even reaches the 401.
 *
 * `access-control-expose-headers` is the load-bearing line: `WWW-Authenticate` is not a
 * CORS-safelisted response header, so without exposing it a browser client reads a bare 401 with no
 * `resource_metadata` and cannot start discovery at all. `retry-after` is on it for the same reason
 * one layer down — a 429 whose `retry-after` the browser hides is a 429 the client cannot obey.
 */
const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers':
    'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'access-control-expose-headers': 'www-authenticate, retry-after, mcp-protocol-version',
  'access-control-max-age': '86400',
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Bearer authentication
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, ...rest] = header.trim().split(/\s+/)
  // RFC 7235 §2.1: the scheme is case-insensitive. Real clients send "Bearer"; some send "bearer".
  if (scheme.toLowerCase() !== 'bearer' || rest.length !== 1) return null
  return rest[0] || null
}

/**
 * The URL the client must fetch to bootstrap. Normally the configured issuer, so it matches the
 * `issuer` inside both `.well-known` documents byte for byte (RFC 8414 §3.3 makes a mismatch fatal).
 *
 * The fallback exists because a challenge without `resource_metadata` is unrecoverable for the
 * client, while a challenge pointing at the request's own origin at least gets discovery started.
 * `getIssuer()` only throws when `NEXT_PUBLIC_APP_BASE_URL` is unset, at which point the deployment
 * is already misconfigured — the fallback buys a working local dev run, not a supported mode.
 */
function resourceMetadataUrl(request: NextRequest): string {
  try {
    return `${getIssuer()}${RESOURCE_METADATA_PATH}`
  } catch {
    log.error('[mcp] NEXT_PUBLIC_APP_BASE_URL is unset — challenging with the request origin')
    return `${request.nextUrl.origin}${RESOURCE_METADATA_PATH}`
  }
}

/**
 * ★ ONE 401 FOR THREE DIFFERENT FAILURES. A token that never existed, one that expired and one that
 * was revoked all produce exactly this response — same status, same header, same body. `mcpOAuthService
 * .validateAccessToken` collapses them to `null` for that reason. Telling them apart would let a
 * caller confirm that a guessed token string was once real, and it buys a client nothing: the
 * recovery is identical in all three cases (refresh, or re-authorize).
 *
 * `error` is omitted when no credential was presented at all — RFC 6750 §3 says a challenge to an
 * unauthenticated request SHOULD NOT carry an error code, and this is the request every client makes
 * first.
 */
function unauthorized(request: NextRequest, presentedCredential: boolean): Response {
  const params = [
    presentedCredential ? 'error="invalid_token"' : null,
    presentedCredential
      ? 'error_description="The access token is invalid, expired, or has been revoked."'
      : null,
    `resource_metadata="${resourceMetadataUrl(request)}"`,
    // Both scopes — see the file header. The user's tick, not this header, decides what is granted.
    `scope="${MCP_SCOPES.join(' ')}"`,
  ].filter(Boolean)

  return jsonRpcError(401, -32001, 'Authentication required. See the WWW-Authenticate header.', {
    'www-authenticate': `Bearer ${params.join(', ')}`,
  })
}

/**
 * A transport-level failure still answers in this endpoint's own dialect: a client that reaches the
 * body at all is a JSON-RPC client. `id: null` per JSON-RPC 2.0 §5 for an error that cannot be
 * attributed to a request. The codes are in the implementation-defined -32000..-32099 range.
 */
function jsonRpcError(
  status: number,
  code: number,
  message: string,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The MCP server
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Strict membership, with no implication that `write` covers `read`.
 *
 * OAuth scopes are not hierarchical and inventing a hierarchy here would quietly widen a grant the
 * user narrowed. The edge it leaves — a client that requests `scope=write` ALONE sees only
 * `create_short_link` and cannot call `list_orgs` to learn an org_id — is real but unreachable in
 * practice: clients take their scope from this endpoint's challenge (`read`) or from
 * `scopes_supported`, and the consent screen can only narrow what was requested (Phase 3a).
 */
function toolsVisibleTo(scopes: McpScope[]) {
  return MCP_TOOLS.filter((tool) => scopes.includes(tool.requiredScope))
}

/**
 * ⛔ THE ONLY THING ALLOWED TO READ THE ARGUMENTS OBJECT FOR LOGGING PURPOSES. See the file header.
 *
 * It returns a UUID or null and can return nothing else — not the raw string, not a truncation of it.
 * A client-supplied string going into a log line is how a password ends up in `/app/logs/app.log`,
 * and it is also how someone injects newlines into a log stream. The UUID test is what makes the
 * output provably harmless: `isUuid` accepts 36 characters from a fixed alphabet, or nothing.
 *
 * A rejected `org_id` logs as `null` rather than failing anything — this is the observability path,
 * and `call-tool.ts` is what decides whether the org is acceptable.
 */
function readOrgIdForLog(args: Record<string, unknown>): string | null {
  const raw = args.org_id
  return typeof raw === 'string' && isUuid(raw) ? raw : null
}

/**
 * `arguments` is optional in the MCP spec and several clients omit it for a no-argument tool, so an
 * absent object is normal traffic, not an error. A non-object one is a broken client; `{}` lets the
 * tool's own validation produce the useful message instead of a type crash.
 */
function toolArguments(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
}

function createServer(claims: McpAccessTokenClaims): Server {
  const identity: McpRateLimitIdentity = { userId: claims.userId, clientId: claims.clientId }
  const server = new Server(serverInfo(), {
    capabilities: { tools: {} },
    instructions: SERVER_INSTRUCTIONS,
  })

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    /**
     * Order is `MCP_TOOLS`' authored order, and that is the deterministic order plan §6b asks for —
     * an array literal, never a Map or object-key walk. It is not alphabetical on purpose:
     * `list_orgs` leads because it is the call every session must make first. Stability matters
     * because clients cache this list and because a stable prefix is a prompt-cache hit for the
     * model behind them.
     *
     * Only the six MCP fields cross. `transport` and `requiredScope` stay behind: `transport.path`
     * is the internal back-hop route and publishing it would hand out a map of `/api/agent/tools/*`.
     *
     * `title` (P0.1) is the fifth and the only one a human ever reads: it is what a consent dialog
     * and a directory listing show in place of `publish_artifact`. `description` is still the
     * model's field — the two are not interchangeable and neither falls back to the other here.
     *
     * `annotations` (wave 4 WP1) is the fourth, and it is the channel the MCP spec puts
     * human-in-the-loop confirmation on: `destructiveHint: true` is how a client knows to ask before
     * `delete_artifact` runs. A `confirm: true` tool ARGUMENT would not be — the model fills that in
     * itself. The object is built from `tool-registry.ts`, never per tool by hand.
     *
     * `outputSchema` (P0.4) is the sixth, and it is a PROMISE: the spec requires a tool that
     * declares one to answer with `structuredContent` that validates against it, which is why
     * `call-tool.ts` attaches that block on every success and never on an error. Sent only when the
     * descriptor has one — an absent key means "no promise", an empty object would mean "an answer
     * with no fields".
     */
    tools: toolsVisibleTo(claims.scopes).map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      ...(tool.outputSchema ? { outputSchema: tool.outputSchema } : {}),
      annotations: tool.annotations,
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name
    const args = toolArguments(request.params.arguments)
    const startedAt = Date.now()
    let reason: string | null = null

    try {
      /**
       * ★ THE METER RUNS HERE, PER CALL — not per HTTP request, and that is measured rather than
       * assumed. The SDK's transport accepts a JSON-RPC ARRAY body and dispatches every element
       * (`webStandardStreamableHttp.js`), so one POST can carry a hundred `tools/call` requests; a
       * counter at the door would charge that hundred as one. The door check in `POST` below stays
       * anyway, because only an HTTP 429 gets a client's transport to actually back off.
       *
       * FIRST, before the tool is even looked up, so that EVERY `tools/call` costs exactly one unit
       * whatever its outcome. Putting it after the scope check would leave "call a tool you were not
       * granted" as a free, unmetered channel.
       */
      const verdict = await consumeMcpRateLimit(identity)
      if (!verdict.allowed) throw rateLimited(verdict.retryAfterSeconds)

      const tool = getMcpTool(name)
      if (!tool) throw unknownTool(name)

      // Hiding is not enforcement: a client that ignores `tools/list` still lands here.
      if (!claims.scopes.includes(tool.requiredScope)) {
        log.warn(
          { tool: name, clientId: claims.clientId, userId: claims.userId },
          '[mcp] call for a tool outside the granted scope'
        )
        throw insufficientScope(name, tool.requiredScope)
      }

      /**
       * ★ Everything on the ORG axis happens past this line, in `call-tool.ts`. It is deliberately
       * NOT here: `org_id` is an untrusted tool argument (plan §4.1), and the membership +
       * entitlement + mint sequence that polices it is the one new enforcement point in the whole
       * architecture. Keeping it in one file is what makes it reviewable.
       */
      return await callTool(tool, args, claims)
    } catch (error) {
      reason = McpToolError.is(error) ? error.reason : 'unhandled'
      return toToolErrorResult(error, { tool: name })
    } finally {
      /**
       * ★ ONE LINE PER TOOL CALL, SUCCESS OR FAILURE — the only place the MCP surface becomes
       * visible in operations. In `finally` so a throw can never skip it.
       *
       * ⛔ THE FIELD LIST IS CLOSED. Adding `args`, `params`, or "just the destination_url" to this
       * object is the bug the file header is about: `create_short_link` can carry a link password.
       * `orgId` comes from `readOrgIdForLog` and nothing else may read `args` here.
       *
       * `info` and not `debug`: production runs pino at `info`, and a per-call record that only
       * exists in development is not observability.
       */
      log.info(
        {
          tool: name,
          orgId: readOrgIdForLog(args),
          userId: claims.userId,
          clientId: claims.clientId,
          status: reason ? 'error' : 'ok',
          reason,
          latencyMs: Date.now() - startedAt,
        },
        '[mcp] tool call'
      )
    }
  })

  return server
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// HTTP
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest): Promise<Response> {
  // FIRST, before the bearer lookup and before the transport touches the stream — see the function.
  const oversized = rejectOversizedRpcBody(request)
  if (oversized) return oversized

  const token = bearerToken(request)
  if (!token) return unauthorized(request, request.headers.has('authorization'))

  /**
   * ★ A TOKEN THAT CANNOT BE OURS DOES NOT GET A DATABASE QUERY (the debt Phase 4a left).
   *
   * Every access token this server has ever issued is built by `issueTokenPair` with
   * `ACCESS_TOKEN_PREFIX` in front of it — one private method, two call sites, no other path writes
   * `mcp_oauth_tokens`. So a bearer without that prefix is a probe, a copy-pasted token from some
   * other service, or a client sending its REFRESH token here by mistake, and none of those is worth
   * a round trip to Postgres. Under a flood of junk bearers that round trip is the whole cost.
   *
   * ⚠️ THE FAILURE MODE IF THIS IS EVER WRONG IS INVISIBLE: a valid token rejected here produces the
   * same 401 as an invalid one, so the symptom would be "a client cannot connect" with a healthy
   * grant sitting in the database and nothing in the log. That is why the prefix is a constant
   * exported from the issuer rather than a string typed twice.
   *
   * It leaks nothing. The 401 is byte-identical to the one an unknown token gets, and while the
   * prefix check is faster than a database lookup, the prefix is not a secret — it is the visible
   * first ten characters of the token the client already holds.
   */
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) return unauthorized(request, true)

  /**
   * ⚠️ A DATABASE FAILURE HERE MUST NOT BECOME A 401. `validateAccessToken` returns null for a token
   * that is genuinely bad, but it THROWS if Postgres is unreachable — and answering that with a
   * challenge would tell a client holding a perfectly good token to throw it away and drag the user
   * through consent again, turning a blip into a mass re-authorization. 503 is the honest answer and
   * the one clients retry.
   */
  let claims: McpAccessTokenClaims | null
  try {
    claims = await mcpOAuthService.validateAccessToken(token)
  } catch (error) {
    log.error({ err: error }, '[mcp] bearer validation failed')
    return jsonRpcError(503, -32002, 'The Li2 MCP server is temporarily unavailable.')
  }
  if (!claims) return unauthorized(request, true)

  /**
   * ★ THE DOOR CHECK — read-only, and it is the HALF OF THE LIMITER A CLIENT CAN ACT ON.
   *
   * The meter itself runs per tool call inside `createServer` (see the comment there for why). This
   * check charges nothing; it only asks "is this connection already over the line", and if it is,
   * answers with a real HTTP **429 + `retry-after`**. That distinction matters: an MCP client's
   * transport backs off on an HTTP status, whereas a tool-result error is read by the model, and no
   * model waits 47 seconds because it was asked to.
   *
   * After authentication, deliberately: the limiter keys on `(user_id, client_id)` and neither exists
   * until the bearer is resolved. The cost is that an unauthenticated flood still reaches
   * `validateAccessToken` — the prefix guard above is what blunts that, and an IP-level cap on
   * anonymous traffic belongs at the edge, not here.
   */
  const doorVerdict = await peekMcpRateLimit({ userId: claims.userId, clientId: claims.clientId })
  if (!doorVerdict.allowed) {
    log.warn(
      {
        userId: claims.userId,
        clientId: claims.clientId,
        window: doorVerdict.window,
        limit: doorVerdict.limit,
      },
      '[mcp] request refused at the door — rate limit'
    )
    return jsonRpcError(
      429,
      -32003,
      `Too many requests. Retry in ${doorVerdict.retryAfterSeconds} seconds.`,
      { 'retry-after': String(doorVerdict.retryAfterSeconds) }
    )
  }

  const server = createServer(claims)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    /**
     * ⚠️ LOAD-BEARING, AND NOT FOR THE REASON IT LOOKS LIKE. It is what makes `handleRequest` resolve
     * only after the whole response body is buffered — which is the only reason closing the server in
     * `finally` is safe. Turn it off for streaming and every response is truncated at the `finally`;
     * the fix would be to move the close after the stream ends, not to keep this flag and hope.
     */
    enableJsonResponse: true,
    /**
     * See `allowedOrigins` above for why this is origin-only and why a missing Origin passes. The
     * SDK answers a mismatch with its own 403 + JSON-RPC error body, before any handler runs.
     */
    enableDnsRebindingProtection: true,
    allowedOrigins: allowedOrigins(),
  })

  try {
    await server.connect(transport)
    return withCors(await transport.handleRequest(request))
  } finally {
    await server.close()
  }
}

/**
 * The SDK builds its own `Response`, so CORS has to be re-applied to it. Rebuilt rather than mutated
 * because a `Response` returned by library code carries no promise about a writable header guard.
 */
function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(response.body, { status: response.status, headers })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/** Stateless has no stream to resume and no session to delete (plan §8, and the 2026-07-28 draft
 *  removes the GET endpoint outright — §6b). */
export async function GET(): Promise<Response> {
  return methodNotAllowed()
}

export async function DELETE(): Promise<Response> {
  return methodNotAllowed()
}

function methodNotAllowed(): Response {
  return jsonRpcError(
    405,
    -32000,
    'Method not allowed. This MCP server is stateless (POST only).',
    { allow: 'POST' }
  )
}
