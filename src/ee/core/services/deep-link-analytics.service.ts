import dayjs from 'dayjs'
import {
  DeepLinkBucket,
  deepLinkAnalyticsRepository,
} from '@/ee/core/repositories/deep-link-analytics.repository'
import { memberService } from '@/core/services/member.service'
import { touchPointService } from '@/core/services/touch-point.service'
import {
  DeepLinkAnalyticsFilters,
  DeepLinkClickSummary,
  DeepLinkClickTimeseriesPoint,
  DeepLinkRanking,
  DeepLinkRankingGroupBy,
  DeepLinkSummary,
  DeepLinkTimeseriesPoint,
} from '@/ee/features/deep-link-analytics/types'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'

export interface DeepLinkOverview {
  summary: DeepLinkSummary
  clickSummary: DeepLinkClickSummary
  timeseries: DeepLinkTimeseriesPoint[]
  clickTimeseries: DeepLinkClickTimeseriesPoint[]
  /** Server-chosen bucket granularity — the chart formats its axis from this rather than
   *  guessing from the local hour (UTC-midnight day buckets look like hour 7 in GMT+7). */
  bucket: DeepLinkBucket
}

// Hour buckets for short ranges (≤ 2 days), day buckets otherwise — keeps the chart
// readable whether the user picks "today" or "last 90 days". Mirrors the RPC default.
function deriveBucket(startDate?: string, endDate?: string): DeepLinkBucket {
  if (!startDate || !endDate) return 'day'
  return dayjs(endDate).diff(dayjs(startDate), 'day') <= 2 ? 'hour' : 'day'
}

class DeepLinkAnalyticsService {
  async getOverview(
    orgId: string,
    userId: string,
    filters: DeepLinkAnalyticsFilters,
    timezone?: string
  ): Promise<DeepLinkOverview> {
    // Access gate, in order: (1) org membership — withAuth only validates a
    // session, NOT membership of THIS org, so without this a logged-in non-member
    // could hit another org's URL; ensureOrgMember closes that (403, not a silent
    // 200-empty). (2) the Pro plan. We deliberately do NOT hard-gate on
    // VIEW_ANALYTICS: that key is a sidebar-visibility flag checked with
    // hasPermission(), not a scoped permission, so getPermissionScopeOrThrow(
    // VIEW_ANALYTICS) would 403 even for holders. Per-link scoping is handled
    // below via getViewableTouchpointIds.
    await ensureOrgMember(orgId)
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.DEEP_LINK_ATTRIBUTION)

    // Owners → org-wide view (undefined includes unattributable NULL-tp events).
    // Scoped users → only their viewable touch points; if they lack VIEW_TOUCH_POINTS,
    // degrade to no data (matches analytic.service's try/catch) rather than 403.
    let viewableTpIds: string[] | undefined
    if (await memberService.isOrgOwner(orgId, userId)) {
      viewableTpIds = undefined
    } else {
      try {
        viewableTpIds = await touchPointService.getViewableTouchpointIds(orgId, userId)
      } catch {
        viewableTpIds = []
      }
    }

    const bucket = deriveBucket(filters.startDate, filters.endDate)

    // Bots are always excluded on the deep-link surface (decision #5, 2026-05-27): App Opens
    // have no bot vector (deep_link_events ignores _exclude_bot) and Clicks must be bot-free for
    // the funnel to mean anything. Forced here, not client-driven — the UI hides the toggle
    // (disabledExcludeBot), so a request can't ask for bots-included.
    const effectiveFilters: DeepLinkAnalyticsFilters = { ...filters, excludeBot: true }

    const [summary, clickSummary, timeseries, clickTimeseries] = await Promise.all([
      deepLinkAnalyticsRepository.getSummary(orgId, viewableTpIds, effectiveFilters),
      deepLinkAnalyticsRepository.getClickSummary(orgId, viewableTpIds, effectiveFilters),
      deepLinkAnalyticsRepository.getTimeseries(orgId, viewableTpIds, effectiveFilters, bucket, timezone),
      deepLinkAnalyticsRepository.getClickTimeseries(orgId, viewableTpIds, effectiveFilters, bucket, timezone),
    ])

    return { summary, clickSummary, timeseries, clickTimeseries, bucket }
  }

  // Per-link ranking (Phase 7). Same access gate as getOverview: org membership +
  // Pro plan + per-link viewable scoping; bots force-excluded on the clicks side.
  async getRanking(
    orgId: string,
    userId: string,
    groupBy: DeepLinkRankingGroupBy,
    filters: DeepLinkAnalyticsFilters
  ): Promise<DeepLinkRanking> {
    await ensureOrgMember(orgId)
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.DEEP_LINK_ATTRIBUTION)

    let viewableTpIds: string[] | undefined
    if (await memberService.isOrgOwner(orgId, userId)) {
      viewableTpIds = undefined
    } else {
      try {
        viewableTpIds = await touchPointService.getViewableTouchpointIds(orgId, userId)
      } catch {
        viewableTpIds = []
      }
    }

    const effectiveFilters: DeepLinkAnalyticsFilters = { ...filters, excludeBot: true }
    return deepLinkAnalyticsRepository.getRanking(orgId, viewableTpIds, groupBy, effectiveFilters)
  }
}

export const deepLinkAnalyticsService = new DeepLinkAnalyticsService()
