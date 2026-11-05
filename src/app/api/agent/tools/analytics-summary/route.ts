/**
 * AI Agent Platform — read tool (task-1b.1 Phase A).
 *
 * GET /api/agent/tools/analytics-summary?period_days=<1-90>
 * Behind withAgentAuth (PASETO back hop, scope=read). Projects the `stats-panel` RPC (via
 * analyticService.getAdvancedAnalytics) down to a compact contract — route-level projection,
 * NOT new business logic (§2). Drops `wifi_accesses` and the stray optional `value` field.
 *
 * Cross-repo contract (must match the Pydantic model in li2-ai, task-1b.1 Phase B):
 *   AnalyticsSummary = { period_days, link_clicks, qr_scans, nfc_taps, total_visits,
 *                         unique_visits: MetricWithTrend, touchpoints_active: number }
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
import {
  periodDaysQuerySchema,
  AnalyticsSummary,
  MetricWithTrend,
} from '@/shared/schemas/agent-tools'
import { StatsPanel } from '@/core/types/analytics/stats-panel.type'

export const runtime = 'nodejs'

// Read scope is enforced structurally by withAgentAuth(['read'], ...) before this handler runs.
export const GET = withAgentAuth(['read'], async (request: NextRequest, { agent, context }) => {
  const orgId = agent.orgId

  // Re-gate the plan on every tool call — the mint-time gate only proves the org HAD the feature
  // when the (15-min) token was issued; a downgrade mid-token must stop tool use immediately.
  // Which feature depends on the caller: chat panel → AI_CHAT, MCP client → MCP_ACCESS.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const { period_days } = periodDaysQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  const timezone = getTimeZone()

  // context.userId is required here (unlike org-overview) so collection-permission filtering
  // inside getAdvancedAnalytics applies — a non-Owner must not see collections they can't access.
  const raw = (await analyticService.getAdvancedAnalytics(
    orgId,
    'stats-panel',
    { p_organization_id: orgId, p_period_days: period_days, p_timezone: timezone },
    context.userId
  )) as unknown as StatsPanel | null

  // The RPC returns null / an empty shape for a data-less org (matches how every UI consumer
  // guards `data?.stats?.<metric>?.value ?? 0`). Deref unguarded and a new org 500s, so fall
  // back to a zeroed-but-valid contract instead.
  const s = raw?.stats
  const emptyMetric: MetricWithTrend = { value: 0, change_pct: 0, trend: 'stable' }
  const data: AnalyticsSummary = {
    period_days,
    link_clicks: s?.link_clicks ?? emptyMetric,
    qr_scans: s?.qr_scans ?? emptyMetric,
    nfc_taps: s?.nfc_taps ?? emptyMetric,
    total_visits: s?.total_visits ?? emptyMetric,
    unique_visits: s?.unique_visits ?? emptyMetric,
    touchpoints_active: s?.touchpoints_active ?? 0,
  }

  return APIResponse.ok({ data })
})
