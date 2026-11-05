'use client'

import { useMemo, useState } from 'react'
import { useGetCampaignChannelAnalytics } from '../../hooks/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { AnalyticPieChart } from '@/features/analytics/components/charts/analytic-pie-chart'
import { useTranslation } from 'react-i18next'
import { useGetCampaignChannelDropdown } from '../../hooks'
import { ChannelOverview } from './channel-overview'
import { ChannelTouchpoints } from './channel-touchpoints'
import { ChannelTopPerformance } from './channel-top-performance'
import { ChannelAnalyticsFilter } from './channel-analytics-filter'
import { ChannelDailyLineChart } from './channel-daily-line-chart'
import { DateRange } from 'react-day-picker'
import dayjs from '@/shared/lib/dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const ChannelAnalyticsView = ({
  orgId,
  campaignId,
  campaignName,
  channelId,
  channelName,
  channelColor,
  onBack,
}: {
  orgId: string
  campaignId: string
  campaignName: string
  channelId: string
  channelName?: string // Optional channel name prop
  channelColor?: string // Optional channel color prop
  onBack: () => void
}) => {
  const { t } = useTranslation('analytic')

  // Use provided channelName or fallback to querying
  const { data: channelDropdown } = useGetCampaignChannelDropdown(orgId)

  // Get channel name - use prop if provided, otherwise query
  const finalChannelName =
    channelName || channelDropdown?.find((ch) => ch.id === channelId)?.name || channelId

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dayjs().subtract(7, 'day').toDate(),
    to: new Date(),
  })
  const [excludeBot, setExcludeBot] = useState(false)

  // Format date range for API
  const formattedDateRange = {
    from: dayjs(dateRange?.from || dayjs().subtract(7, 'day').toDate())
      .startOf('day')
      .toDate(),
    to: dayjs(dateRange?.to || new Date())
      .endOf('day')
      .toDate(),
  }

  const { data: analytics, isLoading } = useGetCampaignChannelAnalytics(
    orgId,
    campaignId,
    channelId,
    {
      startTime: formattedDateRange.from,
      endTime: formattedDateRange.to,
      excludeBot,
    }
  )

  // Sort daily data by totalVisits to get top performing dates
  const topPerformingDates = useMemo(() => {
    if (analytics?.daily && analytics.daily.length > 0) {
      return [...analytics.daily].sort((a, b) => b.totalVisits - a.totalVisits)
    }
    return []
  }, [analytics])

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 p-4 rounded-lg bg-background">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Campaign: {campaignName}</span>
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground font-medium">{finalChannelName}</span>
      </div>

      {/* Filter Section */}
      <ChannelAnalyticsFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        excludeBot={excludeBot}
        onExcludeBotChange={setExcludeBot}
        isLoading={isLoading}
      />

      {/* Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="w-full min-h-40">
          <CardContent className="p-6">
            <LoadingMask className="w-full" loading={isLoading}>
              <ChannelOverview
                totalVisits={analytics?.totalVisits || 0}
                totalUniqueVisits={analytics?.totalUniqueVisits || 0}
              />
            </LoadingMask>
          </CardContent>
        </Card>
        <Card className="w-full min-h-40">
          <CardContent className="p-6">
            <LoadingMask className="w-full" loading={isLoading}>
              {topPerformingDates.length > 0 ? (
                <ChannelTopPerformance data={topPerformingDates} />
              ) : (
                <EmptySection size="sm" title="No performance data" description="" />
              )}
            </LoadingMask>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[650px] gap-4 min-w-0">
        <CardHeader className="p-0">
          <CardTitle>{t('daily_trend', 'Daily Trend')}</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)] p-0">
          <LoadingMask className="w-full h-full" loading={isLoading}>
            <ChannelDailyLineChart data={analytics?.daily || []} dateRange={dateRange} />
          </LoadingMask>
        </CardContent>
      </Card>

      {/* Touchpoints Section */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[450px] gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('by_touchpoint', 'By destinations')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)] p-0 overflow-y-auto">
            {analytics?.touchpoints && analytics.touchpoints.length > 0 ? (
              <ChannelTouchpoints data={analytics.touchpoints} />
            ) : isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <EmptySection size="lg" title="NO DATA" description="" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* OS & Platform Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[450px] gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('common:label.os')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)] p-0">
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
        <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[450px] gap-4 min-w-0">
          <CardHeader className="p-0">
            <CardTitle>{t('common:label.device_type')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)] p-0">
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
    </div>
  )
}
