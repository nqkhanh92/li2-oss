/**
 * ============================================================================
 * ★★ THE SEAM — every MCP tool call passes through here (plan Phase 4b, §3, §4.1).
 * ============================================================================
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⛔ THIS IS THE ONLY NEW ENFORCEMENT POINT IN THE ENTIRE MCP ARCHITECTURE.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * Every other phase reused an ACL that already existed (plan §1.1). This one does not, and the
 * reason is the multi-org grant (§4.1): the OAuth grant binds to the USER, not to an org, so
 * `org_id` arrives as a TOOL ARGUMENT — client-supplied, model-generated, entirely untrusted. The
 * membership check below is what stands between a third-party agent and every organization in the
 * `organizations` table. Get it wrong and this is cross-tenant data disclosure, not a bug report.
 *
 * The order is not stylistic. It is:
 *   1. shape    — is `org_id` even a UUID (§ "no oracle" below)
 *   2. MEMBERSHIP — is this user in that org, read LIVE from `org_members`
 *   3. entitlement — does that org's plan include MCP_ACCESS
 *   4. mint      — a PASETO for THIS call only, carrying the org we just proved
 *   5. strip     — `org_id` never reaches the back hop
 *   6. back hop  — HTTP, never an import (§3)
 * Membership BEFORE entitlement, always: `errors.ts` explains why reversing them re-opens an
 * existence oracle over every org in the database.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ★ NO ORACLE. FOUR FAILURES, ONE BYTE-IDENTICAL ERROR.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * `org_id` absent · not a UUID · a real org the user is not in · a UUID no org has → all return
 * `orgAccessDenied()`, the same object with the same string. A client must not be able to tell them
 * apart, because "that org exists but you're not in it" is a membership oracle and "that's not a
 * real id" is an existence oracle — and an agent can iterate UUIDs far faster than a human.
 *
 * The UUID pre-check is part of that guarantee, not input hygiene: without it a malformed id reaches
 * Postgres and comes back as a 22P02 cast error, which surfaces as a DIFFERENT tool error and hands
 * the caller exactly the distinction the rest of this file works to deny.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⛔ THE LOOPBACK HTTP HOP IS THE ARCHITECTURE. DO NOT "OPTIMIZE" IT AWAY.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * Calling `touchPointService.createTouchPoint()` directly from here would be a few milliseconds
 * faster and would destroy plan §3: the whole reversibility contract is that moving MCP into its own
 * service is a change of `MCP_BACK_HOP_BASE_URL`, not a rewrite. A direct import makes this file
 * depend on li2-app's service graph, and the extraction becomes a port instead of a config change.
 * The hop also buys correctness for free — `withAgentAuth` + the six routes + `ensurePolicy` +
 * `getPermissionScopeOrThrow` + every plan limit run on the far side EXACTLY as they do for li2-ai,
 * with zero MCP-specific lines. That is the defense in depth §1.1 requires: the mint check above is
 * never the only thing standing between a caller and the data.
 *
 * Exactly three sanctioned exceptions exist and every one of them is `kind: 'mcp-local'` in
 * `tools.ts`: the org check in this file, `list-orgs.ts`, and `find-docs.ts`. The third covers TWO
 * tools — `find_li2_docs` and `get_doc_page` — because they are one file reaching one public origin
 * (plan §4.3); a second docs tool is not a second exception. §3 forbids a fourth.
 */
