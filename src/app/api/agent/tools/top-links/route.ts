/**
 * AI Agent Platform — read tool (task-1b.1 Phase A).
 *
 * GET /api/agent/tools/top-links?period_days=<1-90>&limit=<1-20>
 * Behind withAgentAuth (PASETO back hop, scope=read). Projects the `top-touchpoint` RPC (via
 * analyticService.getAdvancedAnalytics) down to a compact contract — route-level projection,
 * NOT new business logic (§2).
 *
 * Cross-repo contract (must match the Pydantic model in li2-ai, task-1b.1 Phase B):
 *   TopLinks = { period_days, top: TopLinkEntry[] }
 *   TopLinkEntry = { id, rank, name, slug, total_interactions, link_clicks, qr_scans }
 * `id` (= the RPC's touchpoint_id) lets the model thread this link straight into get_link_details'
 * `id` param instead of guessing which of name/slug/short_code to pass.
 *
 * nodejs runtime: withAgentAuth -> paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { analyticService } from '@/core/services/analytic.service'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { getTimeZone } from '@/shared/utils/server/get-timezone'
import { topLinksQuerySchema, TopLinks } from '@/shared/schemas/agent-tools'
import { TouchpointReport } from '@/core/types/analytics/top-touch-point.type'

export const runtime = 'nodejs'

// Read scope is enforced structurally by withAgentAuth(['read'], ...) before this handler runs.
export const GET = withAgentAuth(['read'], async (request: NextRequest, { agent, context }) => {
  const orgId = agent.orgId

  // Gated on the caller's surface: chat panel → AI_CHAT, MCP client → MCP_ACCESS.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const { period_days, limit } = topLinksQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  const timezone = getTimeZone()

  const raw = (await analyticService.getAdvancedAnalytics(
    orgId,
    'top-touchpoint',
    { p_organization_id: orgId, p_period_days: period_days, p_timezone: timezone },
    context.userId
  )) as unknown as TouchpointReport | null

  // The RPC returns null / an empty shape for a data-less org (matches how UI consumers guard
  // `topTouchpoints?.top_touchpoints || []`). Fall back to an empty ranking instead of a 500.
  const data: TopLinks = {
    period_days,
    top: (raw?.top_touchpoints ?? []).slice(0, limit).map((t) => ({
      id: t.touchpoint_id,
      rank: t.rank,
      name: t.name,
      slug: t.slug ?? null,
      total_interactions: t.core_metrics.total_interactions ?? 0,
      link_clicks: t.core_metrics.link_clicks ?? 0,
      qr_scans: t.core_metrics.qr_scans ?? 0,
    })),
  }

  return APIResponse.ok({ data })
})
