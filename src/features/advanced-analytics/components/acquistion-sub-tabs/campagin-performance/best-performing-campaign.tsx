import { CampaignPerformancePremiumTierData } from '@/core/types/analytics/campaign-performance.type'
import { Award, BarChart3, Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSourceIcon } from '../../../utils/helper'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'

type BestPerformingCampaignProps = {
  data: CampaignPerformancePremiumTierData
}

const BestPerformingCampaign = () => {
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


  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-campaign-performance', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  if (!data || !data?.insights?.premium_insights) return <></>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Best Performing Campaign */}
      <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-600 text-white rounded-lg flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              {t('campaign_performance.best_campaign.title')}
              <Crown className="w-4 h-4 text-purple-500 ml-2" />
            </h4>

            <div className="space-y-3">
              <div>
                <div className="font-semibold text-gray-900 flex items-center">
                  <span className="text-lg mr-2">
                    {getSourceIcon(
                      data.insights.premium_insights.best_performing_campaign.utm_source
                    )}
                  </span>
                  {data.insights.premium_insights.best_performing_campaign.utm_campaign}
                </div>
                <div className="text-sm text-gray-600">
                  {data.insights.premium_insights.best_performing_campaign.utm_source} /{' '}
                  {data.insights.premium_insights.best_performing_campaign.utm_medium}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">{t('campaign_performance.best_campaign.performance_score')}</div>
                  <div className="text-xl font-bold text-green-600">
                    {data.insights.premium_insights.best_performing_campaign.performance_score}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('campaign_performance.best_campaign.engagement')}</div>
                  <div className="text-xl font-bold text-blue-600">
                    {data.insights.premium_insights.best_performing_campaign.visits_per_user}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('campaign_performance.best_campaign.repeat_rate')}</div>
                  <div className="text-xl font-bold text-purple-600">
                    {data.insights.premium_insights.best_performing_campaign.repeat_user_rate}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('campaign_performance.best_campaign.links')}</div>
                  <div className="text-xl font-bold text-orange-600">
                    {data.insights.premium_insights.best_performing_campaign.touchpoints_used}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Distribution */}
      <div className="bg-linear-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-indigo-600 text-white rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              {t('campaign_performance.best_campaign.distribution_title')}
              <Crown className="w-4 h-4 text-purple-500 ml-2" />
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded-lg p-3 border border-green-100">
                <div className="text-2xl font-bold text-green-600">
                  {data.insights.premium_insights.performance_distribution.top_performers}
                </div>
                <div className="text-xs text-gray-600">{t('campaign_performance.best_campaign.top_performers')}</div>
              </div>

              <div className="bg-background rounded-lg p-3 border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">
                  {data.insights.premium_insights.performance_distribution.good_performers}
                </div>
                <div className="text-xs text-gray-600">{t('campaign_performance.best_campaign.good_performers')}</div>
              </div>

              <div className="bg-background rounded-lg p-3 border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-600">
                  {data.insights.premium_insights.performance_distribution.average_performers}
                </div>
                <div className="text-xs text-gray-600">{t('campaign_performance.best_campaign.average')}</div>
              </div>

              <div className="bg-background rounded-lg p-3 border border-red-100">
                <div className="text-2xl font-bold text-red-600">
                  {data.insights.premium_insights.performance_distribution.underperformers}
                </div>
                <div className="text-xs text-gray-600">{t('campaign_performance.best_campaign.need_work')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BestPerformingCampaign
