'use client'

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect, useRef } from 'react'
import {
  useGetAnalyticsByFilters,
  useGetDistinctUtmValues,
} from '@/features/analytics/hooks/queries'
import { useAnalyticsFilters } from '@/features/analytics/hooks/use-analytics-filters'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useGetTouchPointDropdown } from '@/features/touch-points/hooks/queries'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { DateRange } from 'react-day-picker'
import { AnalyticPieChart } from '../charts/analytic-pie-chart'
import { AnalyticDonutChart } from '../charts/analytic-donut-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { AnalyticMapChart } from '../charts/analytic-map-chart'
import { AnalyticBarChart } from '../charts/analytic-bar-chart'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { DashboardTopPerformanceDate } from '@/features/dashboard/components/sections/dashboard-top-performance-date'
import { mergeArrayObject } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'
import { useDemoMode } from '@/shared/hooks/use-demo-mode'
import { RawVisitDataVirtualList } from './RawVisitDataVirtualList'
import { AnalyticOverview } from './analytic-overview'
import { InteractionChannels } from './interaction-channels'
import RealtimeData from '@/features/realtime-data/components'
import { AnalyticFilters } from '../filters/filters'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { AnalyticPerformanceByDate } from './analytic-performance-by-date'
import { Typography } from '@/shared/components/ui/typography'
import { MousePointerClick } from 'lucide-react'
import { RankingWrapper } from './ranking-by-links'
import { RankingByUTMAndReferrers } from './ranking-by-utm-and-referrers'
import { DetailEngagement } from './detail-engagement'

// Color palette for touch-point badges with good contrast
// Based on theme colors with accessible contrast ratios
const touchPointColors = [
  '#6B46C1', // Purple
  '#0891B2', // Cyan
  '#2563EB', // Blue
  '#D97706', // Amber
  '#16A34A', // Green
  '#E11D48', // Rose
  '#7C3AED', // Violet
  '#0284C7', // Sky
  '#059669', // Emerald
  '#9333EA', // Fuchsia
]

