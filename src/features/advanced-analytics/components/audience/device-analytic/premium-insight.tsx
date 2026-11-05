import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import {
  getEngagementAdvantageColor,
  getPlatformIcon,
} from '@/features/advanced-analytics/utils/helper'
import { Target, Crown } from 'lucide-react'
import { PremiumInsights as PremiumInsightsType } from '@/core/types/analytics/device-analytic.type'
import { useTranslation } from 'react-i18next'

const PremiumInsights = () => {
  const { t } = useTranslation('advanced_analytics')
  const { timePeriod, selectedTags, selectedTouchpoints, spaceId, selectedSpaceIds } =
    useAdvancedAnalyticsProvider()
  const { org_id } = useParams<{ org_id: string }>()
  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data: deviceAnalysisData } = useAdvancedAnalytics(org_id, 'device-analysis', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const premiumInsights: PremiumInsightsType = deviceAnalysisData?.insights?.premium_insights || {
    engagement_leader: {
      engagement_advantage: '',
      platform: '',
      visits_per_user: 0,
    },
    cross_platform_users: {
      count: 0,
      percentage: 0,
    },
    usage_timing: [],
  }

  if (!premiumInsights) {
    return <></>
  }

  return (
    <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
      <div className="flex items-center space-x-3 mb-6">
        <Target className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            {t('device_analytic.premium_insight.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">{t('device_analytic.premium_insight.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Engagement Leader */}
        <div className="bg-card rounded-lg p-4 border border-green-200">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🏆</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getEngagementAdvantageColor(
                    premiumInsights?.engagement_leader?.engagement_advantage || ''
                  )}`}
                >
                  {premiumInsights?.engagement_leader?.engagement_advantage} Engagement
                </div>
              </div>
              <div className="font-medium text-gray-900 mb-1">
                {t('device_analytic.premium_insight.engagement_leader')} {premiumInsights?.engagement_leader?.platform}
              </div>
              <div className="text-sm text-gray-700 mb-2">
                <strong>{premiumInsights?.engagement_leader?.visits_per_user}</strong> {t('device_analytic.premium_insight.avg_visits_per_user')}
              </div>
              <div className="text-sm text-green-700">
                {t('device_analytic.premium_insight.highest_engagement')}
              </div>
            </div>
          </div>
        </div>

        {/* Cross-Platform Users */}
        <div className="bg-background rounded-lg p-4 border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🔄</div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">{t('device_analytic.premium_insight.cross_platform')}</div>
              <div className="text-sm text-gray-700 mb-2">
                <strong>{premiumInsights?.cross_platform_users?.count}</strong> users (
                {premiumInsights?.cross_platform_users?.percentage}%) {t('device_analytic.premium_insight.cross_platform_desc')}
              </div>
              <div className="text-sm text-blue-700">
                💡{' '}
                {premiumInsights?.cross_platform_users?.percentage < 5
                  ? t('device_analytic.premium_insight.loyal_users')
                  : premiumInsights?.cross_platform_users?.percentage < 15
                  ? t('device_analytic.premium_insight.moderate_cross')
                  : t('device_analytic.premium_insight.high_cross')}
              </div>
            </div>
          </div>
        </div>

        {/* Usage Timing */}
        {premiumInsights.usage_timing?.length > 0 && (
          <div className="bg-background rounded-lg p-4 border border-purple-200">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">⏰</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-3">{t('device_analytic.premium_insight.timing_prefs')}</div>
                <div className="space-y-2">
                  {premiumInsights.usage_timing.map((timing, index) => (
                    <div
                      key={timing.platform}
                      className="flex items-center justify-between bg-slate-100 rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-2">
                        {getPlatformIcon(timing.platform)}
                        <span className="font-medium text-gray-900">{timing.platform}</span>
                      </div>
                      <div className="text-right">
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            timing.peak_time === 'business_hours'
                              ? 'bg-blue-100 text-blue-800'
                              : timing.peak_time === 'weekends'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {timing.peak_time === 'business_hours'
                            ? t('device_analytic.premium_insight.business_hours')
                            : timing.peak_time === 'weekends'
                            ? t('device_analytic.premium_insight.weekends')
                            : t('device_analytic.premium_insight.balanced')}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {timing.business_hours_pct}{t('device_analytic.premium_insight.business_hours_pct')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PremiumInsights
