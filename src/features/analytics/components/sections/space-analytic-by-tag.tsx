'use client'

import { useParams } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import {
  useGetSpaceAnalyticsByFilters,
  useGetDistinctUtmValues,
} from '@/features/analytics/hooks/queries'
import { useAnalyticsFilters } from '@/features/analytics/hooks/use-analytics-filters'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useGetTouchPointDropdown } from '@/features/touch-points/hooks/queries'
import { DateRange } from 'react-day-picker'
import { AnalyticPieChart } from '../charts/analytic-pie-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { AnalyticMapChart } from '../charts/analytic-map-chart'
import { AnalyticBarChart } from '../charts/analytic-bar-chart'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { EmptySection } from '@/shared/components/customize/empty-section'
// import { DashboardTopPerformanceDate } from '@/features/dashboard/components/sections/dashboard-top-performance-date'
import { mergeArrayObject } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'
import { RawVisitDataVirtualList } from './RawVisitDataVirtualList'
import { AnalyticOverview } from './analytic-overview'
import { InteractionChannels } from './interaction-channels'
import { AnalyticFilters } from '../filters/filters'
import { BarChart3 } from 'lucide-react'

export const SpaceAnalyticByTag = ({ spaceId }: { spaceId: string }) => {
  const { org_id }: { org_id: string } = useParams()

  // Fetch dropdown data for filters
  const { data: tagDropdowns } = useGetTagDropdowns(org_id)
  const { data: touchPointDropdowns } = useGetTouchPointDropdown(org_id)

  // Initialize multi-filter state management
  const {
    filters,
    setTagIds,
    setTpIds,
    setExcludeBot,
    setUtmSourceValues,
    setUtmMediumValues,
    setUtmCampaignValues,
  } = useAnalyticsFilters()

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dayjs().subtract(7, 'day').toDate(),
    to: new Date(),
  })

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
    collection_ids: [spaceId],
    date_range: formattedDateRange,
    exclude_bot: filters.exclude_bot,
  })

  // Fetch analytics for this specific space
  const { data: analytics, isLoading } = useGetSpaceAnalyticsByFilters(org_id, spaceId, {
    tag_ids: filters.tag_ids,
    tp_ids: filters.tp_ids,
    date_range: formattedDateRange,
    exclude_bot: filters.exclude_bot,
    utm_source_values: filters.utm_source_values,
    utm_medium_values: filters.utm_medium_values,
    utm_campaign_values: filters.utm_campaign_values,
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <LoadingMask loading={true} className="w-full h-96">
          <div />
        </LoadingMask>
      </div>
    )
  }

  if (!analytics || analytics.totalVisits === 0) {
    return (
      <div className="flex flex-col gap-6 w-full">
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
          isLoading={isLoading}
        />
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <BarChart3 className="h-16 w-16 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">{t('no_data')}</h3>
            <p className="text-sm text-muted-foreground">{t('no_data_description')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
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
        isLoading={isLoading}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.22fr_1fr] 2xl:grid-cols-[1.22fr_1fr_1fr] gap-6">
        <Card className="2xl:col-span-2 w-full min-h-40">
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
              <InteractionChannels data={analytics?.types || []} showComingSoon={false} />
            </LoadingMask>
          </CardContent>
        </Card>
        {/* <Card className="w-full min-h-40 lg:col-span-2 2xl:col-span-1">
          <CardContent className="p-6">
            <LoadingMask className="w-full" loading={isLoading}>
              <DashboardTopPerformanceDate data={analytics?.topPerformingDates || []} />
            </LoadingMask>
          </CardContent>
        </Card> */}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.22fr_1fr] 2xl:grid-cols-[0.7fr_0.7fr_1fr] gap-6">
        <Card className="2xl:col-span-2 p-6 flex flex-col gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('by_referrer')}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            <LoadingMask className="w-full h-full" loading={isLoading}>
              {referrers && referrers?.length > 0 ? (
                <AnalyticBarChart data={referrers} title="Referrer" />
              ) : (
                <EmptySection />
              )}
            </LoadingMask>
          </CardContent>
        </Card>
        <Card className="p-6 flex flex-col gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('common:label.os')}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <LoadingMask className="w-full" loading={isLoading}>
              {analytics?.totalVisits && analytics?.totalVisits > 0 ? (
                <AnalyticPieChart
                  data={analytics?.os || []}
                  title={t('common:label.os')}
                  totalVisits={analytics?.totalVisits}
                />
              ) : (
                <EmptySection />
              )}
            </LoadingMask>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.22fr_1fr] 2xl:grid-cols-[0.7fr_0.7fr_1fr] gap-6">
        <Card className="2xl:col-span-2 w-full flex flex-col gap-4">
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
                collection_ids: [spaceId],
              }}
            />
          </CardContent>
        </Card>
        <Card className="p-6 flex flex-col h-full gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('common:label.device_type')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)] p-0">
            <LoadingMask className="w-full h-full" loading={isLoading}>
              {analytics?.totalVisits && analytics?.totalVisits > 0 ? (
                <AnalyticPieChart
                  data={analytics?.platforms || []}
                  title={t('common:label.device_type')}
                  totalVisits={analytics?.totalVisits}
                />
              ) : (
                <EmptySection />
              )}
            </LoadingMask>
          </CardContent>
        </Card>
      </div>
      {/* Card tự gọi `/analytics/geo` nên không cần `LoadingMask`, và chiều cao phải nở được:
          `max-h` + `overflow-hidden` cắt mất dòng ghi công giấy phép DB-IP ở chân card.
          Space = collection, nên phạm vi truyền qua `collection_ids` — endpoint geo là endpoint
          cấp org, không có biến thể `/spaces/{id}/`. */}
      <Card className="2xl:col-span-2 w-full flex flex-col gap-4 min-h-[400px]">
        <CardHeader className="p-6 pb-4">
          <CardTitle>{t('by_location')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 flex-1">
          <AnalyticMapChart
            orgId={org_id}
            params={{
              tag_ids: filters.tag_ids,
              tp_ids: filters.tp_ids,
              collection_ids: [spaceId],
              date_range: formattedDateRange,
              exclude_bot: filters.exclude_bot,
              utm_source_values: filters.utm_source_values,
              utm_medium_values: filters.utm_medium_values,
              utm_campaign_values: filters.utm_campaign_values,
            }}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
    </div>
  )
}
