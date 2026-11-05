import { Award, Crown, Target, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'

type AIPoweredOptimizationInsightsProps = {}

const AIPoweredOptimizationInsights = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { timePeriod, selectedTags, selectedTouchpoints,
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


  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-touchpoint-channel-attribution', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const premium_insights = useMemo(() => data?.insights?.premium_insights, [data])
  /* Premium Insights & Optimization */
  if (!premium_insights || !data || !data?.touchpoint_attribution?.channel_sequences) return null
  return (
    <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
      <h3 className="text-lg font-bold text-indigo-900 mb-6 flex items-center">
        <Crown className="w-5 h-5 text-indigo-500 mr-2" />
        {t('channel_attribution.ai_insights.title')}
      </h3>

      {/* Most Common Journey */}
      {premium_insights?.most_common_touchpoint_journey && (
        <div className="bg-background rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Target className="w-4 h-4 text-blue-500 mr-2" />
            {t('channel_attribution.ai_insights.most_common_journey')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">{t('channel_attribution.ai_insights.path')}</div>
              <div className="font-medium">
                {premium_insights?.most_common_touchpoint_journey?.touchpoint_path}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('channel_attribution.ai_insights.users')}</div>
              <div className="font-bold text-blue-600">
                {premium_insights?.most_common_touchpoint_journey?.users}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('channel_attribution.ai_insights.share')}</div>
              <div className="font-bold text-green-600">
                {premium_insights?.most_common_touchpoint_journey?.share_pct}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('channel_attribution.ai_insights.avg_interactions')}</div>
              <div className="font-medium">
                {premium_insights?.most_common_touchpoint_journey?.avg_interactions}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Best Combination */}
      {premium_insights?.best_touchpoint_channel_combination && (
        <div className="bg-background rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Award className="w-4 h-4 text-gold-500 mr-2" />
            {t('channel_attribution.ai_insights.highest_engagement')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">{t('channel_attribution.ai_insights.touchpoint')}</div>
              <div className="font-medium">
                {premium_insights?.best_touchpoint_channel_combination?.touchpoint_name}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('channel_attribution.ai_insights.via')}</div>
              <div className="font-medium">
                {premium_insights?.best_touchpoint_channel_combination.discovery_channel}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('channel_attribution.ai_insights.engagement')}</div>
              <div className="font-bold text-orange-600">
                {premium_insights?.best_touchpoint_channel_combination.avg_engagement}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('channel_attribution.ai_insights.users')}</div>
              <div className="font-medium">
                {premium_insights?.best_touchpoint_channel_combination.total_users}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Opportunities */}
      {premium_insights?.optimization_opportunities &&
        premium_insights?.optimization_opportunities.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-indigo-900 flex items-center">
              <Zap className="w-4 h-4 text-yellow-500 mr-2" />
              {t('channel_attribution.ai_insights.optimization_recommendations')}
            </h4>
            {premium_insights?.optimization_opportunities.map((opp, index) => (
              <div
                key={index}
                className={`bg-background rounded-lg p-4 border-l-4 ${
                  opp.confidence_level === 'high'
                    ? 'border-green-400'
                    : opp.confidence_level === 'medium'
                    ? 'border-yellow-400'
                    : 'border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900 capitalize">
                    {opp.opportunity_type.replace(/_/g, ' ')}
                  </h5>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      opp.confidence_level === 'high'
                        ? 'bg-green-100 text-green-700'
                        : opp.confidence_level === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {opp.confidence_level} {t('channel_attribution.ai_insights.confidence_suffix')}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-gray-500">{t('channel_attribution.ai_insights.multi_touch_rate')}</div>
                    <div className="font-medium">
                      {opp.supporting_metrics.multi_touch_rate_pct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">{t('channel_attribution.ai_insights.avg_touchpoints')}</div>
                    <div className="font-medium">
                      {opp.supporting_metrics.avg_channels_per_user}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">{t('channel_attribution.ai_insights.channel_utilization')}</div>
                    <div className="font-medium">{opp.supporting_metrics.channel_utilization}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">{t('channel_attribution.ai_insights.sample_size')}</div>
                    <div className="font-medium">{opp.supporting_metrics.sample_size} {t('channel_attribution.ai_insights.users_suffix')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

export default AIPoweredOptimizationInsights
