'use client'

import { useParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { useGetAnalyticsByFilters } from '@/features/analytics/hooks/queries'
import { useAnalyticsFilters } from '@/features/analytics/hooks/use-analytics-filters'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { DateRange } from 'react-day-picker'
import { AnalyticPieChart } from '../charts/analytic-pie-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { AnalyticMapChart } from '../charts/analytic-map-chart'
import { AnalyticBarChart } from '../charts/analytic-bar-chart'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { mergeArrayObject } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { BotFilterToggle } from '../filters/bot-filter-toggle'
import { DestinationTable } from '../tables/destination-table'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { AnalyticOverview } from './analytic-overview'
import { InteractionChannels } from './interaction-channels'

export const AnalyticByTouchPoint = ({
  dateRange: initialDateRange,
  touchPointId,
}: {
  dateRange?: DateRange
  /**
   * Touch point cần phân tích. Khối này ra đời cho route `/short-links/[touch_point_id]` nên nó
   * đọc `useParams()`; trang chi tiết artifact KHÔNG có param đó (touch point nằm trong DTO), nên
   * prop này ưu tiên hơn param. Không truyền → giữ nguyên hành vi cũ.
   */
  touchPointId?: string
}) => {
  const params: { org_id: string; touch_point_id?: string } = useParams()
  const org_id = params.org_id
  const touch_point_id = touchPointId ?? params.touch_point_id ?? ''

  // Initialize multi-filter state management
  const { filters, setTagIds, setTpIds, setExcludeBot } = useAnalyticsFilters()

  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialDateRange || {
      from: dayjs().subtract(7, 'day').toDate(),
      to: new Date(),
    }
  )

  // Format date range for API
  const formattedDateRange = {
    from: dayjs(dateRange?.from || dayjs().subtract(7, 'day').toDate())
      .startOf('day')
      .toDate(),
    to: dayjs(dateRange?.to || new Date())
      .endOf('day')
      .toDate(),
  }

  // Fetch analytics data with unified query supporting multiple filters
  // Always include the current touch point ID in the filter
  const { data: analytics, isLoading } = useGetAnalyticsByFilters(
    org_id,
    {
      tag_ids: filters.tag_ids,
      tp_ids: [touch_point_id, ...filters.tp_ids],
      date_range: formattedDateRange,
      exclude_bot: filters.exclude_bot,
    },
    true // use this for specific page
  )

  const { t } = useTranslation('analytic')
  const referrers = useMemo(() => {
    if (analytics?.referrers && analytics.referrers.length > 0) {
      const popularReferrers = [
        'facebook',
        'google',
        'zalo',
        'telegram',
        'whatsapp',
        'linkedin',
      ]?.map((referrer) => ({ name: referrer, count: 0 }))
      return mergeArrayObject(analytics?.referrers, popularReferrers, 'count', 'name')
    }
    return []
  }, [analytics])
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-4 overflow-x-auto">
        {/* Date Range Filter */}
        <DateRangePicker
          value={dateRange}
          placeholder={t('filter_by_date')}
          onValueChange={(value) => setDateRange(value)}
          disableFutureDate
          className="bg-background"
        />

        {/* Bot Filter Toggle */}
        <BotFilterToggle
          value={filters.exclude_bot}
          onChange={(value) => setExcludeBot(value)}
          disabled={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2.18fr_1fr] gap-6">
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
              <InteractionChannels data={analytics?.types || []} showComingSoon={false} />
            </LoadingMask>
          </CardContent>
        </Card>
        <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[450px] gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('by_referrer')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-2rem)] p-0">
            {referrers && referrers?.length > 0 ? (
              <AnalyticBarChart data={referrers || []} title="Referrer" />
            ) : isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <EmptySection size="lg" title="NO DATA" description="" />
            )}
          </CardContent>
        </Card>
        <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[450px] gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('common:label.os')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-2rem)] p-0">
            {analytics?.totalVisits && analytics?.totalVisits > 0 ? (
              <AnalyticPieChart
                data={analytics?.os || []}
                title={t('common:label.os')}
                totalVisits={analytics?.totalVisits}
              />
            ) : isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <EmptySection size="lg" title="NO DATA" description="" />
            )}
          </CardContent>
        </Card>
        <Card className="p-6 min-h-[400px] max-h-[450px] min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('analytic:by_destination')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-6 h-[calc(100%-2rem)]">
            <Suspense fallback={<SkeletonCard bodyParts={6} className="h-full w-full" />}>
              <DestinationTable
                org_id={org_id}
                tp_id={touch_point_id}
                params={{
                  date_range: formattedDateRange,
                  exclude_bot: filters.exclude_bot,
                }}
              />
            </Suspense>
          </CardContent>
        </Card>
        <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[450px] gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('common:label.device_type')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-2rem)] p-0">
            {analytics?.totalVisits && analytics?.totalVisits > 0 ? (
              <AnalyticPieChart
                data={analytics?.platforms || []}
                title={t('common:label.device_type')}
                totalVisits={analytics?.totalVisits}
              />
            ) : isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <EmptySection size="lg" title="NO DATA" description="" />
            )}
          </CardContent>
        </Card>
      </div>
      {/* Card tự gọi `/analytics/geo` nên không cần `LoadingMask`, và chiều cao phải nở được:
          `max-h` + `overflow-hidden` cắt mất dòng ghi công giấy phép DB-IP ở chân card. */}
      <Card className="2xl:col-span-2 w-full flex flex-col gap-4 min-h-[400px]">
        <CardHeader className="p-6 pb-4">
          <CardTitle>{t('by_location')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 flex-1">
          <AnalyticMapChart
            orgId={org_id}
            params={{
              tag_ids: filters.tag_ids,
              tp_ids: [touch_point_id, ...filters.tp_ids],
              date_range: formattedDateRange,
              exclude_bot: filters.exclude_bot,
            }}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
    </div>
  )
}
