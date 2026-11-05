import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'

type ChannelDiversityProps = {}

const ChannelDiversity = () => {
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

  const insights = advancedAnalyticsData?.insights
  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{t('channel_attribution.channel_diversity.title')}</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {advancedAnalyticsData?.touchpoint_attribution?.summary?.unique_first_touchpoints || 0}
          </div>
          <div className="text-sm text-gray-600">{t('channel_attribution.channel_diversity.first_touch_points')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {advancedAnalyticsData?.touchpoint_attribution?.summary?.unique_last_touchpoints || 0}
          </div>
          <div className="text-sm text-gray-600">{t('channel_attribution.channel_diversity.last_touch_points')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {advancedAnalyticsData?.touchpoint_attribution?.summary?.avg_channels_per_user?.toFixed(
              1
            ) || 0}
          </div>
          <div className="text-sm text-gray-600">{t('channel_attribution.channel_diversity.avg_touchpoints_user')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {advancedAnalyticsData?.touchpoint_attribution?.summary?.avg_interactions_per_user?.toFixed(
              1
            ) || 0}
          </div>
          <div className="text-sm text-gray-600">{t('channel_attribution.channel_diversity.avg_interactions_user')}</div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-sm">
          <strong>{t('channel_attribution.channel_diversity.channel_strategy')}</strong>{' '}
          {insights?.touchpoint_model_comparison?.touchpoint_diversity === 'high_diversity'
            ? t('channel_attribution.channel_diversity.high_diversity')
            : insights?.touchpoint_model_comparison?.touchpoint_diversity === 'moderate_diversity'
            ? t('channel_attribution.channel_diversity.moderate_diversity')
            : t('channel_attribution.channel_diversity.low_diversity')}
        </div>
      </div>
    </div>
  )
}

export default ChannelDiversity
