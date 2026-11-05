import { Target } from 'lucide-react'
import { TopPerformanceTpLeaderBoard } from './top-performance-tp'
import { HeaderSection } from '../../header-section'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
const TopPerfTouchpoint = () => {
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

  const { data: topTouchpoints } = useAdvancedAnalytics(org_id, 'top-touchpoint', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })
  return (
    <div className="bg-card rounded-2xl border p-6 flex flex-col gap-6">
      <HeaderSection
        icon={<Target className="w-5 h-5 text-purple-500 mr-2" />}
        title={t('top_performing_links.title')}
        description={t('top_performing_links.description')}
        premiumDescription={t('top_performing_links.description_premium')}
        textSize="lg"
      />
      <TopPerformanceTpLeaderBoard
        top_touchpoints={topTouchpoints?.top_touchpoints || []}
        allowExtraAdvancedAnalytic={allowExtraAdvancedAnalytic}
        active_touchpoints_in_period={
          topTouchpoints?.filters_applied?.active_touchpoints_in_period || 0
        }
        total_touchpoints_in_filter={
          topTouchpoints?.filters_applied?.total_touchpoints_in_filter || 0
        }
      />
    </div>
  )
}
export default TopPerfTouchpoint
