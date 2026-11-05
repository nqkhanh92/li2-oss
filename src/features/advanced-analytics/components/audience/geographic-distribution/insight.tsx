import {
  ExpansionOpportunity,
  Insights,
  Summary as GeographicSummary,
} from '@/core/types/analytics/geographic-distribution.type'
import { Activity, Crown, TrendingUp } from 'lucide-react'
import { getFlagEmoji } from '../../../utils/helper'
import { countryMapping } from '@/shared/constants/country-mapping'
import { Summary } from '@/core/types/analytics/daily-trend.type'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

type InsightProps = {
  insight: Insights
  summaryGeo?: GeographicSummary
  summaryDaily?: Summary
}

export const GeoInsight = () => {
  const { t } = useTranslation('advanced_analytics')
  const {
    allowExtraAdvancedAnalytic,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } = useAdvancedAnalyticsProvider()
  const { org_id } = useParams<{ org_id: string }>()

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data: geographicDistribution } = useAdvancedAnalytics(org_id, 'geographic-distribution', {
    period_days: timePeriod,
    tag_ids: selectedTags,
    touchpoint_ids: selectedTouchpoints,
    collection_ids: collectionIds,
  })

  const insight = useMemo(() => geographicDistribution?.insights, [geographicDistribution])
  const summaryGeo = useMemo(
    () => geographicDistribution?.geographic_data?.summary || {},
    [geographicDistribution]
  )

  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 text-indigo-600 mr-2" />
            {t('geographic.insight.title')}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {allowExtraAdvancedAnalytic
              ? t('geographic.insight.subtitle_premium')
              : t('geographic.insight.subtitle_free')}
          </p>
        </div>
      </div>

      {/* Top Market Insight */}
      <div className="mb-6">
        <div className="bg-linear-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{getFlagEmoji(insight?.top_market?.country ?? '')}</div>
              <div>
                <div className="font-bold text-indigo-900">
                  {t('geographic.insight.top_market')}{' '}
                  {countryMapping.find((country) => country.code === insight?.top_market?.country)
                    ?.name || t('geographic.insight.no_data')}
                </div>
                <div className="text-sm text-indigo-700">
                  {insight?.top_market?.visits || 0} {t('geographic.insight.visits_dot')}{' '}
                  {insight?.top_market?.market_share_pct || 0}{t('geographic.insight.market_share')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">
                {insight?.top_market?.engagement_rate || 0}
              </div>
              <div className="text-xs text-indigo-600">{t('geographic.insight.engagement_rate')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Concentration & Geographic Diversity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-background rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{t('geographic.insight.market_concentration')}</div>
              <div className="text-sm text-gray-600 mt-1">{t('geographic.insight.concentration_subtitle')}</div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                insight?.geographic_concentration === 'highly_concentrated'
                  ? 'bg-red-100 text-red-800'
                  : insight?.geographic_concentration === 'moderately_concentrated'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {insight?.geographic_concentration === 'highly_concentrated'
                ? t('geographic.insight.highly_concentrated')
                : insight?.geographic_concentration === 'moderately_concentrated'
                ? t('geographic.insight.moderately_concentrated')
                : t('geographic.insight.well_distributed')}
            </div>
          </div>
        </div>

        {allowExtraAdvancedAnalytic && summaryGeo?.geographic_diversity && (
          <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{t('geographic.insight.geo_diversity')}</div>
                <div className="text-sm text-gray-600 mt-1">{t('geographic.insight.diversity_subtitle')}</div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  summaryGeo?.geographic_diversity === 'high_diversity'
                    ? 'bg-green-100 text-green-800'
                    : summaryGeo?.geographic_diversity === 'medium_diversity'
                    ? 'bg-blue-100 text-blue-800'
                    : summaryGeo?.geographic_diversity === 'low_diversity'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {summaryGeo?.geographic_diversity === 'high_diversity'
                  ? t('geographic.insight.high_diversity')
                  : summaryGeo?.geographic_diversity === 'medium_diversity'
                  ? t('geographic.insight.medium_diversity')
                  : summaryGeo?.geographic_diversity === 'low_diversity'
                  ? t('geographic.insight.low_diversity')
                  : t('geographic.insight.single_market')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Premium: Advanced Insights */}
      {allowExtraAdvancedAnalytic && insight?.premium_insights && (
        <div className="space-y-4">
          {/* Top City */}
          {insight?.premium_insights?.top_city && (
            <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <div className="font-bold text-green-900">
                      {t('geographic.insight.top_city')} {insight?.premium_insights?.top_city?.city || t('geographic.insight.no_data')}
                    </div>
                    <div className="text-sm text-green-700">
                      {insight?.premium_insights?.top_city?.visits || 0} {t('geographic.insight.visits_label')} • {t('geographic.insight.engagement_rate')}:{' '}
                      {insight?.premium_insights?.top_city?.engagement_rate || 0}
                    </div>
                  </div>
                </div>
                <div className="text-green-600">
                  <Crown className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Expansion Opportunities */}
          {insight?.premium_insights?.expansion_opportunities && (
            <div className="bg-linear-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="mb-3">
                <h5 className="font-bold text-purple-900 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {t('geographic.insight.expansion_opps')}
                </h5>
              </div>
              <div className="space-y-2">
                {insight?.premium_insights?.expansion_opportunities?.map(
                  (opportunity: ExpansionOpportunity, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-background/70 rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">{getFlagEmoji(opportunity?.country)}</div>
                        <div>
                          <div className="font-medium text-purple-900">
                            {countryMapping.find((country) => country.code === opportunity?.country)
                              ?.name || t('geographic.insight.no_data')}
                          </div>
                          <div className="text-sm text-purple-700">
                            {opportunity?.cities_count || 0} {t('geographic.insight.cities_dot')}{' '}
                            {opportunity?.current_visits || 0} {t('geographic.insight.visits_label')}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          opportunity?.growth_potential === 'high'
                            ? 'bg-green-100 text-green-800'
                            : opportunity?.growth_potential === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {opportunity?.growth_potential === 'high'
                          ? t('geographic.insight.high_potential')
                          : opportunity?.growth_potential === 'medium'
                          ? t('geographic.insight.medium_potential')
                          : t('geographic.insight.low_potential')}{' '}
                        {t('geographic.insight.potential_suffix')}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GeoInsight
