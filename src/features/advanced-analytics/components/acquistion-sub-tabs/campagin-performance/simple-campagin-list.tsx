import { getSourceIcon } from '@/features/advanced-analytics/utils/helper'
import { SourceCategory } from '@/core/types/analytics/acquisition-traffic.type'
import { useTranslation } from 'react-i18next'
import { CampaignPerformanceFreeTierData } from '@/core/types/analytics/campaign-performance.type'
import { Crown, Megaphone, Target } from 'lucide-react'
import { Award } from 'lucide-react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'

type SimpleCampaignListProps = {
  data: CampaignPerformanceFreeTierData
}

const SimpleCampaignList = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-campaign-performance', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  if (!data || !data?.campaign_performance?.source_medium_combinations) return <></>

  return (
    <div className="bg-card rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-linear-to-r from-orange-50 to-red-50 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
          <Megaphone className="w-5 h-5 text-orange-600 mr-2" />
          {t('campaign_performance.simple_list.title')}
        </h4>
        <p className="text-sm text-gray-600 mt-1">{t('campaign_performance.simple_list.subtitle')}</p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {data?.campaign_performance?.campaigns &&
            data?.campaign_performance?.campaigns?.map((campaign, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-red-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    #{campaign.volume_rank}
                  </div>
                  <div>
                    <h6 className="font-semibold text-gray-900 flex items-center">
                      <span className="text-lg mr-2">
                        {getSourceIcon(campaign.utm_source as SourceCategory)}
                      </span>
                      {campaign.utm_campaign}
                    </h6>
                    <p className="text-sm text-gray-600">
                      {campaign.utm_source} / {campaign.utm_medium}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-orange-600">{campaign.total_visits}</div>
                  <div className="text-sm text-gray-500">{campaign.campaign_share_pct}{t('campaign_performance.simple_list.share_suffix')}</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Free Tier Insights */}
      <div className="mt-6 space-y-4">
        {/* Top Campaign Insight */}
        <div className="bg-linear-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-red-600 text-white rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-gray-900 mb-2">{t('campaign_performance.simple_list.top_campaign_title')}</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">{t('campaign_performance.simple_list.campaign_label')}</div>
                  <div className="font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">
                      {getSourceIcon(data.insights.top_campaign.utm_source as SourceCategory)}
                    </span>
                    {data.insights.top_campaign.utm_campaign}
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.insights.top_campaign.utm_source} /{' '}
                    {data.insights.top_campaign.utm_medium}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">{t('campaign_performance.simple_list.visits_label')}</div>
                  <div className="text-xl font-bold text-orange-600">
                    {data.insights.top_campaign.visits}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">{t('campaign_performance.simple_list.market_share_label')}</div>
                  <div className="text-xl font-bold text-red-600">
                    {data.insights.top_campaign.market_share_pct}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">{t('campaign_performance.simple_list.engagement_label')}</div>
                  <div className="text-xl font-bold text-purple-600">
                    {data.insights.top_campaign.engagement_rate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* UTM Setup Status */}
        <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h6 className="font-semibold text-gray-900">{t('campaign_performance.simple_list.tracking_status_title')}</h6>
              <p className="text-sm text-gray-600">
                ✅{' '}
                {data.insights.utm_setup_status.message === 'campaign_tracking_active'
                  ? t('campaign_performance.simple_list.active')
                  : t('campaign_performance.simple_list.needs_setup')}
                • {data.insights.utm_setup_status.total_touchpoints_analyzed} {t('campaign_performance.simple_list.links_analyzed')}
              </p>
            </div>
          </div>
        </div>

        {/* Premium Upgrade Section */}
        <div className="p-4 bg-linear-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <div className="flex items-start space-x-3">
            <Crown className="w-5 h-5 text-purple-500 mt-0.5" />
            <div>
              <h5 className="font-semibold text-gray-900 mb-2">
                {t('campaign_performance.simple_list.upgrade_title')}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>{t('campaign_performance.simple_list.upgrade_feature_1')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>{t('campaign_performance.simple_list.upgrade_feature_2')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>{t('campaign_performance.simple_list.upgrade_feature_3')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>{t('campaign_performance.simple_list.upgrade_feature_4')}</span>
                </div>
              </div>
              <button className="bg-linear-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center space-x-2">
                <Crown className="w-4 h-4" />
                <span>{t('campaign_performance.simple_list.upgrade_btn')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleCampaignList
