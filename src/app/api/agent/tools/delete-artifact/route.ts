/**
 * MCP write tool `delete_artifact` — the back-hop target (WP1 §4).
 *
 * POST /api/agent/tools/delete-artifact   body `{ artifact_id }`
 *
 * POST and not DELETE: the tool layer only speaks GET-with-query or POST-with-json-body
 * (`McpToolTransport`), and an artifact id in a query string of a DELETE would be the third shape.
 * The permission gate is the service's (`ensureDeletePolicy` → `DELETE_TOUCH_POINT`), resolved
 * BEFORE anything is read or destroyed — see `artifactService.deleteForOrg`.
 *
 * NOT `DELETE …/organizations/{org}/artifacts/{id}`: that route is `withAuth` (Casdoor cookie) and
 * does not read a PASETO. Same reason as `publish-artifact`.
 *
 * ⚠️ WHAT THIS DOES NOT UNDO. The object is deleted and the row becomes a tombstone; the short link
 * and every printed QR keep working and answer 410 with a page that explains itself. The tool's
 * description says exactly that, because a model that believes "delete" removes the link would tell
 * a user to reprint nothing.
 *
 * ⚠️ A SECOND DELETE IS A SUCCESS, NOT A 404 — but the SUCCESS is assembled at the MCP layer, not
 * here. The service answers `artifact:errors.removed` with status 404 (unchanged status, so the
 * dashboard behaves as before) and `call-tool.ts` turns that one key into
 * `{ already_removed: true }`. Doing it here instead would mean this route answering 200 for a
 * tombstone, which would change what the human-facing DELETE reports.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { artifactService } from '@/core/services/artifact.service'
import { recordArtifactAudit } from '@/core/helpers/artifact-audit'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { deleteArtifactInputSchema, type DeleteArtifactResult } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const POST = withAgentAuth(['write'], async (request: NextRequest, { context, agent }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const body = await request.json().catch(() => null)
  const parsed = deleteArtifactInputSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestError()

  const { artifact_id } = parsed.data

  await artifactService.deleteForOrg(orgId, context.userId, artifact_id)

  // AFTER the delete, and never awaited: an audit row is worth having, but not worth failing a
  // delete that already happened (`recordArtifactAudit` swallows its own errors as well).
  recordArtifactAudit({
    orgId,
    userId: context.userId,
    artifactId: artifact_id,
    action: 'delete',
    tool: 'delete_artifact',
    clientId: agent.clientId,
    surface: agent.surface,
  })

  const data: DeleteArtifactResult = {
    artifact_id,
    status: 'removed',
    already_removed: false,
  }
  return APIResponse.ok({ data })
})
