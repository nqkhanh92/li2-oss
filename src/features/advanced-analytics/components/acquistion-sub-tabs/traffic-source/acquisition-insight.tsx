import { AlertCircle, Crown, Target } from 'lucide-react'
import { SourceCategory } from '@/core/types/analytics/acquisition-traffic.type'
import { getSourceDiversityStyle, getSourceIcon } from '../../../utils/helper'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

const AcquisitionInsight = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'acquisition-traffic', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  if (!allowExtraAdvancedAnalytic || !data.insights.premium_insights) return null

  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Target className="w-5 h-5 text-indigo-600 mr-2" />
            {t('traffic_source.insight.title')}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {allowExtraAdvancedAnalytic
              ? t('traffic_source.insight.subtitle_premium')
              : t('traffic_source.insight.subtitle_free')}
          </p>
        </div>
      </div>

      {/* Top Source Insight */}
      <div className="mb-6">
        <div className="bg-linear-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">
                {getSourceIcon(data?.insights?.top_source?.source_category as SourceCategory)}
              </div>
              <div>
                <div className="font-bold text-purple-900 capitalize">
                  {t('traffic_source.insight.top_source')} {data?.insights?.top_source?.source_category} {t('traffic_source.insight.traffic_suffix')}
                </div>
                <div className="text-sm text-purple-700">
                  {data?.insights?.top_source?.visits || 0} {t('traffic_source.insight.visits')} •{' '}
                  {data?.insights?.top_source?.market_share_pct || 0}% {t('traffic_source.insight.market_share')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {data?.insights?.top_source?.engagement_rate || 0}
              </div>
              <div className="text-xs text-purple-600">{t('traffic_source.insight.engagement_rate')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Diversity Analysis */}
      <div className="mb-6">
        <div className="rounded-lg p-4 shadow-sm border border-gray-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">
                {getSourceIcon(data?.insights?.source_diversity as SourceCategory)}
              </div>
              <div>
                <div className="font-bold text-purple-900 capitalize">{t('traffic_source.insight.source_diversity')}</div>
                <div className="text-sm text-purple-700">{t('traffic_source.insight.diversity_subtitle')}</div>
              </div>
            </div>
            <div className="text-right">
              <div
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  getSourceDiversityStyle(data?.insights?.source_diversity).bg
                } ${getSourceDiversityStyle(data?.insights?.source_diversity).text}`}
              >
                {getSourceDiversityStyle(data?.insights?.source_diversity).icon}{' '}
                {getSourceDiversityStyle(data?.insights?.source_diversity).label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium: Highest Quality Source */}
      {allowExtraAdvancedAnalytic && data.insights.premium_insights?.highest_quality_source && (
        <div className="bg-linear-to-r from-gold-50 to-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🏆</div>
              <div>
                <div className="font-bold text-yellow-900 capitalize">
                  {t('traffic_source.insight.highest_quality')}{' '}
                  {data?.insights?.premium_insights?.highest_quality_source?.source_category}
                </div>
                <div className="text-sm text-yellow-700">
                  {t('traffic_source.insight.quality_score')}{' '}
                  {data?.insights?.premium_insights?.highest_quality_source?.quality_score || 0} •
                  {t('traffic_source.insight.tier')}{' '}
                  {data?.insights?.premium_insights?.highest_quality_source?.quality_tier || 0}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-yellow-600">
                {data?.insights?.premium_insights?.highest_quality_source?.repeat_user_rate || 0}%
              </div>
              <div className="text-xs text-yellow-600">{t('traffic_source.insight.repeat_users')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Free Tier: Upgrade CTA */}
      {!allowExtraAdvancedAnalytic && (
        <div className="bg-linear-to-br from-orange-50 via-red-50 to-pink-50 rounded-xl p-6 border border-orange-200 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900 flex items-center">
                  <AlertCircle className="w-6 h-6 text-orange-600 mr-2" />
                  {t('traffic_source.insight.upgrade_title')}
                  <span className="text-2xl ml-2">📈</span>
                </h4>
                <p className="text-gray-600 mt-1">{t('traffic_source.insight.upgrade_subtitle')}</p>
              </div>
              <Crown className="w-8 h-8 text-orange-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-background/80 backdrop-blur-xs rounded-lg p-4 border border-orange-200">
                <div className="text-lg font-bold text-orange-600">{t('traffic_source.insight.quality_scoring')}</div>
                <div className="text-sm text-gray-700">
                  {t('traffic_source.insight.quality_scoring_desc')}
                </div>
              </div>
              <div className="bg-background/80 backdrop-blur-xs rounded-lg p-4 border border-orange-200">
                <div className="text-lg font-bold text-purple-600">{t('traffic_source.insight.platform_insights')}</div>
                <div className="text-sm text-gray-700">{t('traffic_source.insight.platform_insights_desc')}</div>
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-linear-to-r from-orange-500 to-red-500 text-white px-4 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center space-x-2"
              iconLeft={<Crown />}
            >
              <span>{t('traffic_source.insight.upgrade_btn')}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AcquisitionInsight
