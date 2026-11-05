import { ArrowRight, ChevronDown, ChevronRight, Crown, GitBranch } from 'lucide-react'
import { getFlowStrengthColor } from '@/features/advanced-analytics/utils/helper'
import { formatDuration } from '@/features/advanced-analytics/utils/helper'
import { getInteractionTypeIcon } from '@/features/advanced-analytics/utils/helper'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

const TouchpointTransitions = () => {
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

  const [showTransitionDetails, setShowTransitionDetails] = useState(false)

  if (
    !data?.journey_analysis?.touchpoint_transitions ||
    data?.journey_analysis?.touchpoint_transitions?.length === 0
  ) {
    return <></>
    return <></>
  }

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <GitBranch className="w-5 h-5 text-purple-600 mr-2" />
            {t('behaviors.user_journeys.transitions.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">{t('behaviors.user_journeys.transitions.subtitle')}</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowTransitionDetails(!showTransitionDetails)}
          className="text-xs bg-purple-100 text-purple-700 px-3 py-2 rounded-full hover:bg-purple-200 transition-colors flex items-center space-x-1"
          iconLeft={showTransitionDetails ? <ChevronDown /> : <ChevronRight />}
        >
          <span>{showTransitionDetails ? t('behaviors.user_journeys.transitions.toggle_hide') : t('behaviors.user_journeys.transitions.toggle_show')}</span>
        </Button>
      </div>

      <div className="space-y-4">
        {data?.journey_analysis?.touchpoint_transitions?.map((transition, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getFlowStrengthColor(
              transition?.flow_strength || 0
            )}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {getInteractionTypeIcon(transition?.from_interaction_type)}
                    <span className="text-sm font-medium">{transition?.from_touchpoint}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="flex items-center space-x-1">
                    {getInteractionTypeIcon(transition?.to_interaction_type)}
                    <span className="text-sm font-medium">{transition?.to_touchpoint}</span>
                  </div>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getFlowStrengthColor(
                  transition?.flow_strength || 0
                )}`}
              >
                {transition?.flow_strength} {t('behaviors.user_journeys.transitions.flow_suffix')}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-gray-900">{transition?.transition_count}</div>
                <div className="text-xs text-gray-600">{t('behaviors.user_journeys.transitions.transitions_label')}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{transition?.unique_users}</div>
                <div className="text-xs text-gray-600">{t('behaviors.user_journeys.transitions.unique_users')}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">
                  {formatDuration(transition?.avg_time_between_minutes || 0)}
                </div>
                <div className="text-xs text-gray-600">{t('behaviors.user_journeys.transitions.avg_time_between')}</div>
              </div>
            </div>

            {showTransitionDetails && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                  {t('behaviors.user_journeys.transitions.transition_detail', {
                    pct: ((transition?.transition_count / (journeySummary?.total_users || 0)) * 100).toFixed(1),
                    duration: formatDuration(transition?.avg_time_between_minutes || 0)
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {data?.journey_analysis?.touchpoint_transitions?.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{t('behaviors.user_journeys.transitions.no_transitions')}</p>
          <p className="text-sm">{t('behaviors.user_journeys.transitions.single_touchpoint_note')}</p>
        </div>
      )}
    </div>
  )
}

export default TouchpointTransitions
