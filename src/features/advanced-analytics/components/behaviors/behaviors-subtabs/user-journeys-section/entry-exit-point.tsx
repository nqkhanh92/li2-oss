import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Eye, MapPin } from 'lucide-react'
import { formatDuration, getInteractionTypeIcon } from '@/features/advanced-analytics/utils/helper'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

const EntryExitPoint = () => {
  const { t } = useTranslation('advanced_analytics')
  const [showEntryExitDetails, setShowEntryExitDetails] = useState(false)

  const {
    allowExtraAdvancedAnalytic: isPremium,
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-user-journeys', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const entryExitAnalysis = data?.journey_analysis?.entry_exit_analysis

  // Entry/Exit analysis with top performers
  const topEntryPoints = entryExitAnalysis
    ?.filter((item) => item.role === 'entry')
    ?.sort((a, b) => b.users_count - a.users_count)
    ?.slice(0, 5)

  const topExitPoints = entryExitAnalysis
    ?.filter((item) => item.role === 'exit')
    ?.sort((a, b) => b.users_count - a.users_count)
    ?.slice(0, 5)

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('behaviors.user_journeys.entry_exit.title')}</h3>
          <p className="text-sm text-gray-600">{t('behaviors.user_journeys.entry_exit.subtitle')}</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowEntryExitDetails(!showEntryExitDetails)}
          size="xs"
          className="text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded-full hover:bg-blue-200 transition-colors flex items-center font-normal"
          iconLeft={
            showEntryExitDetails ? (
              <ChevronDown className="max-h-3 max-w-3" />
            ) : (
              <ChevronRight className="max-h-3 max-w-3" />
            )
          }
        >
          <span>{showEntryExitDetails ? t('behaviors.user_journeys.entry_exit.toggle_hide') : t('behaviors.user_journeys.entry_exit.toggle_show')}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Entry Points */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-green-600" />
            {t('behaviors.user_journeys.entry_exit.top_entry')}
          </h4>
          <div className="space-y-2">
            {topEntryPoints?.map((point, index) => (
              <div
                key={`${point?.touchpoint_name}-entry`}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-bold text-green-600">#{index + 1}</span>
                    {getInteractionTypeIcon(point?.interaction_type)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{point?.touchpoint_name}</div>
                    <div className="text-xs text-gray-600">{t('behaviors.user_journeys.entry_exit.users_count', { n: point?.users_count })}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">
                    {point?.effectiveness_metric}%
                  </div>
                  <div className="text-xs text-gray-600">{t('behaviors.user_journeys.entry_exit.effectiveness')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Exit Points */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Eye className="w-4 h-4 mr-2 text-red-600" />
            {t('behaviors.user_journeys.entry_exit.top_exit')}
          </h4>
          <div className="space-y-2">
            {topExitPoints?.map((point, index) => (
              <div
                key={`${point?.touchpoint_name}-exit`}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                    {getInteractionTypeIcon(point?.interaction_type)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{point?.touchpoint_name}</div>
                    <div className="text-xs text-gray-600">{t('behaviors.user_journeys.entry_exit.users_count', { n: point?.users_count })}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-600">
                    {formatDuration(point?.avg_journey_duration || 0)}
                  </div>
                  <div className="text-xs text-gray-600">{t('behaviors.user_journeys.entry_exit.avg_duration')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Entry/Exit Details - Progressive Disclosure */}
      {showEntryExitDetails && (
        <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
          <h4 className="font-medium text-gray-900">{t('behaviors.user_journeys.entry_exit.full_analysis')}</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('behaviors.user_journeys.entry_exit.col_touchpoint')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('behaviors.user_journeys.entry_exit.col_role')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('behaviors.user_journeys.entry_exit.col_type')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('behaviors.user_journeys.entry_exit.col_users')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('behaviors.user_journeys.entry_exit.col_avg_interactions')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('behaviors.user_journeys.entry_exit.col_duration')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('behaviors.user_journeys.entry_exit.col_effectiveness')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-gray-200">
                {entryExitAnalysis?.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {item?.touchpoint_name}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item?.role === 'entry'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item?.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 flex items-center space-x-1">
                      {getInteractionTypeIcon(item?.interaction_type)}
                      <span>{item?.interaction_type}</span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item?.users_count}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item?.avg_interactions}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatDuration(item?.avg_journey_duration || 0)}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item?.effectiveness_metric > 15
                            ? 'bg-green-100 text-green-800'
                            : item?.effectiveness_metric > 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item?.effectiveness_metric}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default EntryExitPoint
