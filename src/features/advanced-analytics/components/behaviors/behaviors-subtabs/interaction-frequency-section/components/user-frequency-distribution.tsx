import { Users, Crown } from 'lucide-react'
import { getConsistencyColor, getFrequencyColor } from '@/features/advanced-analytics/utils/helper'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'

const UserFrequencyDistribution = () => {
  const { t } = useTranslation('advanced_analytics')
  const { timePeriod, selectedTags, selectedTouchpoints, spaceId, selectedSpaceIds } =
    useAdvancedAnalyticsProvider()
  const { org_id } = useParams<{ org_id: string }>()
  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-interaction-frequency', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })
  const userFrequencyDist = data?.frequency_analysis?.user_frequency_distribution
  const summary = data?.insights?.user_behavior_summary

  if (!userFrequencyDist || !summary) return <></>

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            {t('behaviors.interaction_frequency.user_frequency.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">
            {t('behaviors.interaction_frequency.user_frequency.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequency Distribution */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">{t('behaviors.interaction_frequency.user_frequency.frequency_segments')}</h4>
          <div className="space-y-3">
            {userFrequencyDist
              ?.reduce((acc: UserFrequencyDistribution[], user: UserFrequencyDistribution) => {
                const existing = acc.find(
                  (item: UserFrequencyDistribution) =>
                    item.frequency_segment === user.frequency_segment
                )
                if (existing) {
                  existing.user_count += user.user_count
                  existing.avg_interactions =
                    (existing.avg_interactions * (existing.user_count - user.user_count) +
                      user.avg_interactions * user.user_count) /
                    existing.user_count
                } else {
                  acc.push({ ...user })
                }
                return acc
              }, [])
              .map((segment) => (
                <div
                  key={segment.frequency_segment}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getFrequencyColor(
                        segment.frequency_segment
                      )}`}
                    >
                      {segment.frequency_segment.replace('_', ' ')}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{t('behaviors.interaction_frequency.user_frequency.users_count', { n: segment.user_count })}</div>
                      <div className="text-xs text-gray-600">
                        {t('behaviors.interaction_frequency.user_frequency.avg_interactions', { n: segment.avg_interactions.toFixed(1) })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {Math.round((segment?.user_count / summary?.total_users) * 100)}%
                    </div>
                    <div className="text-xs text-gray-600">{t('behaviors.interaction_frequency.user_frequency.of_total_users')}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Consistency Analysis */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">{t('behaviors.interaction_frequency.user_frequency.consistency_patterns')}</h4>
          <div className="space-y-3">
            {userFrequencyDist
              ?.filter((user) => user.consistency_segment !== 'single_day')
              .map((user, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getConsistencyColor(
                    user.consistency_segment
                  )}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900 capitalize">
                      {user.consistency_segment.replace('_', ' ')} •{' '}
                      {user.frequency_segment.replace('_', ' ')}
                    </div>
                    <div className="font-bold">{user.user_count} users</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium">{user.avg_interactions.toFixed(1)}</div>
                      <div className="text-gray-600">{t('behaviors.interaction_frequency.user_frequency.avg_interactions_label')}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{user.avg_active_days.toFixed(1)}</div>
                      <div className="text-gray-600">{t('behaviors.interaction_frequency.user_frequency.active_days')}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{user.avg_interactions_per_day.toFixed(1)}</div>
                      <div className="text-gray-600">{t('behaviors.interaction_frequency.user_frequency.daily_rate')}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserFrequencyDistribution
