import {
  generateKeyInsightDescription,
  generateKeyInsightHeader,
  getTrendStyling,
  getVolatilityConsistencyInsightDescription,
  getVolatilityConsistencyInsightHeader,
} from '../../../utils/helper'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const SmartInsights = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const {
    allowExtraAdvancedAnalytic,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
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

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-growth-trends', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const insights = useMemo(() => data?.insights, [data])
  const summary = useMemo(() => data?.growth_analysis?.summary, [data])
  const source_growth = useMemo(() => data?.growth_analysis?.source_growth, [data])

  const trend_direction = summary?.trend_direction || ''

  const trendStyling = getTrendStyling(trend_direction || '')
  return (
    <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
      <div className="flex items-center space-x-2 mb-4">
        <div className="text-2xl">🧠</div>
        <h3 className="text-lg font-bold text-gray-900">{t('growth_trends.smart_insights.title')}</h3>
        <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
          {t('growth_trends.smart_insights.ai_analysis')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Primary Insight */}
        <div className="bg-card rounded-lg p-4 border border-gray-200 md:col-span-2 lg:col-span-1">
          <div className="flex items-start space-x-3">
            <div className={`text-2xl ${trendStyling.color}`}>{trendStyling.icon}</div>
            <div>
              <div className="font-bold text-gray-900 mb-1">
                {generateKeyInsightHeader(summary?.trend_direction || '')}
              </div>
              <div className="text-sm text-gray-700 mb-2">
                {generateKeyInsightDescription(summary?.trend_direction || '')}
              </div>
              {allowExtraAdvancedAnalytic && summary?.overall_visits_growth_rate && (
                <div
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    summary?.overall_visits_growth_rate > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {summary.overall_visits_growth_rate > 0 ? '+' : ''}
                  {summary.overall_visits_growth_rate}% {t('growth_trends.smart_insights.vs_prev_period')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channel Insight */}
        <div className="bg-background rounded-lg p-4 border border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">
              {insights?.top_growing_source
                ? '🚀'
                : source_growth?.find((s) => s.growth_momentum === 'accelerating')
                ? '⚡'
                : source_growth?.find((s) => s.growth_momentum === 'emerging')
                ? '🌱'
                : '📊'}
            </div>
            <div>
              <div className="font-bold text-gray-900 mb-1">
                {insights?.top_growing_source
                  ? `${insights.top_growing_source.channel?.charAt(0)?.toUpperCase() ?? ''}${
                      insights.top_growing_source.channel?.slice(1) ?? ''
                    } ${t('growth_trends.smart_insights.leading')}`
                  : source_growth?.find((s) => s.growth_momentum === 'accelerating')
                  ? `${
                      source_growth
                        .find((s) => s.growth_momentum === 'accelerating')
                        ?.channel?.charAt(0)
                        ?.toUpperCase() ?? ''
                    }${
                      source_growth
                        .find((s) => s.growth_momentum === 'accelerating')
                        ?.channel?.slice(1) ?? ''
                    } ${t('growth_trends.smart_insights.accelerating')}`
                  : t('growth_trends.smart_insights.channel_diversification')}
              </div>
              <div className="text-sm text-gray-700 mb-2">
                {insights?.top_growing_source
                  ? t('growth_trends.smart_insights.fastest_growing', { rate: insights?.top_growing_source?.growth_rate })
                  : source_growth?.find((s) => s.growth_momentum === 'accelerating')
                  ? t('growth_trends.smart_insights.strong_acceleration', { channel: source_growth?.find((s) => s.growth_momentum === 'accelerating')?.channel })
                  : t('growth_trends.smart_insights.emerging_channels', { count: source_growth?.filter((s) => s.growth_momentum === 'emerging').length })}
              </div>
              <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {source_growth?.[0]?.channel?.charAt(0)?.toUpperCase() ??
                  '' + source_growth?.[0]?.channel?.slice(1)}{' '}
                • {source_growth?.[0]?.current_period_visits} {t('growth_trends.smart_insights.visits')}
              </div>
            </div>
          </div>
        </div>

        {/* Volatility/Consistency Insight */}
        <div className="bg-background rounded-lg p-4 border border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">
              {summary?.growth_consistency === 'high_consistency'
                ? '🎯'
                : summary?.growth_consistency === 'moderate_consistency'
                ? '📊'
                : '🌊'}
            </div>
            <div>
              <div className="font-bold text-gray-900 mb-1">
                {getVolatilityConsistencyInsightHeader(summary?.growth_consistency || '')}
              </div>
              <div className="text-sm text-gray-700 mb-2">
                {getVolatilityConsistencyInsightDescription(summary?.growth_consistency || '')}
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <div
                  className={`px-2 py-1 rounded ${
                    Math.round(
                      (summary?.positive_growth_days! / summary?.total_current_days!) * 100
                    ) >= 70
                      ? 'bg-green-100 text-green-700'
                      : Math.round(
                          (summary?.positive_growth_days! / summary?.total_current_days!) * 100
                        ) >= 40
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {Math.round(
                    (summary?.positive_growth_days! / summary?.total_current_days!) * 100
                  )}
                  {t('growth_trends.smart_insights.positive_days')}
                </div>
                {/* {allowExtraAdvancedAnalytic && summary?.growth_volatility && (
                  <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    ±{summary?.growth_volatility?.toFixed(1)}% volatility
                  </div>
                )} */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Recommendations */}
      <div className="mt-4 p-4 bg-background rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <div className="text-lg">💡</div>
          <h4 className="font-semibold text-gray-900">{t('growth_trends.smart_insights.recommended_actions')}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {summary?.trend_direction === 'strong_growth' ? (
            <>
              <div className="text-green-700">{t('growth_trends.smart_insights.action_strong_growth_1')}</div>
              <div className="text-blue-700">
                {t('growth_trends.smart_insights.action_strong_growth_2')}
              </div>
            </>
          ) : summary?.trend_direction === 'moderate_growth' ? (
            <>
              <div className="text-blue-700">{t('growth_trends.smart_insights.action_moderate_growth_1')}</div>
              <div className="text-purple-700">{t('growth_trends.smart_insights.action_moderate_growth_2')}</div>
            </>
          ) : summary?.trend_direction === 'stable' ? (
            <>
              <div className="text-yellow-700">{t('growth_trends.smart_insights.action_stable_1')}</div>
              <div className="text-indigo-700">
                {t('growth_trends.smart_insights.action_stable_2')}
              </div>
            </>
          ) : (
            <>
              <div className="text-red-700">{t('growth_trends.smart_insights.action_decline_1')}</div>
              <div className="text-orange-700">{t('growth_trends.smart_insights.action_decline_2')}</div>
            </>
          )}

          {summary?.growth_consistency === 'low_consistency' && (
            <div className="text-gray-700">
              {t('growth_trends.smart_insights.action_low_consistency')}
            </div>
          )}

          {allowExtraAdvancedAnalytic && insights?.premium_insights?.growth_forecast && (
            <div className="text-purple-700">
              •{' '}
              {insights?.premium_insights?.growth_forecast?.projected_growth_rate > 0
                ? t('growth_trends.smart_insights.capitalize')
                : t('growth_trends.smart_insights.prepare_for')}{' '}
              {t('growth_trends.smart_insights.projected_trend', { rate: insights?.premium_insights?.growth_forecast?.projected_growth_rate })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SmartInsights
