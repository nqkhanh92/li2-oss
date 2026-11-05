import { Target } from 'lucide-react'
import { getTrendStyling } from '../../../utils/helper'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'

const GrowthInsight = () => {
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


  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-growth-trends', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const summary = useMemo(() => data?.growth_analysis?.summary, [data])
  const insights = useMemo(() => data?.insights, [data])

  return (
    <div className="bg-slate-200 rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <Target className="w-5 h-5 text-blue-500 mr-2" />
        {t('growth_trends.growth_insight.title')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">{t('growth_trends.growth_insight.current_status')}</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <span className="text-sm text-gray-600">{t('growth_trends.growth_insight.overall_trend')}</span>
              <span
                className={`font-medium capitalize ${
                  getTrendStyling(insights?.growth_performance?.overall_trend || '').color
                }`}
              >
                {insights?.growth_performance?.overall_trend?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <span className="text-sm text-gray-600">{t('growth_trends.growth_insight.growth_rate')}</span>
              <span className="font-medium text-gray-900">
                {insights?.growth_performance?.growth_rate
                  ? `${insights?.growth_performance?.growth_rate}%`
                  : 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <span className="text-sm text-gray-600">{t('growth_trends.growth_insight.consistency')}</span>
              <span
                className={`font-medium capitalize ${
                  getTrendStyling(insights?.growth_performance?.growth_consistency || '').color
                }`}
              >
                {insights?.growth_performance?.growth_consistency?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">{t('growth_trends.growth_insight.key_observations')}</h4>
          <div className="space-y-3">
            {summary?.comparison_total_visits === 0 ? (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800 font-medium mb-1">{t('growth_trends.growth_insight.new_business_title')}</div>
                <div className="text-xs text-blue-600">
                  {t('growth_trends.growth_insight.new_business_desc')}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-green-800 font-medium mb-1">
                  {t('growth_trends.growth_insight.growth_vs_prev_title')}
                </div>
                <div className="text-xs text-green-600">
                  {summary?.overall_visits_growth_rate
                    ? `${summary?.overall_visits_growth_rate > 0 ? '+' : ''}${
                        summary?.overall_visits_growth_rate || 0
                      }%`
                    : t('growth_trends.growth_insight.calculating')}
                </div>
              </div>
            )}

            {insights?.top_growing_source ? (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-sm text-purple-800 font-medium mb-1">{t('growth_trends.growth_insight.top_growing_source')}</div>
                <div className="text-xs text-purple-600 capitalize">
                  {insights?.top_growing_source?.channel} (
                  {insights?.top_growing_source?.growth_rate}
                  %)
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm text-gray-700 font-medium mb-1">{t('growth_trends.growth_insight.all_sources_emerging')}</div>
                <div className="text-xs text-gray-600">{t('growth_trends.growth_insight.no_clear_leader')}</div>
              </div>
            )}

            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-800 font-medium mb-1">{t('growth_trends.growth_insight.volatility_title')}</div>
              <div className="text-xs text-yellow-600">
                {t('growth_trends.growth_insight.volatility_desc')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GrowthInsight
