/**
 * AI Agent Platform — the first WRITE tool (Phase 3a, task-3a.0).
 *
 * POST /api/agent/tools/create-short-link
 * Behind withAgentAuth(['write'], ...) — the write scope is enforced STRUCTURALLY by the middleware
 * before this handler runs (a ['read']-only token gets 403 here, never touching a service). This route
 * is pure orchestration: it maps the tool input to createTouchPoint / bulkCreateFromDestinations and
 * returns the result. NO new business logic (§2/§10). Permission, plan limits, URL validation, and the
 * slug-taken (23505) mapping all live in the service and are surfaced by withAgentAuth's error handler.
 *
 * TWO MODES (L10): single → createTouchPoint (only path that takes slug/name); bulk →
 * bulkCreateFromDestinations (URL-only, all-or-nothing atomic INSERT). See agent-tools.ts for the
 * shared contract and BULK_MAX rationale.
 *
 * Cross-repo contract (must match the Pydantic model in li2-ai, task-3a.2):
 *   response .data.created = [{ id, short_url, slug, name }, ...]
 *
 * ★ SL-3 ADDED THE ONLY BRANCH IN HERE: an optional `idempotency_key` makes the create claimable, so
 * a retry after a lost response replays the links already created instead of making a second set.
 * All of the rule lives in `core/helpers/artifact-idempotency.ts` (namespace `short_link`, so a key
 * can mean one thing for a publish and another for a link); this file calls `claim` before the
 * service and exactly one of `complete`/`release` after it. A call WITHOUT a key never touches
 * Redis — ordinary creating must not go down with the cache, and the UI shares the service beneath.
 *
 * ⚠️ THE REDIS VALUE HOLDS THE IDS JOINED BY A COMMA, not one id, because `bulk` creates N links in
 * one atomic INSERT and a replay has to answer for all of them. `artifact-idempotency.ts` stores an
 * opaque string, which is why it needs no change to carry this.
 *
 * ⚠️ THE OLD CONTRACT IS UNTOUCHED. A replay answers 200 (nothing was created) with the SAME
 * `.data.created` list plus `idempotent_replay: true`; a fresh create still answers 201 with
 * `.data.created` alone, so every existing caller reads it exactly as before.
 *
 * nodejs runtime: withAgentAuth -> paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { touchPointService } from '@/core/services/touch-point.service'
import {
  claimIdempotency,
  completeIdempotency,
  releaseIdempotency,
} from '@/core/helpers/artifact-idempotency'
import { redis } from '@/infrastructure/cache/redis'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { TouchPointContentType } from '@/features/touch-points/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import {
  createShortLinkInputSchema,
  type CreatedLink,
  type CreatedLinksReplay,
} from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

// One projection for both modes so single/bulk output can never drift. `slug` is nullable in the DB
// (a link with no custom slug) → normalize to null.
type TouchPointRow = { id: string; short_url: string; slug: string | null; name: string }
const toCreatedLink = (tp: TouchPointRow): CreatedLink => ({
  id: tp.id,
  short_url: tp.short_url,
  slug: tp.slug ?? null,
  name: tp.name,
})

/** The ids of one claim, as they are stored in and read back out of the one Redis value. */
const IDS_SEPARATOR = ','

/**
 * The replay answer: the links the key already created, read back FRESH rather than cached, so a
 * link that has since been renamed or retargeted is reported as it is NOW.
 *
 * ⚠️ A LINK DELETED AFTERWARDS GETS ITS OWN i18n KEY, and that is not cosmetic. `getByIdForOrg`
 * answers null for a deleted row, which the MCP mapper would otherwise turn into either nothing at
 * all or "check the id" — about an id the caller never sent. The caller's real options are to drop
 * the key or pick a new one, and only a distinct key can say that. CREATING AGAIN INSTEAD IS NOT AN
 * OPTION: the one promise of a key is that it names at most one set of links, and a key that
 * silently creates again after a delete breaks it for every caller that retries on a schedule.
 *
 * All-or-nothing on purpose: `bulk` is one atomic INSERT, so a partial list would describe a state
 * the first call never produced.
 */
async function replayedCreate(orgId: string, storedIds: string): Promise<CreatedLinksReplay> {
  const ids = storedIds.split(IDS_SEPARATOR).filter((id) => id !== '')
  const rows = await Promise.all(ids.map((id) => touchPointService.getByIdForOrg(orgId, id)))

  if (ids.length === 0 || rows.some((row) => !row)) {
    throw new NotFoundError('The links this idempotency_key created no longer exist', {
      key: 'agent:short_link.idem_link_gone',
    })
  }

  return {
    created: rows.map((row) => toCreatedLink(row as unknown as TouchPointRow)),
    idempotent_replay: true,
  }
}

