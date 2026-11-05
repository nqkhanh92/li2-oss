import { Clock, Users, Calendar, TrendingUp, Crown } from 'lucide-react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { formatHour } from '@/features/advanced-analytics/utils/calculation'
import { useTranslation } from 'react-i18next'

const Header = () => {
  const { t } = useTranslation('advanced_analytics')
  const {
    allowExtraAdvancedAnalytic,
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-interaction-frequency', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const summary = data?.insights?.user_behavior_summary
  const peakPeriods = data?.insights?.peak_periods

  return (
    <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500 p-3 rounded-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('behaviors.interaction_frequency.header.title')}</h2>
            <p className="text-gray-600">{t('behaviors.interaction_frequency.header.subtitle')}</p>
          </div>
        </div>
        {allowExtraAdvancedAnalytic && <Crown className="w-6 h-6 text-purple-500" />}
      </div>

      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {summary?.avg_interactions_per_user || 0}
              </div>
              <div className="text-sm text-blue-700">{t('behaviors.interaction_frequency.header.avg_interactions')}</div>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.interaction_frequency.header.total_users_stats', { users: summary?.total_users || 0, interactions: summary?.total_interactions || 0 })}
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {peakPeriods?.peak_day?.day || 0}
              </div>
              <div className="text-sm text-green-700">{t('behaviors.interaction_frequency.header.peak_day')}</div>
            </div>
            <Calendar className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.interaction_frequency.header.peak_day_stats', { interactions: peakPeriods?.peak_day?.interactions || 0, hour: formatHour(peakPeriods?.peak_hour?.hour || 0) })}
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(
                  (summary?.frequency_distribution?.one_time_users ||
                    0 / (summary?.total_users || 0)) * 100
                ) || 0}
                %
              </div>
              <div className="text-sm text-purple-700">{t('behaviors.interaction_frequency.header.one_time_users')}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.interaction_frequency.header.occasional_stats', { n: summary?.frequency_distribution?.occasional_users || 0 })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
