/**
 * MCP write tool `set_short_link_slug` — the back-hop target (SL-2 §2).
 *
 * POST /api/agent/tools/set-short-link-slug   body `{ id, slug }`
 *
 * POST and not PATCH for the reason `set_artifact_slug` gives: this call has side effects OUTSIDE
 * the database — a new row in `slugs` and, when the link has a QR code, an image rendered and
 * uploaded — and the repo reserves PATCH for plain column edits.
 *
 * ★ THE SAME READ → GATE → ARTIFACT ORDER as `update-short-link`, and for the same two reasons: the
 * gates return false for a row that is not there (so reading first is what keeps a wrong id a 404),
 * and the artifact refusal names the row's kind (so it must come after the gate).
 *
 * ⭐ WHY `updateAndReturn` AND NOT `updateTpSlug`, which is the function that actually inserts the
 * slug. `updateTpSlug` DOES NOT RE-RENDER THE QR CODE (checklist B8): it writes `slug` and
 * `short_url` and stops, leaving the stored QR image encoding the previous address. The re-render
 * lives in `updateAndReturn`'s QR branch, which only runs when the call passes
 * `variants_content.QR.enabled`. `artifactService.changeSlug` is the working precedent for gluing
 * the two together, and this route follows it — including passing the EXISTING
 * `qr_customize_options` straight back, because that branch renders the image FROM the options it
 * receives: calling it with none would silently reset the colours, logo and dot style the owner
 * chose, as a side effect of a rename.
 *
 * ⚠️ WHERE IT DEPARTS FROM `changeSlug`, and it has to. An artifact's touch point is a QR-only row,
 * so `changeSlug` can send `variants_content: {QR: {enabled: true}}` wholesale. A short link is not:
 * the service assigns `variants_content` with NO MERGE, so sending that literal block to a link that
 * also has its LINK variant enabled would switch that variant off, and sending it to a link with no
 * QR at all would turn one ON — a config change nobody asked for, chargeable against the plan's
 * `ALLOWED_TP_TYPES`. So the QR branch is requested only for a link that ALREADY has a QR, and the
 * block is merged over the stored one. A link with no QR code has no image to refresh, and
 * `qr_url` stays `null`.
 *
 * ⚠️ THE SECOND IDENTICAL CALL IS A SUCCESS, NOT A REFUSAL, and it is the SERVICE that makes it so:
 * `updateTpSlug` compares the touch point's current slug with the requested one and RETURNS EARLY
 * when they match, before the `slugs` insert and before the `MAX_SLUGS_PER_TP` gate. So a retry
 * after a lost response cannot collide with the row it created itself and cannot burn a second slug
 * against the plan — which is what `idempotent: true` in the registry claims, about code rather
 * than about a hope. This route adds its own early return for the same case so that the QR is not
 * re-rendered and `updated_at` does not move for a rename that is not one.
 *
 * ⚠️ WHY A SECOND READ. `getByIdForOrg` returns the `LinkDetailsRow` column set, which deliberately
 * does not include `variants_content` or `qr_customize_options` — the two things the QR decision
 * needs. `getTouchPointDetail` has them, but it uses `.single()` and throws on a missing row, so it
 * is called only AFTER the org-scoped read has proved the row exists and the gate has allowed it.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { touchPointService } from '@/core/services/touch-point.service'
import { recordShortLinkAudit } from '@/core/helpers/agent-audit'
import { toShortLink, type ShortLinkRow } from '@/core/helpers/short-link-agent-tools'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { TouchPointContentType, TouchPointVariants } from '@/features/touch-points/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { setShortLinkSlugInputSchema, type ShortLink } from '@/shared/schemas/agent-tools'
import type { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import type { z } from 'zod'

export const runtime = 'nodejs'

type VariantsContent = Record<string, { enabled?: boolean } | undefined>

export const POST = withAgentAuth(['write'], async (request: NextRequest, { agent, context }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const body = await request.json().catch(() => null)
  const parsed = setShortLinkSlugInputSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestError()

  const { id, slug } = parsed.data
  // The schema's `.refine` already rejected an empty slug; this line is how that becomes a `string`
  // for the compiler, because `slugSchema` transforms `''` to `undefined` and a `.refine` cannot
  // narrow a type. Not dead weight either way: a 400 is the right answer if it is ever reachable.
  if (!slug) throw new BadRequestError()

  // 1 — read, org-scoped.
  const row = await touchPointService.getByIdForOrg(orgId, id)
  if (!row) throw new NotFoundError('Short link not found')

  // 2 — the role and per-collection edit gate.
  await touchPointService.ensureCanEditTouchPoint(orgId, row.id, context.userId)

  // 3 — an artifact's address is `set_artifact_slug`'s business, not this tool's.
  if (row.content_type === TouchPointContentType.ARTIFACT) {
    throw new NotFoundError('This id is an artifact; use the artifact tools', {
      key: 'agent:short_link.is_artifact',
    })
  }

  // The rename that is not one: answer the link as it is, write nothing, render nothing. See the
  // header — the service would also return early, but it would not stop the QR re-render.
  if (row.slug === slug) {
    const data: ShortLink = toShortLink(row as unknown as ShortLinkRow)
    return APIResponse.ok({ data })
  }

  const detail = await touchPointService.getTouchPointDetail(orgId, row.id)
  const variants = (detail.variants_content ?? {}) as VariantsContent
  const hasQr = variants[TouchPointVariants.QR]?.enabled === true

  await touchPointService.updateAndReturn(
    orgId,
    row.id,
    {
      slug,
      // Only for a link that already has a QR, and MERGED — see the header for both halves.
      ...(hasQr && {
        variants_content: { ...variants, [TouchPointVariants.QR]: { enabled: true } },
        qr_customize_options: (detail.qr_customize_options ?? {}) as Record<string, unknown>,
      }),
    } as z.infer<typeof touchPointUpdateSchema>,
    context.userId
  )

  recordShortLinkAudit({
    orgId,
    userId: context.userId,
    targetId: row.id,
    action: 'update',
    tool: 'set_short_link_slug',
    clientId: agent.clientId,
    surface: agent.surface,
    changed: ['slug'],
    logFields: { touchPointId: row.id },
  })

  /**
   * Re-read rather than project `updateAndReturn`'s result, the same choice `update-short-link`
   * makes and here with a second reason: `updateTpSlug` writes `slug` and `short_url` through its
   * OWN update, so those two columns are only guaranteed to agree with the new slug when they are
   * read back from the row. `path_qr_code` is read back for the same reason.
   */
  const fresh = await touchPointService.getByIdForOrg(orgId, row.id)
  const data: ShortLink = toShortLink((fresh ?? row) as unknown as ShortLinkRow)
  return APIResponse.ok({ data })
})
