/**
 * AI Agent Platform — the one P0 read tool (architecture §3 boundary 2, task-0.4).
 *
 * GET /api/agent/tools/org-overview?org_id=<uuid>
 * Behind withAgentAuth (PASETO back hop, role=AGENT). Composes three existing sources into the
 * OrgOverview contract — route-level orchestration, NOT new business logic (§2):
 *   org_name          <- organizationService.getOrgById
 *   plan              <- getOrganizationPlan (plan_key slug)
 *   touch_point_count <- touchPointService.countByOrganization (count-only)
 *
 * Named `org-overview`, NOT `org-summary` — the latter collides with the existing
 * public.get_org_summary RPC (different shape).
 *
 * Cross-repo contract (must match the Pydantic model in li2-ai, task-0.5):
 *   OrgOverview = { org_name: string; plan: string; touch_point_count: number }
 *
 * nodejs runtime: withAgentAuth -> paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { organizationService } from '@/core/services/organization.service'
import { touchPointService } from '@/core/services/touch-point.service'
import { ensureOrgPlan, getOrganizationPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import type { OrgOverview } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

/**
 * ⭐ The shape moved to `shared/schemas/agent-tools.ts` (P0.4) so `core/mcp/tools.ts` can generate
 * the tool's `outputSchema` from the same declaration. Re-exported here because that is the name
 * this route has always published it under.
 */
export type { OrgOverview }

// Read scope is enforced structurally by withAgentAuth(['read'], ...) before this handler runs.
export const GET = withAgentAuth(['read'], async (_request: NextRequest, { agent }) => {
  const orgId = agent.orgId

  // Re-gate the plan on every tool call — the mint-time gate only proves the org HAD the feature
  // when the (15-min) token was issued; a downgrade mid-token must stop tool use immediately.
  // ensureOrgPlan works under role=AGENT: it routes through getOrganizationPlan(orgId) ->
  // getUserPlan(org.user_id) with an explicit userId, so it does not depend on a browser session.
  // Which feature depends on the caller: chat panel → AI_CHAT, MCP client → MCP_ACCESS.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const [org, orgPlan, touchPointCount] = await Promise.all([
    organizationService.getOrgById(orgId),
    getOrganizationPlan(orgId),
    touchPointService.countByOrganization(orgId),
  ])

  if (!org) throw new NotFoundError()

  const data: OrgOverview = {
    org_name: org.name,
    plan: orgPlan?.plan_key ?? 'unknown',
    touch_point_count: touchPointCount,
  }

  return APIResponse.ok({ data })
})
