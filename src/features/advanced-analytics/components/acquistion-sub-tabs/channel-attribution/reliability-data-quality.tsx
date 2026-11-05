import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
type ReliabilityDataQualityProps = {}

const ReliabilityDataQuality = () => {
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

  const { data: advancedAnalyticsData } = useAdvancedAnalytics(
    org_id,
    'acquisitions-touchpoint-channel-attribution',
    {
      period_days: timePeriod,
      tag_ids: selectedTagsIds,
      touchpoint_ids: selectedTouchpointsIds,
    }
  )

  const summary = useMemo(
    () => advancedAnalyticsData?.touchpoint_attribution?.summary,
    [advancedAnalyticsData]
  )
  const period_days = useMemo(
    () => advancedAnalyticsData?.period_info?.period_days,
    [advancedAnalyticsData]
  )

  return (
    <div className="bg-card rounded-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{t('channel_attribution.reliability.title')}</h4>
          <p className="text-sm text-gray-600">
            {t('channel_attribution.reliability.based_on', { users: summary?.total_users_analyzed, days: period_days })}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            summary?.attribution_reliability === 'high'
              ? 'bg-green-100 text-green-800'
              : summary?.attribution_reliability === 'medium'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {summary?.attribution_reliability} {t('channel_attribution.reliability.confidence_suffix')}
        </div>
      </div>
    </div>
  )
}

export default ReliabilityDataQuality
