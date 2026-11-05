import { Users, Route, Crown, Clock, Target } from 'lucide-react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { formatDuration } from '@/features/advanced-analytics/utils/helper'
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-user-journeys', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const journeySummary = data?.insights?.journey_summary

  return (
    <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-green-500 p-3 rounded-lg">
            <Route className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('behaviors.user_journeys.header.title')}</h2>
            <p className="text-gray-600">{t('behaviors.user_journeys.header.subtitle')}</p>
          </div>
        </div>
        {isPremium && <Crown className="w-6 h-6 text-purple-500" />}
      </div>

      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {journeySummary?.avg_touchpoints_per_user || 0}
              </div>
              <div className="text-sm text-green-700">{t('behaviors.user_journeys.header.avg_links_user')}</div>
            </div>
            <Users className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.user_journeys.header.users_journey', { users: journeySummary?.total_users, duration: formatDuration(journeySummary?.avg_journey_duration_minutes || 0) })}
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {journeySummary?.complexity_distribution?.single_touchpoint_percentage || 0}%
              </div>
              <div className="text-sm text-blue-700">{t('behaviors.user_journeys.header.single_link')}</div>
            </div>
            <Target className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.user_journeys.header.single_link_stats', { pct: Math.round(journeySummary?.complexity_distribution?.multi_touchpoint_percentage || 0) })}
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {journeySummary?.journeys_over_1_hour || 0}
              </div>
              <div className="text-sm text-purple-700">{t('behaviors.user_journeys.header.extended_sessions')}</div>
            </div>
            <Clock className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.user_journeys.header.extended_sessions_stats', { duration: formatDuration(journeySummary?.longest_journey_minutes || 0) })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
