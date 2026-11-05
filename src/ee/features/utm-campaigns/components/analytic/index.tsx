'use client'

import { useMemo, useState, useEffect } from 'react'
import { useGetUtmCampaignAnalytics } from '../../hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { AnalyticPieChart } from '@/features/analytics/components/charts/analytic-pie-chart'
import { useTranslation } from 'react-i18next'
import { CampaignOverview } from './campaign-overview'
import { CampaignChannels } from './campaign-channels'
import { CampaignTouchpoints } from './campaign-touchpoints'
import { CampaignTopPerformance } from './campaign-top-performance'
import { CampaignChannelsPieChart } from './campaign-channels-pie-chart'
import { CampaignChannelsHorizontalBarChart } from './campaign-channels-horizontal-bar-chart'
import { CampaignAnalyticsFilter } from './campaign-analytics-filter'
import { UTMCampaign } from '@/core/types/utm-campaign.type'
import { DateRange } from 'react-day-picker'
import dayjs from '@/shared/lib/dayjs'
import { CampaignChannelsLinks } from './campaign-channels-links'
import { CampaignDailyAreaChart } from './campaign-daily-area-chart'
import { CampaignChannelsSection } from './campaign-channel-section'

type Props = {
  orgId: string
  campaignId: string
  campaign?: UTMCampaign
  setSelectedChannelId?: (channelId: string | null) => void
}
export const CampaignAnalyticsView = ({
  orgId,
  campaignId,
  campaign,
  setSelectedChannelId,
}: Props) => {
  const { t } = useTranslation('analytic')

  // Determine default date range based on campaign duration
  const getDefaultDateRange = (): DateRange => {
    if (campaign?.start_date && campaign?.end_date) {
      const startDate = dayjs(campaign.start_date)
      const endDate = dayjs(campaign.end_date)
      const durationInMonths = endDate.diff(startDate, 'month', true)

      // If campaign duration is less than 1 month, use campaign dates
      if (durationInMonths < 1) {
        return {
          from: startDate.startOf('day').toDate(),
          to: endDate.endOf('day').toDate(),
        }
      }
    }

    // Default: last 7 days
    return {
      from: dayjs().subtract(7, 'day').toDate(),
      to: new Date(),
    }
  }

  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange())
  const [excludeBot, setExcludeBot] = useState(false)

  // Update date range when campaign changes
  useEffect(() => {
    setDateRange(getDefaultDateRange())
  }, [campaignId, campaign])

  // Format date range for API
  const formattedDateRange = {
    from: dayjs(dateRange?.from || dayjs().subtract(7, 'day').toDate())
      .startOf('day')
      .toDate(),
    to: dayjs(dateRange?.to || new Date())
      .endOf('day')
      .toDate(),
  }

  const { data: analytics, isLoading } = useGetUtmCampaignAnalytics(orgId, campaignId, {
    startTime: formattedDateRange.from,
    endTime: formattedDateRange.to,
    excludeBot,
  })

  // Sort daily data by totalVisits to get top performing dates
  const topPerformingDates = useMemo(() => {
    if (analytics?.daily && analytics.daily.length > 0) {
      return [...analytics.daily].sort((a, b) => b.totalVisits - a.totalVisits)
    }
    return []
  }, [analytics])

  return (
    <div className="flex flex-col gap-6 w-full overflow-x-hidden">
      {/* Filter Section */}
      <CampaignAnalyticsFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        excludeBot={excludeBot}
        onExcludeBotChange={setExcludeBot}
        isLoading={isLoading}
      />

      {/* Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.22fr_1fr] gap-6">
        <Card className="w-full min-h-40">
          <CardContent className="p-6">
            <LoadingMask className="w-full" loading={isLoading}>
              <CampaignOverview
                totalVisits={analytics?.totalVisits || 0}
                totalUniqueVisits={analytics?.totalUniqueVisits || 0}
              />
            </LoadingMask>
          </CardContent>
        </Card>
        <Card className="w-full min-h-40">
          <CardContent className="p-6">
            <LoadingMask className="w-full" loading={isLoading}>
              {analytics?.channels && analytics.channels.length > 0 ? (
                <CampaignChannels data={analytics.channels} orgId={orgId} />
              ) : (
                <EmptySection size="sm" title="No channels data" description="" />
              )}
            </LoadingMask>
          </CardContent>
        </Card>
      </div>

      {/* Touchpoints & Referrers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.22fr_1fr] gap-6">
        <CampaignChannelsSection
          analyticChannels={analytics?.channels ?? []}
          isLoading={isLoading}
          orgId={orgId}
        />
        <div className="flex flex-col gap-6">
          <Card className="w-full min-h-40">
            <CardContent className="p-6">
              <LoadingMask className="w-full" loading={isLoading}>
                {topPerformingDates.length > 0 ? (
                  <CampaignTopPerformance data={topPerformingDates} />
                ) : (
                  <EmptySection size="sm" title="No performance data" description="" />
                )}
              </LoadingMask>
            </CardContent>
          </Card>
          <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[450px] gap-4 min-w-0">
            <CardHeader className="p-0">
              <CardTitle>{t('by_touchpoint', 'By destinations')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)] p-0 overflow-y-auto">
              {analytics?.touchpoints && analytics.touchpoints.length > 0 ? (
                <CampaignTouchpoints data={analytics.touchpoints} />
              ) : isLoading ? (
                <Skeleton className="h-full" />
              ) : (
                <EmptySection size="lg" title="NO DATA" description="" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Daily Channel Performance */}
      <Card className="p-6 flex flex-col h-full min-h-[400px] max-h-[700px] gap-4 min-w-0">
        <CardHeader className="p-0">
          <CardTitle>{t('analytic:daily_performance', 'Daily Performance by Channel')}</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)] p-0">
          <LoadingMask className="w-full" loading={isLoading}>
            {analytics?.channelDaily && analytics.channelDaily.length > 0 ? (
              <CampaignDailyAreaChart
                data={analytics.channelDaily}
                orgId={orgId}
                isLoading={isLoading}
                dateRange={dateRange}
              />
            ) : (
              <EmptySection size="lg" title="NO DATA" description="" />
            )}
          </LoadingMask>
        </CardContent>
      </Card>

      {/* Channels, OS & Platform Section */}
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

      {/* Channels & Links with Analytics */}
      {campaign && (
        <CampaignChannelsLinks
          campaign={campaign}
          analytics={analytics}
          setSelectedChannelId={setSelectedChannelId}
        />
      )}
    </div>
  )
}
