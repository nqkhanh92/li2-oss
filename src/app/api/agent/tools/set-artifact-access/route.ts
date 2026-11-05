/**
 * MCP write tool `set_artifact_access` — the back-hop target (WP2 §1).
 *
 * POST /api/agent/tools/set-artifact-access   body `{ artifact_id, mode, password? }`
 *
 * ⛔ POST, AND NOT A GET WITH A QUERY STRING, BECAUSE OF THE PASSWORD. `withAgentAuth` logs
 * `{ route: request.url }` on a failure, and `/api/mcp`'s header commits to never logging tool
 * arguments — a password in a query string would break both promises in one line, and would also
 * sit in any proxy access log between here and Traefik. A JSON body appears in neither.
 *
 * The route is pure orchestration, like its siblings: scope gate (structural, in `withAgentAuth`),
 * plan gate, `.strict()` parse, ONE service call. Everything that decides the answer lives in
 * `artifactService.setAccess` — `ensurePolicy(add_touch_point)`, the 8–128 code-point password rule,
 * the `google`-needs-env gate, the `access_version` optimistic lock, and the scrypt hashing. None of
 * it is re-implemented here, so MCP cannot drift from what the dashboard does.
 *
 * NOT `PATCH …/organizations/{org}/artifacts/{id}`: that route is `withAuth` (Casdoor cookie) and
 * would 401 a PASETO. Same reason as every other tool route.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { artifactService } from '@/core/services/artifact.service'
import { recordArtifactAudit } from '@/core/helpers/artifact-audit'
import { toArtifactToolResult } from '@/core/helpers/artifact-agent-tools'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import {
  setArtifactAccessInputSchema,
  type SetArtifactAccessResult,
} from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const POST = withAgentAuth(['write'], async (request: NextRequest, { context, agent }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const body = await request.json().catch(() => null)
  const parsed = setArtifactAccessInputSchema.safeParse(body)
  // A bare 400: there is nothing to say about the shape that the schema has not already said, and a
  // message built from the parse issues could echo the password back in a `received` field.
  if (!parsed.success) throw new BadRequestError()

  const { artifact_id, mode, password } = parsed.data

  const dto = await artifactService.setAccess(orgId, context.userId, artifact_id, {
    access_mode: mode,
    password,
  })

  // AFTER the change and never awaited — the row is worth having, not worth failing a completed
  // write over. `recordArtifactAudit` takes ids and the tool name only; the password is not passed
  // to it and `metadata` is forbidden from carrying tool arguments.
  recordArtifactAudit({
    orgId,
    userId: context.userId,
    artifactId: artifact_id,
    action: 'update',
    tool: 'set_artifact_access',
    clientId: agent.clientId,
    surface: agent.surface,
  })

  /**
   * `password_set_at` is the ONLY trace of the password in the answer, and the DTO is incapable of
   * carrying more: `toDTO` never spreads the row, so `password_hash` has no path out of the service.
   */
  const data: SetArtifactAccessResult = {
    ...toArtifactToolResult(dto),
    password_set_at: dto.password_set_at,
  }
  return APIResponse.ok({ data })
})
