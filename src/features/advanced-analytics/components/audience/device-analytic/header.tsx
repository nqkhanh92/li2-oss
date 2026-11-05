import { Crown, Smartphone, Activity, Users, BarChart3 } from 'lucide-react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { getPlatformIcon } from '@/features/advanced-analytics/utils/helper'
import { useTranslation } from 'react-i18next'

const Header = () => {
  const { t } = useTranslation('advanced_analytics')
  const {
    allowExtraAdvancedAnalytic: isPremium,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } = useAdvancedAnalyticsProvider()
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

  const summary = deviceAnalysisData?.device_data?.summary
  const dominantPlatform = deviceAnalysisData?.insights?.dominant_platform
  return (
    <div className="bg-linear-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-500 p-3 rounded-lg">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('device_analytic.header.title')}</h2>
            <p className="text-gray-600">{t('device_analytic.header.subtitle')}</p>
          </div>
        </div>
        {isPremium && <Crown className="w-6 h-6 text-purple-500" />}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {summary?.total_platforms || 0}
              </div>
              <div className="text-sm text-purple-700">{t('device_analytic.header.platforms')}</div>
            </div>
            <Activity className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('device_analytic.header.device_cats', { n: summary?.total_operating_systems || 0 })}
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {dominantPlatform?.market_share_pct || 0}%
              </div>
              <div className="text-sm text-blue-700">{t('device_analytic.header.market_leader')}</div>
            </div>
            {getPlatformIcon(dominantPlatform?.platform)}
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {dominantPlatform?.platform} • {dominantPlatform?.users || 0} {t('device_analytic.header.users_suffix')}
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {summary?.total_unique_users || 0}
              </div>
              <div className="text-sm text-green-700">{t('device_analytic.header.total_users')}</div>
            </div>
            <Users className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('device_analytic.header.unique_visitors', { n: summary?.total_visits || 0 })}
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold text-orange-600 capitalize`}>
                {summary?.device_diversity?.replace('_', ' ') || t('device_analytic.header.no_data')}
              </div>
              <div className="text-sm text-orange-700">{t('device_analytic.header.device_diversity')}</div>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">{t('device_analytic.header.platform_dist_pattern')}</div>
        </div>
      </div>
    </div>
  )
}

export default Header
