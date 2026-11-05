'use client'

import { BarChart3 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  DeepLinkAnalyticsQueryParams,
  useDeepLinkOverview,
} from '@/ee/features/deep-link-analytics/hooks/queries'
import { DeepLinkRankingGroupBy, DeepLinkRankingRow } from '@/ee/features/deep-link-analytics/types'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { DeepLinkFunnel } from './deep-link-funnel'
import {
  DeepLinkRankingCard,
  RankingRowsList,
  RankingTab,
  SortKey,
} from './deep-link-ranking-card'
import { DeepLinkTimeseries } from './deep-link-timeseries'
import { DeferredAttributionStats } from './deferred-attribution-stats'
import { AppOpenMethodBreakdown } from './app-open-method-breakdown'
import { MissReasonDistribution } from './miss-reason-distribution'
import { PlatformSplit } from './platform-split'

/**
 * Self-contained, filter-prop-driven deep-link analytics block. The page mounts it
 * via <DeepLinkAnalyticsFilters>, which supplies a default last-7-days range; a
 * future <DeepLinkSection> embed in AnalyticByTag can mount the same component with
 * shared filter state — zero rework (README Key Decision 1; deferred-issues #6).
 *
 * Renders the deferred-cohort funnel (Clicks / Direct opens as context, Deferred
 * opens → Matched) + the deferred trend chart + the widget grid below it.
 *
 * `onDrillDown` re-scopes the page when a ranking row is clicked. It is owned by the
 * filter wrapper (which holds the filter setters) — NOT a URL push, because the filter
 * state seeds from the URL only at mount, so an in-page push would not re-scope.
 */
export function DeepLinkAnalyticsBody({
  filters = {},
  onDrillDown,
}: {
  filters?: DeepLinkAnalyticsQueryParams
  onDrillDown?: (groupBy: DeepLinkRankingGroupBy, key: string) => void
}) {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation(['domain'])
  const { data, isLoading, isError } = useDeepLinkOverview(org_id, filters)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return <p className="text-muted-foreground text-sm">{t('domain:deepLink.analytics.error')}</p>
  }

  const { summary, clickSummary, timeseries, clickTimeseries, bucket } = data
  // Per-link = filtered to exactly one touch point (Task 5.6 §3). The summary RPC then
  // excludes unattributable (NULL touch_point_id) events, so the funnel caption adapts.
  const isPerLink = filters.tp_ids?.length === 1
  const isEmpty =
    clickSummary.clicks === 0 &&
    summary.app_opens === 0 &&
    summary.deferred_matches === 0 &&
    summary.deferred_misses === 0

  if (isEmpty) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
        <BarChart3 className="h-6 w-6" />
        <span>{t('domain:deepLink.analytics.empty')}</span>
      </div>
    )
  }

  // Card A "Top deep links" — link/tag/space dimensions, full Clicks·Direct·Matched triple.
  const topLinksTabs: RankingTab[] = [
    { value: 'link', label: t('domain:deepLink.analytics.ranking.tab.by_link'), groupBy: 'link' },
    { value: 'tag', label: t('domain:deepLink.analytics.ranking.tab.tags'), groupBy: 'tag' },
    { value: 'space', label: t('domain:deepLink.analytics.ranking.tab.spaces'), groupBy: 'space' },
  ]
  const topLinksColumns: SortKey[] = ['clicks', 'direct_opens', 'matched']

  // Channel rows come straight from the already-loaded summary (no extra query), rendered as a
  // bar-list tab to match Referrers/UTM. Channel values are display-ready (Direct / Referral / …).
  const channelRows: DeepLinkRankingRow[] = Object.entries(clickSummary.by_channel).map(
    ([key, clicks]) => ({
      key,
      name: t(`domain:deepLink.analytics.channel.${key}`, { defaultValue: key }),
      clicks,
      direct_opens: 0,
      matched: 0,
    })
  )

  // Card B "Click sources" — clicks-only; UTM is a sub-tab group.
  const clickSourceTabs: RankingTab[] = [
    {
      value: 'referrer',
      label: t('domain:deepLink.analytics.ranking.tab.referrer'),
      groupBy: 'referrer',
    },
    {
      value: 'utm',
      label: t('domain:deepLink.analytics.ranking.tab.utm'),
      subTabs: [
        {
          value: 'utm_source',
          label: t('domain:deepLink.analytics.ranking.utm.source'),
          groupBy: 'utm_source',
        },
        {
          value: 'utm_medium',
          label: t('domain:deepLink.analytics.ranking.utm.medium'),
          groupBy: 'utm_medium',
        },
        {
          value: 'utm_campaign',
          label: t('domain:deepLink.analytics.ranking.utm.campaign'),
          groupBy: 'utm_campaign',
        },
      ],
    },
    {
      value: 'channel',
      label: t('domain:deepLink.analytics.ranking.tab.channel'),
      content: <RankingRowsList rows={channelRows} columns={['clicks']} isLoading={false} />,
    },
  ]

  return (
    <div className="space-y-6">
      <DeepLinkFunnel summary={summary} clickSummary={clickSummary} isPerLink={isPerLink} />
      <DeepLinkTimeseries
        timeseries={timeseries}
        clickTimeseries={clickTimeseries}
        bucket={bucket}
      />
      {/* Deferred-cohort pair: the restore rate and the "why" behind it side by side on
          large screens (the miss card explains the rate). Default stretch makes both cards
          equal height; the compact rate card fills + vertically centers its content (h-full
          + justify-center inside DeferredAttributionStats). Degrades cleanly when
          DeferredAttributionStats renders null (no deferred activity) — the miss card then
          sizes to its own content. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DeferredAttributionStats summary={summary} />
        <MissReasonDistribution data={summary.by_miss_reason} />
      </div>
      {/* Ranking pair: Top deep links + Click sources side by side on large screens. lg
          (not sm) so the multi-column ranking tables keep enough width. Default stretch
          keeps both cards equal height (the shorter one fills to match). */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DeepLinkRankingCard
          title={t('domain:deepLink.analytics.ranking.top_links_title')}
          filters={filters}
          tabs={topLinksTabs}
          columns={topLinksColumns}
          onRowClick={onDrillDown}
        />
        <DeepLinkRankingCard
          title={t('domain:deepLink.analytics.ranking.click_sources_title')}
          filters={filters}
          tabs={clickSourceTabs}
          columns={['clicks']}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlatformSplit data={summary.by_platform} />
        <AppOpenMethodBreakdown data={summary.by_method} />
      </div>
    </div>
  )
}
