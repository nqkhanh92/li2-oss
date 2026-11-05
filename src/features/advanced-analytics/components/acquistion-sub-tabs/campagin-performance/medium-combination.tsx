import { getSourceIcon } from '@/features/advanced-analytics/utils/helper'
import { SourceCategory } from '@/core/types/analytics/acquisition-traffic.type'
import { useTranslation } from 'react-i18next'
import { CampaignPerformancePremiumTierData } from '@/core/types/analytics/campaign-performance.type'
import { Crown, GitBranch } from 'lucide-react'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'

type MediumCombinationProps = {
  data: CampaignPerformancePremiumTierData
}

const MediumCombination = () => {
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
    <div className="bg-card rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <GitBranch className="w-5 h-5 text-indigo-600 mr-2" />
            {t('campaign_performance.medium_combination.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {t('campaign_performance.medium_combination.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.campaign_performance?.source_medium_combinations &&
          data?.campaign_performance?.source_medium_combinations?.map((combo, index) => (
            <div
              key={index}
              className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {getSourceIcon(combo.utm_source as SourceCategory)}
                  </span>
                  <div className="text-sm font-medium text-gray-900">
                    {combo.utm_source} / {combo.utm_medium}
                  </div>
                </div>
                <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  #{combo.combo_rank}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-lg font-bold text-indigo-600">{combo.total_visits}</div>
                  <div className="text-xs text-gray-500">{t('campaign_performance.medium_combination.visits')}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">{combo.campaigns_count}</div>
                  <div className="text-xs text-gray-500">{t('campaign_performance.medium_combination.campaigns')}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{combo.avg_engagement}</div>
                  <div className="text-xs text-gray-500">{t('campaign_performance.medium_combination.avg_engage')}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-600">{combo.combo_share_pct}%</div>
                  <div className="text-xs text-gray-500">{t('campaign_performance.medium_combination.share')}</div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default MediumCombination