import { validate as isUuid } from 'uuid'
import { memberRepo } from '@/core/repositories/member.repository'
import { profileRepo } from '@/core/repositories/profile.repository'
import { ensureOrgPlan, getOrganizationPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { mintAgentToken, type AgentScope } from '@/shared/lib/agent/paseto'
import { logger } from '@/infrastructure/logging/logger'
import type { McpToolDescriptor } from './tools'
import type { McpAccessTokenClaims } from '@/core/services/mcp-oauth.service'
import { backHopError, orgAccessDenied, orgNotEntitled, upstreamUnavailable } from './errors'
import { isAlreadyRemovedDelete } from './artifact-refusals'
import { isBodyReadingTool, toolRefusalFor } from './tool-refusals'
import type { DeleteArtifactResult } from '@/shared/schemas/agent-tools'
import { listOrgs } from './list-orgs'
import { findLi2Docs, getDocPage } from './find-docs'

const log = logger.child({ module: 'mcp-call-tool' })

/**
 * A back hop that never answers would hang the client's whole request, and an MCP client has no
 * timeout of its own to fall back on. Matches li2-ai's back-hop timeout.
 */
const BACK_HOP_TIMEOUT_MS = 30_000

/**
 * The MCP success shape. A `type` and not an `interface` for the same reason as
 * `McpToolErrorResult` — the SDK's handler return type is a union with an open member, and
 * TypeScript only gives an implicit index signature to a type alias.
 *
 * ⭐ P0.4 — `structuredContent` IS NOW SENT, and the text block stays. v1 sent only the text block
 * because it published no `outputSchema`, and the spec ties the two together; every tool publishes
 * one now (`tools.ts`), so the spec REQUIRES the structured block on a success. Both travel because
 * the spec also asks for the text form as a backward-compatible mirror: an older client that reads
 * only `content` is unaffected, a newer one validates `structuredContent` against the schema, and a
 * model sees the same JSON either way.
 */
export type McpToolResult = {
  content: { type: 'text'; text: string }[]
  structuredContent?: Record<string, unknown>
}

/**
 * ⚠️ `structuredContent` MUST BE A JSON OBJECT. Every tool's payload is one today — each
 * `outputSchema` is object-rooted, and `backHop` only ever returns `.data` from a route that builds
 * an object — but a future tool answering a bare array or a string would silently ship a block that
 * violates its own schema, so a non-object payload travels as text ONLY. That is the degradation the
 * spec allows; sending `{"0": …}` or a wrapper key no schema mentions is not.
 *
 * ⛔ AND NEVER ON AN ERROR. `toToolErrorResult` is a different function and stays that way: an error
 * payload has nothing to do with the tool's `outputSchema`, so attaching it would hand a validating
 * client a guaranteed failure on the one path where it most needs to read the message.
 */
function toToolResult(payload: unknown): McpToolResult {
  const content = [{ type: 'text' as const, text: JSON.stringify(payload) }]
  const isPlainObject = typeof payload === 'object' && payload !== null && !Array.isArray(payload)
  if (!isPlainObject) return { content }
  return { content, structuredContent: payload as Record<string, unknown> }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The back-hop base URL
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ★ THE EXTRACTION SWITCH (plan §3). Point it elsewhere and the tool layer is talking to a different
 * deployment; nothing else in this file changes.
 *
 * ⛔ IT IS NEVER DERIVED FROM THE INCOMING REQUEST. `request.nextUrl.origin` would be tempting — it
 * needs no config and is always "the app's own origin" — but it is built from the `Host` header,
 * which the caller controls. A forged `Host` would send a PASETO we just minted, for a real user and
 * a real org, to a server of the attacker's choosing. Config or nothing.
 */
function backHopBaseUrl(): string {
  const configured = process.env.MCP_BACK_HOP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL
  if (!configured) {
    throw new Error(
      '[mcp/call-tool] neither MCP_BACK_HOP_BASE_URL nor NEXT_PUBLIC_APP_BASE_URL is set'
    )
  }
  return configured.replace(/\/+$/, '')
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Step 1-3: authorize the client-supplied org
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Duck-typed, NOT `instanceof BaseError` — the 3b lesson applied preventively. Next builds one
 * bundle per route, so a shared error class exists as several distinct class objects at runtime and
 * `instanceof` silently returns false the moment the thrower and the checker are in different
 * bundles (in 3a/3b that turned every OAuth error into a 500). Here the throw crosses
 * `plans.ts` → this file, which today is one bundle — but "today" is exactly what changed under 3b.
 * A numeric `status` is `BaseError`'s distinguishing field and is bundle-proof; a driver error
 * (PostgrestError: `code`/`details`/`hint`) does not have one, so a real outage still propagates.
 * vitest cannot catch a regression here — it loads each module exactly once.
 */
function isDomainError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { status?: unknown }).status === 'number'
  )
}

interface AuthorizedOrg {
  orgId: string
  /** Informational on the back hop, but a REQUIRED PASETO claim — see `resolveMintIdentity`. */
  planKey: string
  email: string
}

/**
 * Membership, read LIVE on every single call.
 *
 * ⚠️ `memberRepo.isMemberOfOrg` and NOT `ensureOrgMember`, and the difference is load-bearing.
 * `ensureOrgMember` goes through `getUserOrgPermissions`, which caches the user's permissions in
 * Redis for 30 minutes. That cache is correct for the browser, where it saves a query per page —
 * but here it would mean a user removed from an org keeps MCP access to it for up to half an hour,
 * breaking plan §4.1's promise that "an org the user leaves is unreachable on the next call" and
 * Phase 6 smoke test 7. This is a direct, uncached `org_members` read for that reason alone. Do not
 * "reuse the existing helper".
 */
