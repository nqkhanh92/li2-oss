import { formatHour } from '@/features/advanced-analytics/utils/calculation'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'

const HourlyActivity = () => {
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
  const peakPeriods = data?.insights?.peak_periods
  const hourlyPatterns = data?.frequency_analysis?.hourly_patterns
  const hourlyChartData = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => {
        const hourData = hourlyPatterns?.find((h) => h.hour === hour)
        return {
          hour: hour,
          label: formatHour(hour),
          interactions: hourData?.total_interactions || 0,
          users: hourData?.unique_users || 0,
        }
      }),
    [hourlyPatterns]
  )
  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('behaviors.interaction_frequency.hourly_activity.title')}</h3>
          <p className="text-sm text-gray-600">{t('behaviors.interaction_frequency.hourly_activity.subtitle')}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              fontSize={10}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const data = payload[0].payload
                return (
                  <div className="bg-card border border-gray-200 rounded-lg p-3 shadow-lg">
                    <div className="text-sm font-medium text-gray-900 mb-2">{label}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-blue-600">{t('behaviors.interaction_frequency.hourly_activity.tooltip_interactions')}</span>
                        <span className="font-bold">{data.interactions}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-green-600">{t('behaviors.interaction_frequency.hourly_activity.tooltip_users')}</span>
                        <span className="font-bold">{data.users}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="interactions" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Peak Hours Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-lg font-bold text-blue-600">
            {peakPeriods?.peak_hour?.hour ? formatHour(peakPeriods?.peak_hour?.hour) : t('behaviors.interaction_frequency.hourly_activity.no_data')}
          </div>
          <div className="text-xs text-blue-700">{t('behaviors.interaction_frequency.hourly_activity.peak_hour')}</div>
          <div className="text-xs text-gray-600">
            {t('behaviors.interaction_frequency.hourly_activity.interactions_count', { n: peakPeriods?.peak_hour?.interactions || 0 })}
          </div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-lg font-bold text-green-600">
            {Math.max(...hourlyChartData.map((d) => d.users))}
          </div>
          <div className="text-xs text-green-700">{t('behaviors.interaction_frequency.hourly_activity.max_users_hour')}</div>
          <div className="text-xs text-gray-600">{t('behaviors.interaction_frequency.hourly_activity.peak_engagement')}</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-lg font-bold text-purple-600">{hourlyPatterns?.length || 0}</div>
          <div className="text-xs text-purple-700">{t('behaviors.interaction_frequency.hourly_activity.active_hours')}</div>
          <div className="text-xs text-gray-600">{t('behaviors.interaction_frequency.hourly_activity.hours_with_activity')}</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-lg font-bold text-orange-600">
            {peakPeriods?.lowest_activity?.hour
              ? formatHour(peakPeriods?.lowest_activity?.hour)
              : t('behaviors.interaction_frequency.hourly_activity.no_data')}
          </div>
          <div className="text-xs text-orange-700">{t('behaviors.interaction_frequency.hourly_activity.lowest_activity')}</div>
          <div className="text-xs text-gray-600">{t('behaviors.interaction_frequency.hourly_activity.min_engagement')}</div>
        </div>
      </div>
    </div>
  )
}

export default HourlyActivity
