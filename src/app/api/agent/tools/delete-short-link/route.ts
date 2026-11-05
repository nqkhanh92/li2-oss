/**
 * MCP write tool `delete_short_link` — the back-hop target (SL-3).
 *
 * POST /api/agent/tools/delete-short-link   body `{ id }`
 *
 * POST and not DELETE: the tool layer speaks GET-with-query or POST-with-json-body only
 * (`McpToolTransport`), and a third shape would be one more thing every client has to handle.
 *
 * ⛔ THIS IS A HARD DELETE, unlike `delete_artifact`. `touchPointService.deleteTpById` issues a real
 * `DELETE` on `touch_points` (checklist S5), and the FK map measured in R2 says what goes with it:
 * `slugs.tp_id` CASCADES, so every ending the link ever had is freed and a printed QR resolves to
 * nothing from then on; `pageviews.tp_id` and `conversion_events` are SET NULL, so the clicks stay
 * in the organization's totals but can no longer be attributed to any link. Nothing is recoverable
 * and there is no tombstone page to explain itself — which is why the tool's description points at
 * `update_short_link { enabled: false }` first.
 *
 * ★ THE ORDER OF THE THREE CHECKS IS THE DESIGN, and it is the same one `get-short-link` documents:
 *   1. READ the row (org-scoped) → a miss is `already_removed: true`, a SUCCESS.
 *   2. `ensureCanDeleteTouchPoint` → the per-member / per-collection gate.
 *   3. ONLY THEN refuse an `ARTIFACT`.
 *
 * Reading FIRST is not a style choice here, it is measured: the gate collapses "the row is not
 * there" into "you may not" — `canDeleteTouchPoint` returns false for a null row, and the human
 * route answers 403 on a second delete because of it (checklist R3). Gating first would therefore
 * report "no permission" for a retry of a delete that already SUCCEEDED, which is the one answer a
 * client must never get from an idempotent tool. Step 3 stays last because its refusal names the
 * row's kind, which is more than a member who may not touch the row is entitled to learn.
 *
 * ⚠️ `already_removed` IS NOT AN EXISTENCE ORACLE. `getByIdForOrg` is org-scoped, so another
 * organization's id answers exactly what a never-existing one answers, and nothing is deleted in
 * either case.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { touchPointService } from '@/core/services/touch-point.service'
import { recordShortLinkAudit } from '@/core/helpers/agent-audit'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { TouchPointContentType } from '@/features/touch-points/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import {
  deleteShortLinkInputSchema,
  type DeleteShortLinkResult,
} from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const POST = withAgentAuth(['write'], async (request: NextRequest, { context, agent }) => {
  const orgId = agent.orgId

  // Re-gate the plan on every call, AHEAD of the body parse: an unentitled org is refused before its
  // input is even looked at. MCP tokens carry `surface: 'mcp'` → MCP_ACCESS; a chat token → AI_CHAT.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const body = await request.json().catch(() => null)
  const parsed = deleteShortLinkInputSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestError()

  const { id } = parsed.data

  // 1 — read, org-scoped. See the header: this is what keeps a second delete a success.
  const row = await touchPointService.getByIdForOrg(orgId, id)
  if (!row) {
    // No audit row: nothing changed, and an audit log that records deletions which did not happen is
    // worse than one that records only the real ones. The FIRST delete already wrote its entry.
    const data: DeleteShortLinkResult = { id, status: 'deleted', already_removed: true }
    return APIResponse.ok({ data })
  }

  // 2 — the per-member / per-collection delete gate.
  await touchPointService.ensureCanDeleteTouchPoint(orgId, id, context.userId)

  // 3 — an artifact's touch point is not a short link to somebody else's URL, and destroying it
  // would orphan the artifact row (`artifacts.touch_point_id` is SET NULL, checklist R2/R7) while
  // cascading away the slugs its published page is served under. Its own i18n key, so the refusal
  // can name `delete_artifact` instead of leaving the model to retry this tool.
  //
  // Written as "not URL" rather than "is ARTIFACT" — the enum has exactly those two members today,
  // so the two are equivalent, and a third kind added later is then REFUSED rather than hard-deleted
  // by a tool that never heard of it.
  if (row.content_type !== TouchPointContentType.URL) {
    throw new NotFoundError('This id is an artifact; use delete_artifact', {
      key: 'agent:short_link.is_artifact',
    })
  }

  await touchPointService.deleteTpById(orgId, id, context.userId)

  // AFTER the delete, and never awaited. `deleteTpById` does log an audit event of its own, but with
  // no `metadata` at all — so without this row there is no answer to "which agent deleted this"
  // (`core/helpers/agent-audit.ts`; on this instance the audit log is the only trail there is).
  recordShortLinkAudit({
    orgId,
    userId: context.userId,
    targetId: id,
    action: 'delete',
    tool: 'delete_short_link',
    clientId: agent.clientId,
    surface: agent.surface,
    logFields: { shortLinkId: id },
  })

  const data: DeleteShortLinkResult = { id, status: 'deleted', already_removed: false }
  return APIResponse.ok({ data })
})
