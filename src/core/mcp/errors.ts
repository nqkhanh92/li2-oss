/**
 * ============================================================================
 * MCP tool errors — everything a third-party client is ever allowed to learn (Phase 4).
 * ============================================================================
 *
 * Mirrors li2-ai's `BackHopError` posture (`app/execution/registry.py`, `write_tools.py`): li2-app
 * is the authority, its HTTP status is the only signal we read, and the caller gets a message shaped
 * for the *status bucket* — never li2-app's own body. We do not forward upstream bodies at all:
 * they carry i18n keys, internal ids and occasionally stack-adjacent detail, and a third-party agent
 * has no use for any of it.
 *
 * ONE controlled exception (wave 3, `artifact-refusals.ts`): for `publish_artifact` / `update_artifact`
 * the 4xx body's `i18nMessage.key` and the NUMBERS in `i18nMessage.params` are read, so a quota
 * refusal can say "used 28.3 MB of 30 MB". We read a CODE and compose our own sentence; the
 * upstream `message` still never crosses, and the other tools' bodies are still never read.
 *
 * ★ THE ONE RULE THAT IS SECURITY, NOT ERGONOMICS (plan §4.1, §7 risk row, Phase 6 smoke 4):
 * `orgAccessDenied()` is returned for an org that does not exist AND for an org the user is not a
 * member of. One string, one code, no timing branch worth measuring. Splitting them would turn
 * every tool into a membership oracle over the whole `organizations` table. `orgNotEntitled()` is
 * separate ONLY because it is unreachable until membership has already been proven, and `list_orgs`
 * publishes the same fact to that same user anyway — so 4b MUST check membership FIRST and
 * entitlement SECOND. Reversing that order re-opens the leak.
 *
 * ⚠️ WHY `McpToolError.is()` AND NOT `instanceof` — this is the 3b lesson, not a style choice. Next
 * builds one webpack bundle per route, so a class exported from a shared module exists as SEVERAL
 * distinct class objects at runtime. `instanceof` compares identity between them and returns false
 * the moment an error is constructed in one bundle and checked in another — which is exactly what a
 * `globalThis`-cached singleton (the app has several, including `_mcpOAuthService`) causes. In 3a/3b
 * that silently turned every OAuth error into a 500 and only a real dev server with two different
 * route warm-up orders revealed it. vitest CANNOT catch it: it loads each module exactly once.
 *
 * Errors are returned as MCP tool RESULTS (`isError: true`), not as JSON-RPC protocol errors. That
 * is the spec's intent and it is what makes the model able to react — a protocol error aborts the
 * call for the client's plumbing, an `isError` result lands in the model's context where it can read
 * "you need a different org_id" and fix itself. Every message below is written to be read by a
 * model: it says what happened and what to do next, and never "contact support".
 */
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'mcp-tool-error' })

/**
 * The bucket, for OUR logs. It is deliberately not sent to the client — a machine-readable failure
 * taxonomy is a v2 concern and today it would only invite clients to branch on strings we may want
 * to change.
 */
export type McpToolErrorReason =
  | 'unknown_tool'
  | 'insufficient_scope'
  | 'invalid_arguments'
  | 'org_access_denied'
  | 'org_not_entitled'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rejected'
  | 'rate_limited'
  | 'upstream_unavailable'

/**
 * The MCP `CallToolResult` shape for a failure. Structural on purpose: the SDK's own type is built
 * from its nested zod 4 and must never be imported into app code (Phase 0.1).
 *
 * ⚠️ A `type`, not an `interface`, and that is not cosmetic. The SDK's handler return type is a
 * union whose open member is `{[x: string]: unknown; _meta?: …}`. TypeScript gives an implicit index
 * signature to a type alias but NOT to an interface, so declaring this as an interface makes it
 * unassignable — it falls through to the task-result member and fails on a missing `task`.
 */
export type McpToolErrorResult = {
  isError: true
  content: { type: 'text'; text: string }[]
}

