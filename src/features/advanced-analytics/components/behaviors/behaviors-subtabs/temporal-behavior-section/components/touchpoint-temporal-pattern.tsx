import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, ChevronRight, BarChart3, Crown } from 'lucide-react'
import {
  getActivitySpreadColor,
  getWeeklyConsistencyColor,
} from '@/features/advanced-analytics/utils/helper'
import { formatHour } from '@/features/advanced-analytics/utils/calculation'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

const TouchpointTemporalPattern = () => {
  const { t } = useTranslation('advanced_analytics')
  const {
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    allowExtraAdvancedAnalytic,
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

  const touchpointTemporalPatterns = data?.temporal_analysis.touchpoint_temporal_patterns

  const [showTouchpointPatterns, setShowTouchpointPatterns] = useState(false)

  if (
    !allowExtraAdvancedAnalytic ||
    !touchpointTemporalPatterns ||
    touchpointTemporalPatterns.length === 0
  )
    return <></>

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 text-indigo-600 mr-2" />
            {t('behaviors.temporal_behavior.touchpoint_pattern.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">
            {t('behaviors.temporal_behavior.touchpoint_pattern.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setShowTouchpointPatterns(!showTouchpointPatterns)}
          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded-full hover:bg-indigo-200 transition-colors flex items-center space-x-1"
          iconLeft={showTouchpointPatterns ? <ChevronDown /> : <ChevronRight />}
        >
          <span>{showTouchpointPatterns ? t('behaviors.temporal_behavior.touchpoint_pattern.collapse') : t('behaviors.temporal_behavior.touchpoint_pattern.expand')}</span>
        </Button>
      </div>

      <div className="space-y-4">
        {touchpointTemporalPatterns
          .slice(0, showTouchpointPatterns ? touchpointTemporalPatterns.length : 5)
          .map((pattern, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-bold text-indigo-600">#{index + 1}</div>
                  <div>
                    <div className="font-medium text-gray-900">{pattern.touchpoint_name}</div>
                    <div className="text-xs text-gray-600">
                      {t('behaviors.temporal_behavior.touchpoint_pattern.interactions_users', { interactions: pattern.total_interactions, users: pattern.unique_users })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    {formatHour(pattern.peak_hour)} •{' '}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][pattern.peak_day_of_week]}
                  </div>
                  <div className="text-xs text-gray-600">{t('behaviors.temporal_behavior.touchpoint_pattern.peak_time')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{pattern.avg_daily_interactions}</div>
                  <div className="text-xs text-gray-600">{t('behaviors.temporal_behavior.touchpoint_pattern.daily_avg')}</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{pattern.hours_active}/24</div>
                  <div className="text-xs text-gray-600">{t('behaviors.temporal_behavior.touchpoint_pattern.hours_active')}</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{pattern.days_of_week_active}/7</div>
                  <div className="text-xs text-gray-600">{t('behaviors.temporal_behavior.touchpoint_pattern.days_active')}</div>
                </div>
                <div className="text-center">
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getActivitySpreadColor(
                      pattern.activity_spread
                    )}`}
                  >
                    {pattern.activity_spread.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{t('behaviors.temporal_behavior.touchpoint_pattern.activity_spread')}</div>
                </div>
              </div>

              {showTouchpointPatterns && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getWeeklyConsistencyColor(
                        pattern.weekly_consistency
                      )}`}
                    >
                      {pattern.weekly_consistency.replace('_', ' ')} {t('behaviors.temporal_behavior.touchpoint_pattern.consistency_suffix')}
                    </div>
                    <div className="text-xs text-gray-600">
                      {t('behaviors.temporal_behavior.touchpoint_pattern.most_active', {
                        hour: formatHour(pattern.peak_hour),
                        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pattern.peak_day_of_week]
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

        {!showTouchpointPatterns && touchpointTemporalPatterns.length > 5 && (
          <div className="text-center py-2 text-sm text-gray-500">
            {t('behaviors.temporal_behavior.touchpoint_pattern.more_touchpoints', { n: touchpointTemporalPatterns.length - 5 })}
          </div>
        )}
      </div>
    </div>
  )
}

export default TouchpointTemporalPattern
