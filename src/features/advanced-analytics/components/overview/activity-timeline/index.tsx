import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { Crown } from 'lucide-react'
import { HeaderSection } from '../../header-section'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { ActivityLineChart } from './activity-line-chart'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

const ActivityTimeline = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const {
    allowExtraAdvancedAnalytic,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } = useAdvancedAnalyticsProvider()

  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data: dailyTrendData } = useAdvancedAnalytics(org_id, 'daily-trend', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-6 flex-col">
        <HeaderSection
          title={t('activity_timeline.title')}
          description={t('activity_timeline.description_free', { days: timePeriod })}
          premiumDescription={t('activity_timeline.description_premium')}
          textSize="lg"
        />
        <div className="flex w-full justify-end items-end space-x-2">
          {!allowExtraAdvancedAnalytic && (
            <div className="flex items-center space-x-1 text-xs text-purple-600">
              <Crown className="w-3 h-3" />
              <span>{t('activity_timeline.upgrade_badge')}</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            {allowExtraAdvancedAnalytic && t('activity_timeline.day_detail_view', { days: timePeriod })}
          </div>
        </div>
      </div>

      <ActivityLineChart dailyTrendData={dailyTrendData} />

      {/* Tier-Conditional Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        {!allowExtraAdvancedAnalytic ? (
          /* FREE TIER: Basic Summary + Upgrade Prompt */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg p-3 border border-gray-200">
              <div className="text-sm font-medium text-gray-900">{t('activity_timeline.recent_activity')}</div>
              <div className="text-xs text-gray-600 mt-1">
                {t('activity_timeline.recent_activity_stat', {
                  days: timePeriod,
                  count: dailyTrendData?.daily_data
                    ?.slice(-timePeriod)
                    ?.reduce((sum, day) => sum + day.total_interactions, 0) ?? 0,
                })}
              </div>
            </div>

            <div className="bg-linear-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-purple-900">{t('activity_timeline.premium_analytics')}</div>
                  <div className="text-xs text-purple-700 mt-1">
                    {t('activity_timeline.premium_unlock')}
                  </div>
                </div>
                <Crown className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </div>
        ) : (
          /* PREMIUM TIER: Full Analytics Summary */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className=" rounded-lg p-3">
              <div className="text-sm font-medium text-gray-900">{t('activity_timeline.engagement_pattern')}</div>
              {dailyTrendData?.summary ? (
                <div className="text-xs text-gray-600 mt-1">
                  {t('activity_timeline.engagement_stat', {
                    active: dailyTrendData.summary.days_with_activity || 0,
                    total: dailyTrendData.summary.total_days || 0,
                    rate: Math.round(
                      (dailyTrendData.summary.days_with_activity /
                        dailyTrendData.summary.total_days) *
                        100
                    ) || 0,
                  })}
                </div>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </div>

            <div className=" rounded-lg p-3">
              <div className="text-sm font-medium text-gray-900">{t('activity_timeline.peak_performance')}</div>
              {dailyTrendData?.summary ? (
                <div className="text-xs text-gray-600 mt-1">
                  {t('activity_timeline.peak_stat', {
                    count: dailyTrendData.daily_data[dailyTrendData.daily_data.length - 1].total_interactions,
                    day: new Date(
                      dailyTrendData.daily_data[dailyTrendData.daily_data.length - 1].date
                    ).toLocaleDateString('en', { weekday: 'short' }),
                    pct: Math.round(
                      (dailyTrendData.daily_data[dailyTrendData.daily_data.length - 1]
                        .total_interactions /
                        16) *
                        100
                    ) || 0,
                  })}
                </div>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </div>

            <div className=" rounded-lg p-3">
              <div className="text-sm font-medium text-gray-900">{t('activity_timeline.insights')}</div>
              {dailyTrendData?.summary ? (
                <div className="text-xs text-orange-600 mt-1">
                  {dailyTrendData.summary.days_with_activity < 4
                    ? t('activity_timeline.insight_low')
                    : t('activity_timeline.insight_good')}
                </div>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default ActivityTimeline
