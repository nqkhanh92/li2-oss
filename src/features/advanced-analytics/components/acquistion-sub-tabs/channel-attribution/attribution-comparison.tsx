'use client'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useMemo } from 'react'

type AttributionComparisonProps = {}

const AttributionComparison = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-touchpoint-channel-attribution', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const insights = data?.insights

  // Get top performers with data
  const topFirstTouch = useMemo(() => insights?.dominant_first_touch_touchpoint, [insights])
  const topLastTouch = useMemo(() => insights?.dominant_last_touch_touchpoint, [insights])

  const firstTouchShare = topFirstTouch?.share_pct || 0
  const lastTouchShare = topLastTouch?.share_pct || 0

  const performanceAnalysis = (() => {
    const difference = insights?.touchpoint_model_comparison?.first_vs_last_touchpoint_difference

    if (difference === 'consistent_leader') {
      return {
        strength: 'high',
        message: `${topFirstTouch?.touchpoint_name} dominates both discovery and conversion`,
        recommendation: 'This touchpoint is your powerhouse - invest heavily here',
        confidence: firstTouchShare + lastTouchShare,
      }
    }

    if (difference === 'different_leaders') {
      return {
        strength: 'distributed',
        message: 'Different touchpoints excel at discovery vs conversion',
        recommendation: 'Optimize discovery and conversion touchpoints separately',
        confidence: Math.abs(firstTouchShare - lastTouchShare),
      }
    }

    return {
      strength: 'unclear',
      message: 'No clear dominant pattern detected',
      recommendation: 'Need more data to identify clear winners',
      confidence: 0,
    }
  })()
  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {t('channel_attribution.attribution_comparison.title')}
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* First Touch */}
        <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-green-800">{t('channel_attribution.attribution_comparison.discovery_leader')}</h4>
            <div className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full">
              {t('channel_attribution.attribution_comparison.first_touch')}
            </div>
          </div>
          {topFirstTouch ? (
            <>
              <div className="text-lg font-bold text-gray-900 mb-1">
                {topFirstTouch.touchpoint_name}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {t('channel_attribution.attribution_comparison.via')} {topFirstTouch.interaction_channel.toLowerCase()}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{topFirstTouch.users} {t('channel_attribution.attribution_comparison.users_suffix')}</span>
                <span className="font-semibold text-green-600">
                  {topFirstTouch.share_pct}{t('channel_attribution.attribution_comparison.share_suffix')}
                </span>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-sm">{t('channel_attribution.attribution_comparison.no_first_touch')}</div>
          )}
        </div>

        {/* Last Touch */}
        <div className="bg-linear-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-purple-800">{t('channel_attribution.attribution_comparison.conversion_leader')}</h4>
            <div className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
              {t('channel_attribution.attribution_comparison.last_touch')}
            </div>
          </div>
          {topLastTouch ? (
            <>
              <div className="text-lg font-bold text-gray-900 mb-1">
                {topLastTouch.touchpoint_name}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {t('channel_attribution.attribution_comparison.via')} {topLastTouch.interaction_channel.toLowerCase()}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{topLastTouch.users} {t('channel_attribution.attribution_comparison.users_suffix')}</span>
                <span className="font-semibold text-purple-600">
                  {topLastTouch.share_pct}{t('channel_attribution.attribution_comparison.share_suffix')}
                </span>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-sm">{t('channel_attribution.attribution_comparison.no_last_touch')}</div>
          )}
        </div>
      </div>

      {/* Performance Analysis */}
      <div
        className={`rounded-lg p-4 border ${
          performanceAnalysis.strength === 'high'
            ? 'bg-green-50 border-green-200'
            : performanceAnalysis.strength === 'distributed'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <h4 className="font-semibold text-gray-900 mb-2">{t('channel_attribution.attribution_comparison.performance_analysis')}</h4>
        <p className="text-sm text-gray-700 mb-2">{performanceAnalysis.message}</p>
        <p className="text-sm text-gray-600 font-medium">{performanceAnalysis.recommendation}</p>
        {performanceAnalysis.confidence > 0 && (
          <div className="text-xs text-gray-500 mt-2">
            {t('channel_attribution.attribution_comparison.combined_influence', { value: performanceAnalysis.confidence.toFixed(1) })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AttributionComparison
