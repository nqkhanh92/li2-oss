import { Target, Crown } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { OpportunityType } from '@/core/types/analytics/acquisitions-growth-trends.type'
import { EmptySection } from '@/shared/components/customize/empty-section'

const GrowthOpportunities = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { timePeriod, selectedTags, selectedTouchpoints, spaceId, selectedSpaceIds } =
    useAdvancedAnalyticsProvider()

  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-growth-trends', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const premium_insights = useMemo(
    () => data.insights?.premium_insights,
    [data.insights?.premium_insights]
  )

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Target className="w-5 h-5 text-green-600 mr-2" />
            {t('growth_trends.opportunities.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">
            {t('growth_trends.opportunities.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Health */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">{t('growth_trends.opportunities.portfolio_health')}</h4>

          <div className="space-y-3">
            <div
              className={`p-4 rounded-lg border ${
                premium_insights?.momentum_analysis.portfolio_health === 'healthy_portfolio'
                  ? 'bg-green-50 border-green-200'
                  : premium_insights?.momentum_analysis.portfolio_health === 'balanced_portfolio'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div
                className={`text-lg font-bold mb-2 ${
                  premium_insights?.momentum_analysis.portfolio_health === 'healthy_portfolio'
                    ? 'text-green-700'
                    : premium_insights?.momentum_analysis.portfolio_health === 'balanced_portfolio'
                    ? 'text-blue-700'
                    : 'text-yellow-700'
                }`}
              >
                {premium_insights?.momentum_analysis.portfolio_health === 'healthy_portfolio'
                  ? t('growth_trends.opportunities.healthy_portfolio')
                  : premium_insights?.momentum_analysis.portfolio_health === 'balanced_portfolio'
                  ? t('growth_trends.opportunities.balanced_portfolio')
                  : t('growth_trends.opportunities.needs_attention')}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-background rounded border">
                  <div className="font-bold text-green-600">
                    {premium_insights?.momentum_analysis.accelerating_channels}
                  </div>
                  <div className="text-xs text-gray-600">{t('growth_trends.opportunities.accelerating')}</div>
                </div>
                <div className="text-center p-2 bg-background rounded border">
                  <div className="font-bold text-purple-600">
                    {premium_insights?.momentum_analysis.emerging_channels}
                  </div>
                  <div className="text-xs text-gray-600">{t('growth_trends.opportunities.emerging')}</div>
                </div>
                <div className="text-center p-2 bg-background rounded border">
                  <div className="font-bold text-red-600">
                    {premium_insights?.momentum_analysis.declining_channels}
                  </div>
                  <div className="text-xs text-gray-600">{t('growth_trends.opportunities.declining')}</div>
                </div>
              </div>
            </div>

            {/* Quality Insights */}
            {premium_insights?.quality_insights && (
              <div className="bg-slate-200 border border-gray-200 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-3">{t('growth_trends.opportunities.quality_trends')}</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('growth_trends.opportunities.engagement')}</span>
                    <span
                      className={`font-medium ${
                        premium_insights?.quality_insights.engagement_trend ===
                        'improving_engagement'
                          ? 'text-green-600'
                          : premium_insights?.quality_insights.engagement_trend ===
                            'stable_engagement'
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }`}
                    >
                      {premium_insights?.quality_insights?.engagement_trend.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('growth_trends.opportunities.geography')}</span>
                    <span
                      className={`font-medium ${
                        premium_insights?.quality_insights?.geographic_expansion === 'expanding'
                          ? 'text-green-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {premium_insights?.quality_insights?.geographic_expansion.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('growth_trends.opportunities.channels')}</span>
                    <span
                      className={`font-medium ${
                        premium_insights?.quality_insights?.channel_diversification ===
                        'diversifying'
                          ? 'text-green-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {premium_insights?.quality_insights?.channel_diversification.replace(
                        '_',
                        ' '
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Growth Opportunities */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">{t('growth_trends.opportunities.growth_opportunities')}</h4>
          {premium_insights?.growth_opportunities &&
          premium_insights?.growth_opportunities?.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {premium_insights?.growth_opportunities
                ?.filter((opp) => opp.opportunity_type) // Only show opportunities with valid types
                ?.map((opportunity, index) => {
                  const priorityColor =
                    opportunity.priority === 'high'
                      ? 'red'
                      : opportunity.priority === 'medium'
                      ? 'yellow'
                      : 'green'
                  const opportunityIcon: Record<OpportunityType, string> = {
                    scale_emerging_channel: '📈',
                    invest_in_acceleration: '🚀',
                    revive_declining_channel: '🔄',
                    optimize_high_growth_source: '⚡',
                    diversify_traffic_sources: '🌐',
                    improve_user_retention: '💖',
                    expand_geographic_reach: '🌍',
                  }

                  const isOpportunityType = (key: string): key is OpportunityType => {
                    return key in opportunityIcon
                  }

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded border bg-${priorityColor}-50 border-${priorityColor}-200`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">
                          {isOpportunityType(opportunity?.opportunity_type ?? '')
                            ? opportunityIcon[opportunity!.opportunity_type as OpportunityType]
                            : '💡'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1 capitalize">
                            {opportunity?.opportunity_type?.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-gray-700 mb-2 font-medium capitalize">
                            {t('growth_trends.opportunities.target')} {opportunity.target_channel}
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>{t('growth_trends.opportunities.visits')} {opportunity.current_performance.visits}</div>
                            <div>
                              {t('growth_trends.opportunities.growth')}{' '}
                              {opportunity.current_performance.growth_rate
                                ? `${opportunity.current_performance.growth_rate}%`
                                : t('growth_trends.opportunities.emerging_label')}
                            </div>
                            <div className="capitalize">
                              {t('growth_trends.opportunities.status')} {opportunity.current_performance.momentum}
                            </div>
                          </div>
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 bg-${priorityColor}-100 text-${priorityColor}-700`}
                          >
                            {opportunity.priority} {t('growth_trends.opportunities.priority_suffix')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

              {premium_insights?.growth_opportunities?.filter((opp) => opp?.opportunity_type)
                .length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm">{t('growth_trends.opportunities.all_identified')}</div>
                  <div className="text-xs">{t('growth_trends.opportunities.focus_optimization')}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <EmptySection description={t('growth_trends.opportunities.empty')} />{' '}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GrowthOpportunities
