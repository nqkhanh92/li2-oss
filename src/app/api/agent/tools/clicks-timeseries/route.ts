/**
 * AI Agent Platform — read tool (task-1b.1 Phase A).
 *
 * GET /api/agent/tools/clicks-timeseries?period_days=<1-90>
 * Behind withAgentAuth (PASETO back hop, scope=read). Projects the `daily-trend` RPC (via
 * analyticService.getAdvancedAnalytics) down to a compact contract, bucketing daily rows into
 * weekly sums when period_days > 31 (task-1b.1 decision 1-H) — keeps the response
 * size-by-construction under MAX_TOOL_RESULT_CHARS instead of relying on truncation (banned, 1-I).
 * `summary` is recomputed over the (possibly weekly) buckets — never copied from the raw
 * day-based `summary.peak_day`/`days_with_activity`, which would disagree with weekly buckets.
 *
 * Cross-repo contract (must match the Pydantic model in li2-ai, task-1b.1 Phase B):
 *   ClicksTimeseries = { period_days, granularity: "daily"|"weekly", buckets: TimeseriesBucket[],
 *                         summary: { peak: {start, interactions}, trend_direction,
 *                                    buckets_with_activity } }
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
  bucketDaily,
  ClicksTimeseries,
  TimeseriesBucket,
} from '@/shared/schemas/agent-tools'
import { DailyTrend } from '@/core/types/analytics/daily-trend.type'

export const runtime = 'nodejs'

// Read scope is enforced structurally by withAgentAuth(['read'], ...) before this handler runs.
export const GET = withAgentAuth(['read'], async (request: NextRequest, { agent, context }) => {
  const orgId = agent.orgId

  // Gated on the caller's surface: chat panel → AI_CHAT, MCP client → MCP_ACCESS.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const { period_days } = periodDaysQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  const timezone = getTimeZone()

  const raw = (await analyticService.getAdvancedAnalytics(
    orgId,
    'daily-trend',
    { p_organization_id: orgId, p_period_days: period_days, p_timezone: timezone },
    context.userId
  )) as unknown as DailyTrend | null

  // The RPC returns null / an empty shape for a data-less org (matches how UI consumers guard
  // `dailyTrendData?.daily_data || []`). bucketDaily([]) yields an empty, valid response.
  const { granularity, buckets } = bucketDaily(raw?.daily_data ?? [], period_days)
  const peakBucket = buckets.reduce(
    (best, b) => (b.total_interactions > (best?.total_interactions ?? -1) ? b : best),
    null as TimeseriesBucket | null
  )

  const data: ClicksTimeseries = {
    period_days,
    granularity,
    buckets,
    summary: {
      peak: peakBucket
        ? { start: peakBucket.start, interactions: peakBucket.total_interactions }
        : { start: '', interactions: 0 },
      trend_direction: raw?.summary?.trend_direction ?? 'stable',
      buckets_with_activity: buckets.filter((b) => b.total_interactions > 0).length,
    },
  }

  return APIResponse.ok({ data })
})
