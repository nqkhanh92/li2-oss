/**
 * MCP write tool `update_short_link` — the back-hop target (SL-2 §1).
 *
 * POST /api/agent/tools/update-short-link   body `{ id, destination_url?, name?, utm?,
 *                                                   access_control?, enabled? }`
 *
 * POST and not PATCH, matching every other agent write: the repo reserves PATCH for the human
 * routes, and `withAgentAuth` sits on POST handlers across this directory.
 *
 * ★ THE ORDER OF THE THREE CHECKS IS THE DESIGN, copied deliberately from `get-short-link`:
 *   1. READ the row (org-scoped) → a miss is a 404, never a 500 and never a 403.
 *   2. `ensureCanEditTouchPoint` → the role and per-collection gate.
 *   3. ONLY THEN refuse an `ARTIFACT`.
 * Step 1 comes first because the gate collapses "the row is not there" into "you may not": every
 * `can*TouchPoint` returns false for a null row, so gating first would answer 403 for a link that
 * simply does not exist (measured on the human delete route, checklist §Kết luận 1). Step 3 comes
 * LAST because its refusal names the row's KIND, and a member who may not touch the row is not
 * entitled to learn that much — the same reasoning, and the same test, as the read tool.
 *
 * ⛔ WHY AN ARTIFACT IS REFUSED AT ALL. `artifacts.touch_point_id` is `ON DELETE SET NULL` and
 * nothing in `touch_points` knows it is serving a hosted page, so an agent editing an artifact's
 * touch point through this route would change the page's public address or switch it off with no
 * artifact tool reporting any of it (checklist §Kết luận 2). The artifact tools own that row.
 *
 * ⚠️ WHY THE PATCH IS CAST. `updateAndReturn` is typed `z.infer<typeof touchPointUpdateSchema>`,
 * whose `name` is REQUIRED (`min(4)`) — a partial patch does not satisfy it even though the function
 * body reads every field through `pickDefined` and handles `undefined` throughout. `changeSlug` in
 * `artifact.service.ts` casts for exactly the same reason (checklist B11). The validation that
 * matters happened in `updateShortLinkInputSchema`, which is the ONLY parse on this path.
 *
 * ⚠️ WHY THE ROW IS RE-READ AFTER THE WRITE. `updateAndReturn` returns two different shapes — the
 * detail row (with its tag join) when nothing changed, the bare updated row when something did — so
 * projecting its return value would make `tags` present or absent depending on whether the caller's
 * patch happened to be a no-op. One extra org-scoped read buys an answer identical in shape to
 * `get_short_link`'s, which is the whole promise of the shared `ShortLink` block.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { touchPointService } from '@/core/services/touch-point.service'
import { recordShortLinkAudit } from '@/core/helpers/agent-audit'
import {
  planShortLinkUpdate,
  toShortLink,
  type ShortLinkRow,
} from '@/core/helpers/short-link-agent-tools'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { TouchPointContentType } from '@/features/touch-points/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import {
  updateShortLinkInputSchema,
  type UpdateShortLinkResult,
} from '@/shared/schemas/agent-tools'
import type { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import type { z } from 'zod'

export const runtime = 'nodejs'

export const POST = withAgentAuth(['write'], async (request: NextRequest, { agent, context }) => {
  const orgId = agent.orgId

  // Re-gate the plan on every call: the mint-time gate only proves the org HAD the feature when the
  // token was issued, and a downgrade mid-token must stop the write. Ahead of the body parse on
  // purpose — an unentitled org is refused before its input is looked at.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const body = await request.json().catch(() => null)
  const parsed = updateShortLinkInputSchema.safeParse(body)
  // 400 covers the `.refine` that JSON Schema could not carry — "at least one field to change" —
  // which is why the tool's description states that rule in prose as well.
  if (!parsed.success) throw new BadRequestError()
  const input = parsed.data

  // 1 — read, org-scoped. This is also the row every comparison in `changed` is made against.
  const row = await touchPointService.getByIdForOrg(orgId, input.id)
  if (!row) throw new NotFoundError('Short link not found')

  // 2 — the role and per-collection edit gate. `canEditContent`, so a collaborator in a shared
  // collection can edit a link they did not create, exactly as in the dashboard.
  await touchPointService.ensureCanEditTouchPoint(orgId, row.id, context.userId)

  // 3 — an artifact's touch point belongs to the artifact tools. Its own i18n key, so the refusal
  // can name them instead of sending the model to re-check an id that was correct.
  if (row.content_type === TouchPointContentType.ARTIFACT) {
    throw new NotFoundError('This id is an artifact; use the artifact tools', {
      key: 'agent:short_link.is_artifact',
    })
  }

  const { patch, changed } = planShortLinkUpdate(input, row)

  await touchPointService.updateAndReturn(
    orgId,
    row.id,
    patch as z.infer<typeof touchPointUpdateSchema>,
    context.userId
  )

  // Best-effort and never awaited (see `agent-audit.ts`): the change already landed, and answering
  // 500 for a lost audit row would describe a failure that did not happen. `changed` is in the
  // metadata because it is the one thing the audit's own column diff cannot express in tool terms.
  recordShortLinkAudit({
    orgId,
    userId: context.userId,
    targetId: row.id,
    action: 'update',
    tool: 'update_short_link',
    clientId: agent.clientId,
    surface: agent.surface,
    changed,
    logFields: { touchPointId: row.id },
  })

  const fresh = await touchPointService.getByIdForOrg(orgId, row.id)
  // A link deleted between the write and this read: project what we just wrote rather than answer
  // 404 for a change that really did land.
  const data: UpdateShortLinkResult = {
    ...toShortLink((fresh ?? row) as unknown as ShortLinkRow),
    changed,
  }
  return APIResponse.ok({ data })
})
