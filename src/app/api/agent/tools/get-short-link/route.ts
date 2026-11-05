/**
 * MCP read tool `get_short_link` — the back-hop target (SL-1).
 *
 * GET /api/agent/tools/get-short-link?id=<uuid>
 * GET /api/agent/tools/get-short-link?slug=<slug | short_code | name | A SLUG IT NO LONGER USES>
 *
 * Behind `withAgentAuth(['read'])`; the org comes from the PASETO, never from the query.
 *
 * ★ THE ORDER OF THE THREE CHECKS IS THE DESIGN, not style:
 *   1. READ the row (org-scoped) → a miss is a 404, never a 500 and never a 403.
 *   2. `ensureCanViewTouchPoint` → the per-member / per-collection gate.
 *   3. ONLY THEN refuse an `ARTIFACT`.
 * Step 3 comes last because its refusal names the row's kind, which is more than a member who may
 * not see the row is entitled to learn. And step 2 comes after step 1 because the gate collapses
 * "the row is not there" into "you may not" — `canViewTouchPoint` returns false for a null row
 * (measured on a deleted link: checklist R3 got a 403, not a 404). Reading first is what keeps a
 * wrong id answerable as a wrong id.
 *
 * ⚠️ THE SLUG PATH HAS TWO STEPS AND NEEDS BOTH. `getBySlugForOrg` resolves the CURRENT
 * slug / short_code / name off `touch_points`. It cannot resolve an ending the link used to have —
 * and that is precisely the ending printed on a flyer, because `updateTpSlug` inserts into `slugs`
 * and never deletes the old row (checklist S4). So a miss falls back to the `slugs` table, which
 * remembers every ending, and the id it returns goes through the same org-scoped read and the same
 * gate. No shortcut: the `slugs` lookup is not org-filtered (see `slug.repository.ts`), so the
 * org-scoped `getByIdForOrg` is what refuses another organization's link.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { touchPointService } from '@/core/services/touch-point.service'
import { slugService } from '@/core/services/slug.service'
import { toShortLink, type ShortLinkRow } from '@/core/helpers/short-link-agent-tools'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { TouchPointContentType } from '@/features/touch-points/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { getShortLinkInputSchema } from '@/shared/schemas/agent-tools'
import type { LinkDetailsRow } from '@/core/repositories/touch-point.repository'

export const runtime = 'nodejs'

/** Current slug / short_code / name first, then the historical slugs. See the header. */
async function resolveBySlug(orgId: string, slug: string): Promise<LinkDetailsRow | null> {
  // Throws a 400 `ambiguous_link_name` when the identifier matched the NAME of several links — the
  // refusal mapper turns that into "retry with the id", which is the only thing that can work.
  const current = await touchPointService.getBySlugForOrg(orgId, slug)
  if (current) return current

  const tpId = await slugService.findTpIdBySlug(slug)
  if (!tpId) return null

  return touchPointService.getByIdForOrg(orgId, tpId)
}

export const GET = withAgentAuth(['read'], async (request: NextRequest, { agent, context }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const parsed = getShortLinkInputSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  // 400 covers both "neither key" and "both keys" — the `.refine` that JSON Schema could not carry,
  // which is why the tool's description states the rule in prose as well.
  if (!parsed.success) throw new BadRequestError()

  // 1 — read, org-scoped.
  const row = parsed.data.id
    ? await touchPointService.getByIdForOrg(orgId, parsed.data.id)
    : await resolveBySlug(orgId, parsed.data.slug!)
  if (!row) throw new NotFoundError('Short link not found')

  // 2 — the per-member / per-collection view gate. A ForbiddenError (403) is correct: a short code's
  // existence is already publicly observable through the redirect service, so this is not an
  // existence-oracle concern.
  await touchPointService.ensureCanViewTouchPoint(orgId, row.id, context.userId)

  // 3 — an artifact's touch point is not a short link to somebody else's URL. Its own i18n key, so
  // the refusal can name `get_artifact` instead of sending the model to re-check a correct id.
  if (row.content_type === TouchPointContentType.ARTIFACT) {
    throw new NotFoundError('This id is an artifact; use get_artifact', {
      key: 'agent:short_link.is_artifact',
    })
  }

  return APIResponse.ok({ data: toShortLink(row as unknown as ShortLinkRow) })
})