export const AnalyticByTag = ({}: {}) => {
  const { org_id }: { org_id: string } = useParams()

  // Fetch dropdown data for filters
  const { data: tagDropdowns } = useGetTagDropdowns(org_id)
  const { data: touchPointDropdowns } = useGetTouchPointDropdown(org_id)
  const { data: collectionsData, isLoading: isLoadingCollections } =
    useGetCollectionsDropdown(org_id)
  const accessibleCollections = collectionsData?.data || []

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const hasInit = useRef(false)

  // Initialize multi-filter state management
  const {
    filters,
    setTagIds,
    setTpIds,
    setExcludeBot,
    setCollectionIds: setSelectedCollectionIds,
    setUtmSourceValues,
    setUtmMediumValues,
    setUtmCampaignValues,
    setInteractionTypes,
  } = useAnalyticsFilters()

  useEffect(() => {
    if (hasInit.current) return

    const filtersParam = searchParams.get('filters')
    const slugParam = searchParams.get('slug')

    if (!filtersParam && !slugParam) return

    if (filtersParam) {
      const parsedFilters = JSON.parse(filtersParam || '{}')
      if (parsedFilters.collection_ids) {
        setSelectedCollectionIds(parsedFilters.collection_ids)
      }
    }

    if (slugParam) {
      if (!touchPointDropdowns) return
      const match = touchPointDropdowns.find((tp) => tp.slug === slugParam)
      if (match) setTpIds([match.id])
    }

    router.replace(pathname, { scroll: false })
    hasInit.current = true
  }, [searchParams, touchPointDropdowns])

  const { isDemoMode } = useDemoMode()

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: isDemoMode ? dayjs().subtract(1, 'year').toDate() : dayjs().subtract(7, 'day').toDate(),
    to: new Date(),
  })

  const selectedCollectionIds = filters.collection_ids

  // Format date range for API
  const formattedDateRange = {
    from: dayjs(dateRange?.from || dayjs().subtract(7, 'day').toDate())
      .startOf('day')
      .toDate(),
    to: dayjs(dateRange?.to || new Date())
      .endOf('day')
      .toDate(),
  }

  // Fetch distinct UTM values for filter dropdowns
  const { data: utmValues, isLoading: isLoadingUtmValues } = useGetDistinctUtmValues(org_id, {
    tag_ids: filters.tag_ids,
    tp_ids: filters.tp_ids,
    collection_ids: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
    date_range: formattedDateRange,
    exclude_bot: filters.exclude_bot,
  })

  // Fetch analytics data with unified query supporting multiple filters
  const { data: analytics, isLoading } = useGetAnalyticsByFilters(org_id, {
    tag_ids: filters.tag_ids,
    tp_ids: filters.tp_ids,
    collection_ids: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
    date_range: formattedDateRange,
    exclude_bot: filters.exclude_bot,
    utm_source_values: filters.utm_source_values,
    utm_medium_values: filters.utm_medium_values,
    utm_campaign_values: filters.utm_campaign_values,
    interaction_types: filters.interaction_types,
  })

  const referrers = useMemo(() => {
    if (analytics?.referrers && analytics.referrers.length > 0) {
      const popularReferrers = [
        'facebook',
        'google',
        'zalo',
        'telegram',
        'whatsapp',
        'linkedin',
      ].map((referrer) => ({ name: referrer, count: 0 }))
      return mergeArrayObject(analytics?.referrers, popularReferrers, 'count', 'name')
    }
    return []
  }, [analytics])
  const { t } = useTranslation('analytic')

  const touchPointOptions = useMemo(() => {
    if (filters.tag_ids.length > 0) {
      return (
        touchPointDropdowns?.filter((tp) =>
          tp.tp_tag_links.some((tp_tag_link) => filters.tag_ids.includes(tp_tag_link.tag_id))
        ) || []
      )
    }
    return touchPointDropdowns || []
  }, [filters.tag_ids, touchPointDropdowns])
  useEffect(() => {
    if (filters.tp_ids.length > 0) {
      const needUpdate = filters.tp_ids.some(
        (tp_id) => !touchPointOptions.map((tp) => tp.id).includes(tp_id)
      )
      if (needUpdate) {
        const newTpIds = filters.tp_ids.filter((tp_id) =>
          touchPointOptions.map((tp) => tp.id).includes(tp_id)
        )
        setTpIds(newTpIds)
      }
    }
  }, [touchPointOptions, filters.tp_ids])

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <AnalyticFilters
        tags={tagDropdowns || []}
        selectedTagIds={filters.tag_ids}
        onTagChange={setTagIds}
        touchPoints={touchPointOptions || []}
        selectedTpIds={filters.tp_ids}
        onTouchPointChange={setTpIds}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        excludeBot={filters.exclude_bot}
        onExcludeBotChange={setExcludeBot}
        spaces={accessibleCollections}
        selectedSpaceIds={selectedCollectionIds}
        onSpaceChange={setSelectedCollectionIds}
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
        selectedInteractionTypes={filters.interaction_types}
        onInteractionTypeChange={setInteractionTypes}
        isLoading={isLoading || isLoadingCollections}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="w-full min-h-40">
          <CardContent className="p-6">
            <LoadingMask className="w-full" loading={isLoading}>
              <AnalyticOverview
                totalVisits={analytics?.totalVisits || 0}
                totalUniqueVisits={analytics?.totalUniqueVisits || 0}
              />
            </LoadingMask>
          </CardContent>
        </Card>
        <Card className="w-full min-h-40">
          <CardContent className="p-6">
            <LoadingMask className="w-full" loading={isLoading}>
              <InteractionChannels
                data={analytics?.types || []}
                showComingSoon={false}
                selectedInteractionTypes={filters.interaction_types}
              />
            </LoadingMask>
          </CardContent>
        </Card>
      </div>
      <Card className="h-103 flex flex-col">
        <CardContent className="p-6 min-h-0">
          <AnalyticPerformanceByDate
            data={analytics?.performance_by_date ?? {}}
            dateRange={dateRange}
          />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col gap-4 min-w-0 h-65 group/chart">
          <CardHeader className="p-0 text-slate-700 text-base">
            <div className="flex justify-between items-center">
              <CardTitle>{t('common:label.device_type')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100%-2rem)] p-0">
            {analytics?.totalVisits && analytics?.totalVisits > 0 ? (
              <AnalyticDonutChart
                data={analytics?.platforms || []}
                title={t('common:label.device_type')}
                totalVisits={analytics?.totalVisits}
              />
            ) : isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <EmptySection size="md" title="NO DATA" description="" />
            )}
          </CardContent>
        </Card>
        <Card className="p-6 flex flex-col h-65 gap-4 min-w-0 group/chart">
          <CardHeader className="p-0 text-slate-700 text-base">
            <div className="flex justify-between items-center">
              <CardTitle>{t('common:label.os')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100%-2rem)] p-0">
            {analytics?.totalVisits && analytics?.totalVisits > 0 ? (
              <AnalyticDonutChart
                data={analytics?.os || []}
                title={t('common:label.os')}
                totalVisits={analytics?.totalVisits}
              />
            ) : isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <EmptySection size="md" title="NO DATA" description="" />
            )}
          </CardContent>
        </Card>
      </div>
      {/* <Card className="2xl:col-span-2 p-6 flex flex-col h-full min-h-[400px] max-h-[450px] gap-4 min-w-0">
        <CardHeader className="p-0">
          <CardTitle>{t('by_referrer')}</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)] p-0">
          {referrers && referrers?.length > 0 ? (
            <AnalyticBarChart data={referrers || []} title="Referrer" />
          ) : isLoading ? (
            <Skeleton className="h-full" />
          ) : (
            <EmptySection size="lg" title="NO DATA" description="" />
          )}
        </CardContent>
      </Card> */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankingWrapper
          dateRange={dateRange}
          excludeBot={filters.exclude_bot}
          tagIds={filters.tag_ids}
          tpIds={filters.tp_ids}
          collectionIds={selectedCollectionIds}
          utmSourceValues={filters.utm_source_values}
          utmMediumValues={filters.utm_medium_values}
          utmCampaignValues={filters.utm_campaign_values}
          interactionTypes={filters.interaction_types}
        />
        <RankingByUTMAndReferrers
          dateRange={dateRange}
          excludeBot={filters.exclude_bot}
          tagIds={filters.tag_ids}
          tpIds={filters.tp_ids}
          collectionIds={selectedCollectionIds}
          utmSourceValues={filters.utm_source_values}
          utmMediumValues={filters.utm_medium_values}
          utmCampaignValues={filters.utm_campaign_values}
          interactionTypes={filters.interaction_types}
        />
      </div>
      {/* <Card className="2xl:col-span-2 w-full flex flex-col gap-4 min-h-[400px] max-h-[450px]">
        <CardHeader className="p-6 pb-4">
          <CardTitle>{t('raw_visit_data')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 flex-1 overflow-hidden">
          <RawVisitDataVirtualList
            orgId={org_id}
            params={{
              tag_ids: filters.tag_ids,
              tp_ids: filters.tp_ids,
              date_range: formattedDateRange,
              exclude_bot: filters.exclude_bot,
              collection_ids: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
              utm_sources: filters.utm_source_values,
              utm_mediums: filters.utm_medium_values,
              utm_campaigns: filters.utm_campaign_values,
              interaction_types: filters.interaction_types,
            }}
          />
        </CardContent>
      </Card> */}
      {/* Không bọc `LoadingMask` và không ghim `max-h`: card này tự gọi `/analytics/geo` nên có
          trạng thái tải riêng, còn chiều cao phải nở được — `overflow-hidden` từng cắt mất dòng
          ghi công giấy phép DB-IP ở chân card. */}
      <Card className="w-full p-6 flex flex-col gap-6">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-medium text-slate-700">{t('by_location')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AnalyticMapChart
            orgId={org_id}
            params={{
              tag_ids: filters.tag_ids,
              tp_ids: filters.tp_ids,
              collection_ids: selectedCollectionIds,
              date_range: formattedDateRange,
              exclude_bot: filters.exclude_bot,
              utm_source_values: filters.utm_source_values,
              utm_medium_values: filters.utm_medium_values,
              utm_campaign_values: filters.utm_campaign_values,
              interaction_types: filters.interaction_types,
            }}
          />
        </CardContent>
      </Card>

      {/* Realtime gom từ trang riêng vào đây, đặt ngay dưới bản đồ theo yêu cầu chủ sản phẩm
          2026-10-23. Bỏ dải thẻ tổng vì phần Overview phía trên đã có các số đó.
          Khối này có cửa sổ thời gian riêng (24h/3 ngày/7 ngày) và KHÔNG theo bộ lọc ngày của
          trang — nó đọc `get_realtime_data_v4` chứ không đi qua `get_visits_analytics_v4`. */}
      <RealtimeData showSummary={false} />

      <div className="grid grid-cols-1 gap-6">
        <DetailEngagement
          orgId={org_id}
          dateRange={dateRange}
          excludeBot={filters.exclude_bot}
          tagIds={filters.tag_ids}
          tpIds={filters.tp_ids}
          collectionIds={selectedCollectionIds}
          utmSourceValues={filters.utm_source_values}
          utmMediumValues={filters.utm_medium_values}
          utmCampaignValues={filters.utm_campaign_values}
          interactionTypes={filters.interaction_types}
        />
      </div>
    </div>
  )
}
