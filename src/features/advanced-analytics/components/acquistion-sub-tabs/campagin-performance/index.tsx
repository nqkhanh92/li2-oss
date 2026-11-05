import { AlertCircle } from 'lucide-react'
import React from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import SummaryCards from './summary-cards'
import AdvancedCampaignTable from './advanced-campaign-table'
import MediumCombination from './medium-combination'
import BestPerformingCampaign from './best-performing-campaign'
import TopSourceCombination from './top-source-combination'
import SimpleCampaignList from './simple-campagin-list'
type CampaignPerformanceSubTabProps = {}
export const CampaignPerformanceSubTab = ({}: CampaignPerformanceSubTabProps) => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { allowExtraAdvancedAnalytic, timePeriod, selectedTags, selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } =
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

  if (data?.campaign_performance?.summary?.data_completeness === 'no_utm_enabled_touchpoints') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-linear-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('campaign_performance.no_utm_title')}</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            {t('campaign_performance.no_utm_description')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards />
      {/* FREE TIER: Simple Campaign List */}
      {!allowExtraAdvancedAnalytic && <SimpleCampaignList />}
      {/* PREMIUM TIER: Advanced Campaign Table */}
      {allowExtraAdvancedAnalytic && <AdvancedCampaignTable />}
      {/* Premium: Source/Medium Combinations */}
      {allowExtraAdvancedAnalytic && <MediumCombination />}
      {/* Premium: Campaign Insights */}
      {allowExtraAdvancedAnalytic && <BestPerformingCampaign />}
      {/* Premium: Top Source/Medium Insight */}
      {allowExtraAdvancedAnalytic && <TopSourceCombination />}
    </div>
  )
}
