import { Crown } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { EmptySection } from '@/shared/components/customize/empty-section'
type TouchpointPerformingCombinationProps = {}

const TouchpointPerformingCombination = () => {
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
            {t('channel_attribution.combinations.title')}
          </h3>
          <p className="text-sm text-gray-600">{t('channel_attribution.combinations.subtitle')}</p>
        </div>
        <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
          {t('channel_attribution.combinations.premium_only')}
        </div>
      </div>

      {touchpoint_attribution?.touchpoint_channel_combinations &&
      touchpoint_attribution?.touchpoint_channel_combinations?.length > 0 ? (
        <div className="space-y-3">
          {touchpoint_attribution?.touchpoint_channel_combinations
            ?.slice(0, 8)
            ?.map((combo, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{combo.touchpoint_name}</div>
                  <div className="text-xs text-gray-500">
                    {t('channel_attribution.combinations.via')} {combo.discovery_channel} • {combo.interaction_channel.toLowerCase()}{' '}
                    {t('channel_attribution.combinations.channel_suffix')}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-gray-900">{combo.total_users}</div>
                    <div className="text-xs text-gray-500">{t('channel_attribution.combinations.users')}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{combo.avg_engagement.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">{t('channel_attribution.combinations.avg_engagement')}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">{combo.combination_share_pct}%</div>
                    <div className="text-xs text-gray-500">{t('channel_attribution.combinations.share')}</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <EmptySection description={t('channel_attribution.combinations.empty')} />
      )}
    </div>
  )
}

export default TouchpointPerformingCombination
