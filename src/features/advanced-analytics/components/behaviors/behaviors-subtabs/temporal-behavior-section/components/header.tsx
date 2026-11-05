import { Timer, Crown, Calendar, Sun, Target } from 'lucide-react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'
import { formatHour } from '@/features/advanced-analytics/utils/calculation'
import { getActivityPatternIcon } from '@/features/advanced-analytics/utils/helper'
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-temporal-patterns', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })
  return (
    <div className="bg-linear-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500 p-3 rounded-lg">
            <Timer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('behaviors.temporal_behavior.header.title')}</h2>
            <p className="text-gray-600">
              {t('behaviors.temporal_behavior.header.subtitle')}
            </p>
          </div>
        </div>
        {isPremium && <Crown className="w-6 h-6 text-purple-500" />}
      </div>

      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {data?.insights?.peak_activity?.peak_periods?.peak_hour?.hour
                  ? formatHour(data?.insights?.peak_activity?.peak_periods?.peak_hour?.hour)
                  : t('behaviors.temporal_behavior.header.no_data')}
              </div>
              <div className="text-sm text-orange-700">{t('behaviors.temporal_behavior.header.peak_hour')}</div>
            </div>
            <Sun className="w-8 h-8 text-orange-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.temporal_behavior.header.interactions_most_active', { n: data?.insights?.peak_activity?.peak_periods?.peak_hour?.interactions || 0 })}
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {data?.insights?.peak_activity?.peak_periods?.peak_day?.day || 0}
              </div>
              <div className="text-sm text-blue-700">{t('behaviors.temporal_behavior.header.peak_day')}</div>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.temporal_behavior.header.interactions_best_day', { n: data?.insights?.peak_activity?.peak_periods?.peak_day?.interactions || 0 })}
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600 flex items-center">
                {getActivityPatternIcon(data?.insights?.temporal_summary?.activity_pattern || '')}
                <span className="ml-2 capitalize">
                  {data?.insights?.temporal_summary?.activity_pattern?.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm text-green-700">{t('behaviors.temporal_behavior.header.activity_pattern')}</div>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {data?.insights?.temporal_summary?.weekly_pattern?.replace('_', ' ')} •{' '}
            {data?.insights?.temporal_summary?.unique_hours_active || 0}/24 hours active
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {data?.insights?.peak_activity?.activity_concentration?.concentration_score || 0}%
              </div>
              <div className="text-sm text-purple-700">{t('behaviors.temporal_behavior.header.concentration_score')}</div>
            </div>
            <Target className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            {t('behaviors.temporal_behavior.header.concentration_stats', { hours: data?.insights?.peak_activity?.activity_concentration?.above_avg_hours || 0, days: data?.insights?.peak_activity?.activity_concentration?.above_avg_days || 0 })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
