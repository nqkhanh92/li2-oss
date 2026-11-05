'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DateRange } from 'react-day-picker'
import dayjs from '@/shared/lib/dayjs'
import { AnalyticFilters } from '@/features/analytics/components/filters/filters'
import { useAnalyticsFilters } from '@/features/analytics/hooks/use-analytics-filters'
import { useGetDistinctUtmValues } from '@/features/analytics/hooks/queries'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useGetTouchPointDropdown } from '@/features/touch-points/hooks/queries'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { DeepLinkAnalyticsQueryParams } from '@/ee/features/deep-link-analytics/hooks/queries'
import { DeepLinkRankingGroupBy } from '@/ee/features/deep-link-analytics/types'
import { DeepLinkAnalyticsBody } from './deep-link-analytics-body'

/**
 * Filter chrome for the dedicated Deep Link Analytics page. Owns the shared analytics
 * filter state (reused so the page drives off the same filter shape as AnalyticByTag —
 * README Key Decision 1/2) and feeds a mapped filter object into the filter-prop-driven
 * <DeepLinkAnalyticsBody/>. The body stays filter-agnostic so it can later embed in
 * AnalyticByTag with parent-owned state (deferred-issues #6) with zero rework.
 *
 * The interaction-type filter is hidden (disabledInteractionType): the deep-link RPC pair
 * has no interaction_type dimension, so the control would be dead.
 *
 * `?tp_ids=<id>` in the URL pre-selects one link → the whole page becomes the per-link
 * view (Task 5.6 §3 — per-link = the page filtered to one tp_id; no separate route).
 */
