import { Crown } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { EmptySection } from '@/shared/components/customize/empty-section'
type CustomerJourneyPathProps = {}

const CustomerJourneyPath = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-touchpoint-channel-attribution', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const touchpoint_attribution = useMemo(() => data.touchpoint_attribution, [data])

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Crown className="w-5 h-5 text-indigo-500 mr-2" />
            {t('channel_attribution.journey_path.title')}
          </h3>
          <p className="text-sm text-gray-600">{t('channel_attribution.journey_path.subtitle')}</p>
        </div>
        <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
          {t('channel_attribution.journey_path.premium_only')}
        </div>
      </div>

      {touchpoint_attribution?.channel_sequences &&
      touchpoint_attribution?.channel_sequences?.length > 0 ? (
        <div className="space-y-4">
          {touchpoint_attribution?.channel_sequences?.slice(0, 6).map((sequence, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                sequence.journey_complexity === 'single_touchpoint'
                  ? 'bg-green-50 border-green-200'
                  : sequence.journey_complexity === 'two_touchpoint'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-purple-50 border-purple-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sequence.journey_complexity === 'single_touchpoint'
                        ? 'bg-green-100 text-green-700'
                        : sequence.journey_complexity === 'two_touchpoint'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {sequence?.journey_complexity?.replace('_', ' ')}
                  </div>
                  <div className="font-medium text-gray-900">{sequence?.touchpoint_path}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{sequence?.users_count}</div>
                  <div className="text-xs text-gray-500">{sequence.path_share_pct}{t('channel_attribution.journey_path.of_users')}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">{t('channel_attribution.journey_path.channel')}</span> {sequence.channel_path}
                </div>
                <div>
                  <span className="font-medium">{t('channel_attribution.journey_path.avg_interactions')}</span> {sequence.avg_interactions}
                </div>
                <div>
                  <span className="font-medium">{t('channel_attribution.journey_path.duration')}</span> {sequence.avg_duration_hours}h
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptySection description={t('channel_attribution.journey_path.empty')} />
      )}
    </div>
  )
}

export default CustomerJourneyPath
