/**
 * MCP read tool `get_artifact` — the back-hop target (WP1 §2).
 *
 * GET /api/agent/tools/get-artifact?artifact_id=<uuid>
 * GET /api/agent/tools/get-artifact?slug=<slug>
 *
 * Behind `withAgentAuth(['read'])`: the scope gate and `ensureOrgMember` run before this, and the
 * org comes from the PASETO (`agent.orgId`) — never from the query, which is why the MCP layer
 * strips `org_id` before the hop. NOT `GET …/organizations/{org}/artifacts/{id}`: that route is
 * `withAuth` (Casdoor cookie) and would 401 a PASETO, the same reason `publish-artifact` has a route
 * of its own.
 *
 * `VIEW_TOUCH_POINTS` is checked here and not left to the service, because the human-facing route
 * checks it there (`[artifact_id]/route.ts`) and `getForOrg` itself has no permission gate. Without
 * this line an org member whose role cannot see touch points would read artifacts through MCP that
 * the dashboard hides from them.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { artifactService } from '@/core/services/artifact.service'
import { toArtifactDetailResult } from '@/core/helpers/artifact-agent-tools'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { getArtifactInputSchema } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const GET = withAgentAuth(['read'], async (request: NextRequest, { agent }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])
  await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

  const parsed = getArtifactInputSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  // 400 covers both "neither key" and "both keys" — the `.refine` that JSON Schema could not carry,
  // which is why the tool's description states the rule in prose as well.
  if (!parsed.success) throw new BadRequestError()

  const dto = parsed.data.artifact_id
    ? await artifactService.getForOrg(orgId, parsed.data.artifact_id)
    : await artifactService.getBySlugForOrg(orgId, parsed.data.slug!)

  return APIResponse.ok({ data: toArtifactDetailResult(dto) })
})
