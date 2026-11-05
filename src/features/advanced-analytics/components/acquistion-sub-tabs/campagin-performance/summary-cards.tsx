import { Hash, Link, Target, Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'

const SummaryCards = () => {
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

  if (!data || !data?.campaign_performance?.summary) return <></>
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-card rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t('campaign_performance.summary.total_campaigns')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {data?.campaign_performance?.summary?.total_campaigns || 0}
            </p>
          </div>
          <Hash className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-background rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t('campaign_performance.summary.campaign_visits')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {data?.campaign_performance?.summary?.total_campaign_visits || 0}
            </p>
          </div>
          <Target className="w-8 h-8 text-purple-500" />
        </div>
      </div>

      <div className="bg-background rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t('campaign_performance.summary.avg_engagement')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {data?.campaign_performance?.summary?.avg_campaign_engagement || 0}
            </p>
          </div>
          <Users className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-background rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t('campaign_performance.summary.utm_touchpoints')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {data?.campaign_performance?.summary?.total_touchpoints_with_utm || 0}
            </p>
          </div>
          <Link className="w-8 h-8 text-orange-500" />
        </div>
      </div>
    </div>
  )
}

export default SummaryCards