async function authorizeOrg(
  args: Record<string, unknown>,
  claims: McpAccessTokenClaims
): Promise<AuthorizedOrg> {
  const raw = args.org_id

  // Shape. Absent, wrong type, and malformed all land on the same error as "not a member" — see the
  // no-oracle section in the file header. This also keeps a malformed id away from Postgres, whose
  // 22P02 would otherwise be a distinguishable outcome.
  if (typeof raw !== 'string' || !isUuid(raw)) {
    log.debug(
      { userId: claims.userId, clientId: claims.clientId },
      '[mcp] org_id failed the shape check'
    )
    throw orgAccessDenied()
  }
  const orgId = raw

  const isMember = await memberRepo.isMemberOfOrg(orgId, claims.userId)
  if (!isMember) {
    // WARN, not debug: a model that guesses an org id once is noise, but a client walking ids is
    // exactly the attack §7 names and this is the only line that can ever show it.
    log.warn(
      { userId: claims.userId, clientId: claims.clientId, orgId },
      '[mcp] tool call for an org the user is not a member of'
    )
    throw orgAccessDenied()
  }

  // Entitlement, only now that membership is proven. `ensureOrgPlan` is the app's canonical gate and
  // is called rather than re-implemented, so MCP can never drift from how the feature is sold.
  try {
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.MCP_ACCESS)
  } catch (error) {
    // A domain error here is a PlanError ("no mcp_access") or an AppError ("no plan row
    // resolvable"). Both mean the same thing to the caller — this org cannot be reached from MCP —
    // and both must be a clean tool error, never a 500. Anything else (Redis down, a driver
    // throwing) is NOT an entitlement answer and must not be reported as one, so it propagates.
    if (!isDomainError(error)) throw error
    log.info({ orgId, reason: (error as Error).name }, '[mcp] org is not entitled to MCP access')
    throw orgNotEntitled()
  }

  return { orgId, ...(await resolveMintIdentity(orgId, claims.userId)) }
}

/**
 * The two claims the grant tables cannot supply (plan §1.3).
 *
 * `email` is NOT inert: `withAgentAuth` copies it straight into `AuthContext.email`, where services
 * and request logs read it. `plan` IS inert on the back hop but is a required field of
 * `AgentClaims`, and widening either to optional is forbidden — li2-ai depends on both.
 *
 * Fetched together because `email` and the plan are independent lookups.
 *
 * ⚠️ This does NOT reuse the plan `ensureOrgPlan` resolved one line up — both call
 * `getOrganizationPlan`, and only its inner `getUserPlan` is Redis-cached; the `organizations` row
 * lookup in front of it is not (`shared/lib/plan/plans.ts`). Every tool call therefore pays two
 * uncached round trips for the same org. Known and left alone on purpose: the fix belongs in
 * `plans.ts`, not here, and this seam is the one part of the MCP surface whose behaviour was proven
 * by attack measurement on a live server — it does not get perturbed to save milliseconds.
 */