export function DeepLinkAnalyticsFilters() {
  const { org_id } = useParams<{ org_id: string }>()
  const searchParams = useSearchParams()
  const { t } = useTranslation(['domain'])

  // Per-link deep-link entry: one tp_id pre-selected from the URL (Task 5.6).
  const initialTpId = searchParams.get('tp_ids')

  const {
    filters,
    setTagIds,
    setTpIds,
    setExcludeBot,
    setCollectionIds,
    setUtmSourceValues,
    setUtmMediumValues,
    setUtmCampaignValues,
  } = useAnalyticsFilters({ tp_ids: initialTpId ? [initialTpId] : [] })

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dayjs().subtract(7, 'day').toDate(),
    to: new Date(),
  })

  const { data: tagDropdowns } = useGetTagDropdowns(org_id)
  // Scope the link picker to deep-link-enabled touch-points only — same predicate
  // as the deep-link RPCs (verified domain + deep_link_apps.enabled + apps>=1).
  // Without this the dropdown would surface plain short links that produce empty
  // results on this page.
  const { data: touchPointDropdowns } = useGetTouchPointDropdown(org_id, {
    deepLinkOnly: true,
  })
  // Full (unscoped) dropdown — used ONLY to resolve the display name of a selected
  // link that the deepLinkOnly picker no longer knows about (e.g. its custom domain
  // was deleted, so it dropped out of the deep-link universe). Without this, entering
  // the per-link view via ?tp_ids= for such a link renders a blank applied-filter chip
  // and no per-link banner. The picker itself stays deepLinkOnly. Mirrors the per-link
  // history augmentation in the deep-link RPCs.
  const { data: allTouchPointDropdowns } = useGetTouchPointDropdown(org_id)
  const { data: collectionsData, isLoading: isLoadingCollections } =
    useGetCollectionsDropdown(org_id)
  const accessibleCollections = collectionsData?.data || []

  // Normalise the date range to whole-day bounds (matches AnalyticByTag) so the RPC's
  // BETWEEN window is inclusive of both endpoint days.
  const formattedDateRange = useMemo(
    () => ({
      from: dayjs(dateRange?.from || dayjs().subtract(7, 'day').toDate())
        .startOf('day')
        .toDate(),
      to: dayjs(dateRange?.to || new Date())
        .endOf('day')
        .toDate(),
    }),
    [dateRange]
  )

  const { data: utmValues, isLoading: isLoadingUtmValues } = useGetDistinctUtmValues(org_id, {
    tag_ids: filters.tag_ids,
    tp_ids: filters.tp_ids,
    collection_ids: filters.collection_ids.length > 0 ? filters.collection_ids : undefined,
    date_range: formattedDateRange,
    exclude_bot: filters.exclude_bot,
  })

  // Selected link(s) the deepLinkOnly picker doesn't know about (no longer eligible),
  // resolved from the full dropdown so the chip + banner can still render their name.
  const historicalSelectedTps = useMemo(() => {
    if (filters.tp_ids.length === 0) return []
    const eligibleIds = new Set((touchPointDropdowns || []).map((tp) => tp.id))
    return (allTouchPointDropdowns || []).filter(
      (tp) => filters.tp_ids.includes(tp.id) && !eligibleIds.has(tp.id)
    )
  }, [filters.tp_ids, touchPointDropdowns, allTouchPointDropdowns])

  // Only offer touch points that carry the selected tags (mirrors AnalyticByTag) so the
  // link picker narrows as tags are applied. Selected-but-ineligible links are grafted on
  // so the applied-filter chip resolves their name; they aren't otherwise pickable noise.
  const touchPointOptions = useMemo(() => {
    const base =
      filters.tag_ids.length > 0
        ? (touchPointDropdowns || []).filter((tp) =>
            tp.tp_tag_links.some((link) => filters.tag_ids.includes(link.tag_id))
          )
        : touchPointDropdowns || []
    return historicalSelectedTps.length > 0 ? [...base, ...historicalSelectedTps] : base
  }, [filters.tag_ids, touchPointDropdowns, historicalSelectedTps])

  // When exactly one link is selected the page is the per-link view (Task 5.6 §3);
  // surface which link, so the scoped numbers read as intentional, not a glitch.
  // Fall back to the full dropdown for links no longer in the deep-link universe.
  const selectedLink =
    filters.tp_ids.length === 1
      ? (touchPointDropdowns?.find((tp) => tp.id === filters.tp_ids[0]) ??
        allTouchPointDropdowns?.find((tp) => tp.id === filters.tp_ids[0]))
      : undefined

  const deepLinkFilters = useMemo<DeepLinkAnalyticsQueryParams>(
    () => ({
      date_range: formattedDateRange,
      tp_ids: filters.tp_ids.length > 0 ? filters.tp_ids : undefined,
      tag_ids: filters.tag_ids.length > 0 ? filters.tag_ids : undefined,
      collection_ids: filters.collection_ids.length > 0 ? filters.collection_ids : undefined,
      exclude_bot: filters.exclude_bot,
      utm_source_values:
        filters.utm_source_values.length > 0 ? filters.utm_source_values : undefined,
      utm_medium_values:
        filters.utm_medium_values.length > 0 ? filters.utm_medium_values : undefined,
      utm_campaign_values:
        filters.utm_campaign_values.length > 0 ? filters.utm_campaign_values : undefined,
    }),
    [formattedDateRange, filters]
  )

  // Leaderboard row click re-scopes via the filter SETTERS, not a URL push: useAnalyticsFilters
  // seeds from the URL only at mount, so an in-page router.push wouldn't update the reducer state.
  const handleDrillDown = (groupBy: DeepLinkRankingGroupBy, key: string) => {
    if (groupBy === 'link') setTpIds([key])
    else if (groupBy === 'tag') setTagIds([key])
    else if (groupBy === 'space') setCollectionIds([key])
  }

  // Empty-state hint: the picker is gated to deep-link-enabled tps via
  // deepLinkOnly. If the *raw* fetch returns zero, the org has no eligible
  // links and the filter is dead-end. We point them at /custom-domains.
  // Distinguishes from `touchPointOptions.length === 0` (which can also be
  // zero after a tag filter narrows the set — a normal interaction).
  const showEmptyPickerHint = touchPointDropdowns?.length === 0

  return (
    <div className="space-y-6">
      {showEmptyPickerHint && (
        <div className="border-border bg-muted/30 text-muted-foreground flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span>{t('domain:deepLink.analytics.picker_empty_title')}</span>
          <Link
            href={`/org/${org_id}/custom-domains`}
            className="text-primary font-medium hover:underline"
          >
            {t('domain:deepLink.analytics.picker_empty_cta')}
          </Link>
        </div>
      )}
      <AnalyticFilters
        tags={tagDropdowns || []}
        selectedTagIds={filters.tag_ids}
        onTagChange={setTagIds}
        touchPoints={touchPointOptions}
        selectedTpIds={filters.tp_ids}
        onTouchPointChange={setTpIds}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        excludeBot={filters.exclude_bot}
        onExcludeBotChange={setExcludeBot}
        spaces={accessibleCollections}
        selectedSpaceIds={filters.collection_ids}
        onSpaceChange={setCollectionIds}
        selectedUtmSources={filters.utm_source_values}
        selectedUtmMediums={filters.utm_medium_values}
        selectedUtmCampaigns={filters.utm_campaign_values}
        onUtmSourceChange={setUtmSourceValues}
        onUtmMediumChange={setUtmMediumValues}
        onUtmCampaignChange={setUtmCampaignValues}
        availableUtmSources={utmValues?.utm_source || []}
        availableUtmMediums={utmValues?.utm_medium || []}
        availableUtmCampaigns={utmValues?.utm_campaign || []}
        isLoadingUtmValues={isLoadingUtmValues}
        disabledInteractionType
        disabledExcludeBot
        isLoading={isLoadingCollections}
      />
      {selectedLink && (
        <div className="flex items-center gap-2">
          <Link2 className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="text-foreground truncate text-sm font-medium">{selectedLink.name}</span>
          <span className="text-muted-foreground shrink-0 text-xs">
            · {t('domain:deepLink.analytics.per_link_view')}
          </span>
        </div>
      )}
      <DeepLinkAnalyticsBody filters={deepLinkFilters} onDrillDown={handleDrillDown} />
    </div>
  )
}
