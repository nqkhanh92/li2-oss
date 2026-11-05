import { Activity } from 'lucide-react'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { channels } from '../../../constants'
import { analyzeChannels } from '../channel-analysis'
import { generateRecommendations } from '../generate-recommendations'
import { HeatmapDaum } from '@/core/types/analytics/peak-heatmap.type'
import { KeyInsightsSummary } from './key-insights-summary'
import { HeatmapGrid } from './heatmap-grid'
import { ChannelPerformance } from './channel-performance'
import { OptimizationList } from './optimization-list'
import { HeaderSection } from '../../header-section'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { HeatmapGridMobile } from './heatmap-grid-mobile'
import { useTranslation } from 'react-i18next'

const PeakHoursHeatmap = () => {
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
  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data: heatmapData } = useAdvancedAnalytics(org_id, 'peak-heatmap', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const channelAnalysis = analyzeChannels(channels, heatmapData?.heatmap_data ?? [])
  const recommendations = generateRecommendations(heatmapData?.heatmap_data ?? [], channels, t)

  return (
    <LockableSection lockBy="plan" lockText="Premium Feature" locked={!allowExtraAdvancedAnalytic}>
      <div className="rounded-lg p-6 border border-gray-200 bg-card flex flex-col gap-6">
        {/* Header */}
        <HeaderSection
          icon={<Activity className="w-5 h-5 text-purple-600 mr-2" />}
          title={t('peak_hours.title')}
          description={t('peak_hours.description')}
          premiumDescription={t('peak_hours.description')}
          textSize="lg"
        />

        {/* Key Insights */}
        <KeyInsightsSummary heatmap_data={heatmapData?.heatmap_data ?? []} />

        {/* Heatmap */}
        <div className="hidden md:block">
          <HeatmapGrid heatmap_data={heatmapData?.heatmap_data ?? []} />
        </div>
        <div className="block md:hidden">
          <HeatmapGridMobile heatmap_data={heatmapData?.heatmap_data ?? []} />
        </div>

        {/* Detailed Insights */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChannelPerformance data={channelAnalysis} />
          <OptimizationList data={recommendations} />
        </div>
      </div>
    </LockableSection>
  )
}
export default PeakHoursHeatmap
