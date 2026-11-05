/**
 * MCP read tool `list_short_links` — the back-hop target (SL-1).
 *
 * GET /api/agent/tools/list-short-links
 *   ?cursor=<opaque>&limit=<1..50>&search=<text>&collection_id=<uuid>&tag_ids[]=<uuid>
 *
 * Behind `withAgentAuth(['read'])`: the scope gate and `ensureOrgMember` run before this, and the
 * org comes from the PASETO (`agent.orgId`) — never from the query, which is why the MCP layer
 * strips `org_id` before the hop.
 *
 * ⭐ `applyCollectionPermissions: true` IS THE LOAD-BEARING LINE. `getAllTouchPoints` defaults it to
 * FALSE (`touch-point.service.ts`, measured as checklist S9), and the dashboard's own list route
 * passes `true`. Leaving the default would make this tool list links that the very same member
 * cannot see in the Li2 UI — a quiet widening of what an org member may read, on the surface where
 * a third-party agent is the reader. The test asserts the argument, not just the output.
 *
 * ⚠️ `content_type = 'URL'` filter: artifacts publish themselves AS touch points, so without it this
 * tool would list every hosted page alongside the short links and hand a model artifact ids that
 * every short-link tool then refuses. `list_artifacts` is the tool for those.
 *
 * `next_cursor` is derived from the TRUE row count (`count: 'exact'` on the same query that
 * filters), never from "the page came back full" — the same rule and the same reason as
 * `list-artifacts`: guessing hands a model a cursor to an empty page on every exact multiple of
 * `limit`, and a model that sees a cursor calls it.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { touchPointService } from '@/core/services/touch-point.service'
import { toShortLink, type ShortLinkRow } from '@/core/helpers/short-link-agent-tools'
import { decodeArtifactCursor, encodeArtifactCursor } from '@/core/helpers/artifact-cursor'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { TouchPointContentType } from '@/features/touch-points/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { getQueryParams } from '@/shared/lib/utils'
import type { SearchFilterPagination } from '@/shared/types'
import { listShortLinksInputSchema, type ShortLinkListResult } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const GET = withAgentAuth(['read'], async (request: NextRequest, { agent, context }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])
  // Also the org-level fallback `getAllTouchPoints` uses for UNCATEGORIZED links, which the
  // collection filter cannot scope on its own.
  const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

  // `getQueryParams` (qs) rather than `Object.fromEntries`: `tag_ids` arrives as `tag_ids[]=a&…`
  // and `fromEntries` would collapse a repeated key to its last value, silently filtering by one
  // tag when the caller asked for five.
  const parsed = listShortLinksInputSchema.safeParse(getQueryParams(request))
  if (!parsed.success) throw new BadRequestError()

  const { cursor, limit, search, collection_id, tag_ids } = parsed.data
  // An unreadable cursor means page 1, not a 400 — see `decodeArtifactCursor`.
  const page = decodeArtifactCursor(cursor) ?? 1

  const queryParams: SearchFilterPagination = {
    pagination: { pageIndex: page - 1, pageSize: limit },
    // Newest first, matching `list_artifacts` and the dashboard's default. Stated rather than left
    // to Postgres, whose unordered result would make the cursor's page numbers meaningless.
    sorting: [{ id: 'created_at', desc: true }],
    filters: {
      content_type: TouchPointContentType.URL,
      ...(collection_id ? { collection_id } : {}),
      ...(tag_ids?.length ? { tag_ids } : {}),
    },
    ...(search ? { search } : {}),
  }

  const { data, count } = await touchPointService.getAllTouchPoints(orgId, {
    scope,
    userId: context.userId,
    queryParams,
    applyCollectionPermissions: true, // see the header — NOT the service default
  })

  const rowCount = count ?? 0
  const result: ShortLinkListResult = {
    items: (data ?? []).map((row) => toShortLink(row as unknown as ShortLinkRow)),
    next_cursor: page * limit >= rowCount ? null : encodeArtifactCursor(page + 1),
  }

  return APIResponse.ok({ data: result })
})