const MCP_TOOL_ERROR = Symbol.for('li2.mcp.McpToolError')

/** Thrown by the tool layer, caught at the route, and turned into an `isError` result. */
export class McpToolError extends Error {
  readonly reason: McpToolErrorReason
  /** The only text that crosses the boundary. Assume the model will quote it to the user verbatim. */
  readonly clientMessage: string

  constructor(reason: McpToolErrorReason, clientMessage: string) {
    super(`${reason}: ${clientMessage}`)
    this.name = 'McpToolError'
    this.reason = reason
    this.clientMessage = clientMessage
    // Non-enumerable so it never lands in a log line or `JSON.stringify`; defined here rather than
    // as a class field because a computed symbol key is not valid in a property declaration.
    Object.defineProperty(this, MCP_TOOL_ERROR, { value: true, enumerable: false })
  }

  /** The bundle-proof replacement for `instanceof` — see the file header before changing this. */
  static is(value: unknown): value is McpToolError {
    return typeof value === 'object' && value !== null && MCP_TOOL_ERROR in value
  }

  toToolResult(): McpToolErrorResult {
    return { isError: true, content: [{ type: 'text', text: this.clientMessage }] }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Factories — one per thing that can go wrong before or instead of a back hop
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Echoing the name back is safe: the client supplied it, so it learns nothing it did not send. */
export function unknownTool(name: string): McpToolError {
  return new McpToolError(
    'unknown_tool',
    `There is no Li2 tool called "${name}". Call tools/list to see what this connection offers.`
  )
}

/**
 * Reached only when a client calls a tool that `tools/list` did not show it (plan Phase 4: scope is
 * enforced by HIDING). So this is a client bug or a probe, not a normal path — hence the warn log.
 *
 * A future step-up flow would answer the HTTP request with 403 + `WWW-Authenticate: Bearer
 * error="insufficient_scope", scope="read write"` instead, letting the client re-consent in place
 * (plan §5). v1 does not: a JSON-RPC POST may carry several calls, so one HTTP status cannot honestly
 * describe them, and telling the model to reconnect is already actionable.
 */
export function insufficientScope(toolName: string, requiredScope: string): McpToolError {
  return new McpToolError(
    'insufficient_scope',
    `"${toolName}" needs "${requiredScope}" access and this Li2 connection was not granted it. ` +
      'The user must reconnect Li2 and allow it; nothing you can change in the arguments will help.'
  )
}

/** `detail` is written BY US at the call site — never a raw validator dump, never upstream text. */
export function invalidArguments(detail: string): McpToolError {
  return new McpToolError('invalid_arguments', detail)
}

/**
 * ★ THE GENERIC ORG FAILURE. Read the file header before adding a second variant: "no such org" and
 * "you are not a member" MUST stay indistinguishable from outside.
 */
export function orgAccessDenied(): McpToolError {
  return new McpToolError(
    'org_access_denied',
    'That organization is not available to this Li2 connection. Call list_orgs and pass one of the ' +
      'ids it returns — do not guess an id or reuse one the user typed without checking it.'
  )
}

/**
 * Our OWN limiter refused this call (Phase 5) — not the back hop's, which is `backHopError(429)`.
 *
 * Reachable only inside a JSON-RPC BATCH: a client that is already over the line is refused at the
 * door with an HTTP 429 and never gets here, but a single POST carrying many `tools/call` entries is
 * let in on one door check and then meters each element. So this is the message for calls 61..100 of
 * a batch of 100.
 *
 * `retryAfterSeconds` is spelled out in the text because this path has no HTTP status to hang a
 * `retry-after` header on — the model reading it is the only thing that can pace the client here.
 */
export function rateLimited(retryAfterSeconds: number): McpToolError {
  return new McpToolError(
    'rate_limited',
    `This Li2 connection has made too many tool calls. Wait about ${retryAfterSeconds} seconds and ` +
      'try again — do not retry immediately, and do not split the work across organizations, which ' +
      'shares the same limit. Tell the user what you were doing when it happened.'
  )
}

/** Safe to be specific: unreachable until membership is proven, and `list_orgs` badges say the same. */
export function orgNotEntitled(): McpToolError {
  return new McpToolError(
    'org_not_entitled',
    "This organization's Li2 plan does not include MCP access, so its data cannot be reached from " +
      'here. list_orgs shows which of the user\'s organizations do have it.'
  )
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Back-hop status mapping
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Map an `/api/agent/tools/*` response status onto something a model can act on.
 *
 * Buckets follow li2-ai's `_csl_friendly_error` reasoning, because the upstream is the same one:
 * every 4xx here is PRE-COMMIT (li2-app runs scope, permission, plan and URL checks before it
 * inserts anything), so it is safe to describe the problem without risking a retry that
 * double-creates. What differs between buckets is whether a retry can ever help.
 *
 * `status === null` means the fetch itself failed — DNS, connection reset, timeout.
 *
 * 401 is the odd one: the back hop authenticates with a PASETO *we* just minted, so a 401 is OUR
 * bug (bad key, clock skew, a claim the middleware rejects), never the client's. Saying
 * "unauthorized" would send the user off to re-authorize an OAuth grant that is perfectly fine, so
 * it is reported as a transient server-side failure and logged loudly instead.
 */
export function backHopError(status: number | null, context: { tool: string }): McpToolError {
  if (status === null) {
    log.error(context, '[mcp] back hop network failure')
    return upstreamUnavailable()
  }

  if (status === 401) {
    log.error(context, '[mcp] back hop rejected our own minted token — this is a server-side bug')
    return upstreamUnavailable()
  }

  if (status === 403) {
    return new McpToolError(
      'forbidden',
      'Li2 refused this action: the user\'s role in that organization, or the organization\'s plan, ' +
        'does not allow it. Retrying will not help — report this to the user rather than trying again.'
    )
  }

  if (status === 404) {
    return new McpToolError(
      'not_found',
      'Li2 has no record matching that request. Check the id or slug — get_top_links returns ids ' +
        'that are safe to pass straight to get_link_details.'
    )
  }

  if (status === 409) {
    return new McpToolError(
      'conflict',
      'Li2 rejected this because it collides with something that already exists — a slug already in ' +
        'use is the usual cause. Try a different value.'
    )
  }

  if (status === 429) {
    return new McpToolError(
      'rate_limited',
      'Li2 is rate limiting this account. Wait a little before calling again.'
    )
  }

  if (status >= 400 && status < 500) {
    return new McpToolError(
      'rejected',
      'Li2 rejected these arguments. Re-read the tool\'s schema and description — note the rules ' +
        'that the schema cannot express, such as utm_source being required once any UTM field is set.'
    )
  }

  log.error({ ...context, status }, '[mcp] back hop returned a server error')
  return upstreamUnavailable()
}

/** Also the landing place for anything unexpected — see `toToolErrorResult`. */
export function upstreamUnavailable(): McpToolError {
  return new McpToolError(
    'upstream_unavailable',
    'Li2 could not complete this call right now. This is a problem on the Li2 side, not with your ' +
      'arguments — try again in a moment.'
  )
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The catch-all
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The single place an exception becomes a tool result.
 *
 * Anything that is not an `McpToolError` is OUR bug and its `message` may name a table, a column or
 * a file path. It is logged in full and replaced wholesale — the client gets `upstreamUnavailable()`
 * and learns nothing about the shape of the system behind the endpoint.
 */
export function toToolErrorResult(error: unknown, context: { tool: string }): McpToolErrorResult {
  if (McpToolError.is(error)) {
    // Already-shaped failures are expected traffic, not incidents; keep them at debug so a client
    // probing tool names cannot fill the error log.
    log.debug({ ...context, reason: error.reason }, '[mcp] tool error')
    return error.toToolResult()
  }
  log.error({ ...context, err: error }, '[mcp] unhandled tool failure')
  return upstreamUnavailable().toToolResult()
}
