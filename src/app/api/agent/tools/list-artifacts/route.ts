/**
 * MCP read tool `list_artifacts` — the back-hop target (WP1 §3).
 *
 * GET /api/agent/tools/list-artifacts?cursor=<opaque>&limit=<1..50>
 *
 * Same shape and the same reasons as `get-artifact`: `withAgentAuth(['read'])`, org from the PASETO,
 * `VIEW_TOUCH_POINTS` re-checked here because `listForOrg` has no gate of its own.
 *
 * ⚠️ `next_cursor` IS DERIVED FROM `rowCount`, NOT FROM "the page came back full". `listByOrg`
 * counts with the same query it filters with, so `rowCount` is the true number of non-tombstone rows
 * and `page * limit >= rowCount` is exactly "there is no next page". Guessing from a full page would
 * hand a model a cursor to an empty page on every exact multiple of `limit`, and a model that sees a
 * cursor calls it.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { artifactService } from '@/core/services/artifact.service'
import { toArtifactToolResult } from '@/core/helpers/artifact-agent-tools'
import { decodeArtifactCursor, encodeArtifactCursor } from '@/core/helpers/artifact-cursor'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { listArtifactsInputSchema, type ArtifactListResult } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const GET = withAgentAuth(['read'], async (request: NextRequest, { agent }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])
  await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

  const parsed = listArtifactsInputSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsed.success) throw new BadRequestError()

  const { cursor, limit } = parsed.data
  // An unreadable cursor means page 1, not a 400 — see `decodeArtifactCursor`.
  const page = decodeArtifactCursor(cursor) ?? 1

  const { data, rowCount } = await artifactService.listForOrg(orgId, { page, limit })

  const result: ArtifactListResult = {
    items: data.map(toArtifactToolResult),
    next_cursor: page * limit >= rowCount ? null : encodeArtifactCursor(page + 1),
  }

  return APIResponse.ok({ data: result })
})