async function resolveMintIdentity(
  orgId: string,
  userId: string
): Promise<{ planKey: string; email: string }> {
  const [orgPlan, email] = await Promise.all([
    getOrganizationPlan(orgId),
    profileRepo.findEmailById(userId),
  ])

  if (!email) {
    // Membership already proved this user has an `org_members` row, so a missing profile is a data
    // inconsistency, not a normal path. It is not worth failing a working call over a claim the back
    // hop only logs — record it loudly and mint with an empty string.
    log.error({ userId }, '[mcp] no profile email for a user with an active MCP grant')
  }

  return { planKey: orgPlan?.plan_key ?? 'unknown', email: email ?? '' }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Step 4-6: mint, strip, hop
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function mintForCall(org: AuthorizedOrg, claims: McpAccessTokenClaims): string {
  const { token } = mintAgentToken({
    org_id: org.orgId,
    user_id: claims.userId,
    email: org.email,
    plan: org.planKey,
    // The grant's scopes, replayed verbatim (plan §4). `withAgentAuth` enforces the per-route scope
    // structurally on the far side, so this stays the single description of what was consented to
    // rather than a second, drift-prone derivation from the tool's own `requiredScope`.
    scopes: claims.scopes as AgentScope[],
    // ⚠️ REQUIRED by `AgentClaims` and MEANINGLESS here. MCP customers pay for their own model
    // tokens (plan §0) — nothing on this path meters a budget. Phase 5's rate limit is the cap that
    // actually applies. Do not "fix" this to a real number; that would imply metering that does not
    // exist.
    ai_budget: 0,
    // ★ The claim the whole of Phase 1b exists for: it routes the six tool routes' `ensureOrgPlan`
    // onto MCP_ACCESS instead of AI_CHAT. Drop it and every MCP call silently gates on the chat
    // entitlement.
    surface: 'mcp',
    // ★ Carried so a back-hop route can write "this agent did it" into an audit row (WP1 §5).
    // Informational: nothing on the far side authorizes on it, and `withAgentAuth` exposes it as
    // `agent.clientId` for that single purpose.
    client_id: claims.clientId,
    // No `entitlements`: it is optional and only li2-ai reads it (at propose time, before its
    // approval card). These tokens never reach li2-ai, and the advanced-field gates that matter run
    // inside `createTouchPoint` on the back hop regardless.
  })
  return token
}

/**
 * ★ `org_id` DIES HERE. It is an MCP-layer concept: on the back hop the org travels in the PASETO,
 * so `/api/agent/tools/*` neither expects nor tolerates it. `create-short-link` parses its body with
 * a Zod union whose branches are `.strict()`, so a leftover `org_id` is an instant 400 — which makes
 * that tool the honest test of this line (Phase 6 / attack 7). The five read tools would merely
 * ignore an extra query param, so they cannot prove it.
 */
function stripOrgId(args: Record<string, unknown>): Record<string, unknown> {
  // An explicit `delete` on a copy rather than a rest-destructure: the discarded binding reads as an
  // accident (and lints as one), while this line says what it is doing.
  const forwarded = { ...args }
  delete forwarded.org_id
  return forwarded
}

function buildBackHopRequest(
  tool: McpToolDescriptor,
  args: Record<string, unknown>
): { url: string; init: RequestInit } {
  const transport = tool.transport
  if (transport.kind !== 'back-hop') {
    throw new Error(`[mcp/call-tool] ${tool.name} has no back-hop transport`)
  }

  const forwarded = stripOrgId(args)
  const base = `${backHopBaseUrl()}${transport.path}`

  if (transport.method === 'GET') {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(forwarded)) {
      // An omitted optional argument must stay omitted: the routes' Zod schemas apply defaults for
      // an ABSENT key but would have to parse the string "undefined" for a present one.
      if (value === undefined || value === null) continue
      search.set(key, String(value))
    }
    const query = search.toString()
    return { url: query ? `${base}?${query}` : base, init: { method: 'GET' } }
  }

  return {
    url: base,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forwarded),
    },
  }
}

async function backHop(
  tool: McpToolDescriptor,
  args: Record<string, unknown>,
  token: string
): Promise<unknown> {
  const { url, init } = buildBackHopRequest(tool, args)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(BACK_HOP_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (error) {
    log.error({ err: error, tool: tool.name }, '[mcp] back hop fetch threw')
    throw backHopError(null, { tool: tool.name })
  }

  if (!response.ok) {
    // The 4xx body is read for the ARTIFACT and SHORT-LINK tools, and only its
    // `i18nMessage.key/params` are ever looked at (`tool-refusals.ts`): a quota refusal has to carry
    // numbers, and the status bucket alone would tell the model the wrong cause. The analytics and
    // docs tools never read the body — their behaviour is the pre-wave-3 one by construction, not by
    // a `null` return. SL-0 widened the LIST, not what is read from a body.
    const body = isBodyReadingTool(tool.name) ? await response.json().catch(() => null) : null

    /**
     * ★ THE ONE 4xx THAT IS NOT AN ERROR (WP1 §4). A `delete_artifact` on a row that is already a
     * tombstone is a 404 on the back hop — the human-facing DELETE has always answered 404 there and
     * still does — but to the agent it means "the thing you asked for is true". Reporting a failure
     * would make a retried delete look broken and invite the model to try something else.
     *
     * `artifact_id` comes from the ARGUMENTS and not from the body, because there is no DTO left to
     * read: `getForOrg` refuses a tombstone. Safe to echo — the upstream only answers this key for
     * an id that resolved to a row in this org.
     */
    if (isAlreadyRemovedDelete(tool.name, response.status, body)) {
      const result: DeleteArtifactResult = {
        artifact_id: String(args.artifact_id ?? ''),
        status: 'removed',
        already_removed: true,
      }
      return result
    }

    throw (
      toolRefusalFor(tool.name, response.status, body) ??
      backHopError(response.status, { tool: tool.name })
    )
  }

  let payload: { data?: unknown }
  try {
    payload = (await response.json()) as { data?: unknown }
  } catch (error) {
    log.error({ err: error, tool: tool.name }, '[mcp] back hop returned a 2xx that is not JSON')
    throw upstreamUnavailable()
  }

  // Only `.data` crosses. The rest of li2-app's `APIResponse` envelope — `requestId`,
  // `processing_time_ms`, `i18nMessage` — is internal plumbing that would be noise in a model's
  // context and a promise to third parties we never made.
  if (payload.data === undefined) {
    log.error({ tool: tool.name }, '[mcp] back hop 2xx carried no data field')
    throw upstreamUnavailable()
  }
  return payload.data
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Entry point
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Dispatch one `tools/call`.
 *
 * Throws `McpToolError` for anything the caller is allowed to learn about; the route turns that into
 * an `isError` result. Any other throw is OUR bug and `toToolErrorResult` replaces it wholesale.
 *
 * Scope was already checked by the route (and the tool was already hidden from `tools/list` if the
 * grant lacks it) — this function's job is the ORG axis, which is the axis the grant does not cover.
 */
export async function callTool(
  tool: McpToolDescriptor,
  args: Record<string, unknown>,
  claims: McpAccessTokenClaims
): Promise<McpToolResult> {
  if (tool.transport.kind === 'mcp-local') {
    // No local tool sits on the org axis (plan §4.1 / §4.2 / §4.3), so none reaches `authorizeOrg`
    // and none takes an `org_id`. `list_orgs` is bounded by the grant's user; the two docs tools
    // touch no customer data at all — they read a public site the whole internet can read.
    switch (tool.name) {
      case 'list_orgs':
        return toToolResult(await listOrgs(claims.userId))
      case 'find_li2_docs':
        return toToolResult(await findLi2Docs(args))
      case 'get_doc_page':
        return toToolResult(await getDocPage(args))
      default:
        // Unreachable via `tools.ts`, but a new `mcp-local` descriptor with no case here would
        // otherwise fall through to the back hop and 404 confusingly.
        throw new Error(`[mcp/call-tool] no local handler for ${tool.name}`)
    }
  }

  const org = await authorizeOrg(args, claims)
  const token = mintForCall(org, claims)
  return toToolResult(await backHop(tool, args, token))
}

/**
 * The SAME dispatch, for the in-app chat dock instead of an MCP client.
 *
 * ★ Why this is a separate entry point and not a `surface` parameter on `callTool`: the two differ
 * in where the token comes from, not in what they do with it. An MCP call arrives with an OAuth
 * grant and no token — `callTool` must resolve the org from `args.org_id`, check the grant covers
 * it, and MINT. A chat turn arrives already holding an agent PASETO that `withAgentAuth` has just
 * verified, carrying its own `org_id`, `scopes` and `surface: 'chat'`. Re-minting from it would
 * mean tearing a verified token apart and rebuilding it — strictly more code, strictly more places
 * to drop a claim.
 *
 * So the chat path **replays the caller's own token**, and that is the whole safety argument:
 *  - the org cannot be widened, because `org_id` lives in a signature the loop cannot forge;
 *  - `surface: 'chat'` rides along, so every tool route's `ensureOrgPlan` gates on AI_CHAT and not
 *    MCP_ACCESS (see `SURFACE_FEATURE_KEY`) — the exact claim `mintForCall` exists to set for MCP;
 *  - `withAgentAuth` re-checks scopes on the far side, unchanged.
 *
 * ⚠️ `args.org_id` is IGNORED, not trusted and not validated. The model is never shown `org_id`
 * (`chat-tools.ts` strips it from every schema), but a model can emit any key it likes, and a
 * hallucinated one must not reach the wire. `buildBackHopRequest` → `stripOrgId` already drops it;
 * this comment records that the drop is load-bearing here and not merely tidy.
 *
 * `userId` is the chat user's, used only for the three `mcp-local` tools that take no org.
 */
export async function callToolWithAgentToken(
  tool: McpToolDescriptor,
  args: Record<string, unknown>,
  token: string,
  userId: string
): Promise<McpToolResult> {
  if (tool.transport.kind === 'mcp-local') {
    switch (tool.name) {
      case 'list_orgs':
        return toToolResult(await listOrgs(userId))
      case 'find_li2_docs':
        return toToolResult(await findLi2Docs(args))
      case 'get_doc_page':
        return toToolResult(await getDocPage(args))
      default:
        throw new Error(`[mcp/call-tool] no local handler for ${tool.name}`)
    }
  }

  return toToolResult(await backHop(tool, args, token))
}
