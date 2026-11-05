import { Target, Crown } from 'lucide-react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useTranslation } from 'react-i18next'

const Recommendations = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-interaction-frequency', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })
  const recommendations = data?.insights?.recommendations
  if (!recommendations || recommendations.length === 0) return <></>
  return (
    <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
      <div className="flex items-center space-x-3 mb-6">
        <Target className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            {t('behaviors.interaction_frequency.recommendations.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">{t('behaviors.interaction_frequency.recommendations.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations?.map((rec, index) => {
          const priorityColor =
            rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'green'
          const categoryIcon = {
            retention: '🔒',
            loyalty: '❤️',
            timing_optimization: '⏰',
            engagement_consistency: '📊',
            user_experience: '✨',
          }
          return (
            <div
              key={index}
              className={`p-4 bg-card rounded-lg border border-${priorityColor}-200`}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{categoryIcon[rec.category]}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-700 uppercase`}
                    >
                      {rec.priority} {t('behaviors.interaction_frequency.recommendations.priority_label')}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {rec.category.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="font-medium text-gray-900 mb-1 capitalize">
                    {rec.recommendation_type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    {t('behaviors.interaction_frequency.recommendations.current')}{' '}
                    <strong>
                      {rec.current_value ? (rec.current_value * 100).toFixed(1) + '%' : 'N/A'}
                    </strong>
                    {rec.threshold && (
                      <span>
                        {' '}
                        • {t('behaviors.interaction_frequency.recommendations.target')} <strong>{(rec.threshold * 100).toFixed(0)}%</strong>
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-green-700 capitalize">
                    💡 {rec.improvement_potential.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Recommendations