// Write scope is enforced structurally by withAgentAuth(['write'], ...) before this handler runs.
export const POST = withAgentAuth(['write'], async (request: NextRequest, { context, agent }) => {
  const orgId = agent.orgId

  // Re-gate the plan on every call — the mint-time gate only proves the org HAD the feature when
  // the (15-min) token was issued; a downgrade mid-token must stop the write immediately. Stays
  // AHEAD of the body parse: an unentitled org must be refused before its input is even looked at.
  // Which feature depends on the caller: chat panel → AI_CHAT, MCP client → MCP_ACCESS.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const body = await request.json().catch(() => null)
  const parsed = createShortLinkInputSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestError() // 400, not 500 — user error

  const idempotencyKey = parsed.data.idempotency_key

  // SL-3 — claim BEFORE the service, so two retries arriving together cannot both create. A call
  // with no key skips this entirely and is not idempotent, exactly as the tool advertises.
  if (idempotencyKey) {
    const claim = await claimIdempotency(redis, orgId, idempotencyKey, 'short_link')
    // 200, not 201: nothing was created by this call, and the status is the second place the answer
    // says so (the first is `idempotent_replay`).
    if (claim.outcome === 'replay')
      return APIResponse.ok({ data: await replayedCreate(orgId, claim.artifactId) })
  }

  let created: CreatedLink[]
  try {
    created = await createLinks(parsed.data, orgId, context.userId)
  } catch (error) {
    // Hand the key back: a plan limit or a taken slug is something the user fixes and the agent then
    // retries — with the same key, because it has no reason to mint a new one. Leaving the claim in
    // place would answer 409 for a day. `release` never throws, so the real error is what reaches
    // the error handler.
    if (idempotencyKey) await releaseIdempotency(redis, orgId, idempotencyKey, 'short_link')
    throw error
  }

  if (idempotencyKey)
    await completeIdempotency(
      redis,
      orgId,
      idempotencyKey,
      created.map((link) => link.id).join(IDS_SEPARATOR),
      'short_link'
    )

  // 201 Created (L11) — REST-correct for a create. li2-ai's _back_hop_post accepts 2xx (200|201)
  // and reads .data.created. Do NOT downgrade to 200 to fit the read-tool's ==200 policy.
  return APIResponse.created({ data: { created } })
})

/**
 * The two modes, unchanged from 3a/3b and lifted into their own function by SL-3 so that the handler
 * above can wrap exactly this call in the claim/release pair — and so the `try` guarding the key
 * cannot accidentally grow to cover the parse or the plan gate, neither of which has a claim to
 * release.
 */
async function createLinks(
  input: ReturnType<typeof createShortLinkInputSchema.parse>,
  orgId: string,
  userId: string
): Promise<CreatedLink[]> {
  if (input.mode === 'single') {
    // STATE 1 → createTouchPoint (the only path that accepts slug/name).
    const d = input
    // Build advanced sub-objects ONLY when present — an absent field must not create an empty
    // access_control/utm_tags (which would trip a plan gate or store an empty object).
    const anyUtm = d.utm_source || d.utm_medium || d.utm_campaign || d.utm_term || d.utm_content
    const anyAccess = d.password != null || d.expires_at != null

    const tp = await touchPointService.createTouchPoint(
      orgId,
      {
        content_type: TouchPointContentType.URL,
        content_value: d.destination_url,
        slug: d.slug,
        name: d.name,
        // 3b: flat tool input → nested shape createTouchPoint expects (B2). Only set when present.
        ...(anyAccess && {
          access_control: {
            ...(d.password != null && { password: d.password }),
            // Date, NOT string — accessControlSchema.expires_at is inferred as Date|null and
            // createTouchPoint does not re-parse (drift-trap #2), so a raw string would flow
            // straight into the DB unconverted.
            ...(d.expires_at != null && { expires_at: new Date(d.expires_at) }),
          },
        }),
        ...(anyUtm && {
          utm_tags: {
            enabled: true, // REQUIRED — createTouchPoint:858 keys the UTM gate + store on enabled.
            overrideable: false, // B2 default (dropped from tool surface).
            ...(d.utm_source != null && { utm_source: d.utm_source }),
            ...(d.utm_medium != null && { utm_medium: d.utm_medium }),
            ...(d.utm_campaign != null && { utm_campaign: d.utm_campaign }),
            ...(d.utm_term != null && { utm_term: d.utm_term }),
            ...(d.utm_content != null && { utm_content: d.utm_content }),
          },
        }),
      },
      userId
    )
    return [toCreatedLink(tp)]
  }

  // STATE 3 → bulkCreateFromDestinations (URL-only, auto short_code, all-or-nothing atomic INSERT).
  const tps = await touchPointService.bulkCreateFromDestinations(orgId, userId, input.destinations)
  return tps.map(toCreatedLink)
}
