import { GitBranch } from 'lucide-react'
import { Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSourceIcon } from '../../../utils/helper'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'


const TopSourceCombination = () => {
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
    <div className="bg-linear-to-r from-indigo-50 to-cyan-50 rounded-lg p-6 border border-indigo-200">
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-cyan-600 text-white rounded-lg flex items-center justify-center">
          <GitBranch className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            {t('campaign_performance.top_source.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-600 text-sm">{t('campaign_performance.top_source.combination')}</div>
              <div className="font-semibold text-gray-900 flex items-center">
                <span className="text-lg mr-2">
                  {getSourceIcon(
                    data.insights.premium_insights.top_source_medium.combo.split(' / ')[0]
                  )}
                </span>
                {data.insights.premium_insights.top_source_medium.combo}
              </div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">{t('campaign_performance.top_source.campaigns')}</div>
              <div className="text-xl font-bold text-indigo-600">
                {data.insights.premium_insights.top_source_medium.campaigns_count}
              </div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">{t('campaign_performance.top_source.total_visits')}</div>
              <div className="text-xl font-bold text-cyan-600">
                {data.insights.premium_insights.top_source_medium.total_visits}
              </div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">{t('campaign_performance.top_source.market_share')}</div>
              <div className="text-xl font-bold text-purple-600">
                {data.insights.premium_insights.top_source_medium.market_share_pct}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopSourceCombination
