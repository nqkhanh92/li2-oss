import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const WeeklyActivityPattern = () => {
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
  const dayOfWeekPatterns = data?.frequency_analysis?.day_of_week_patterns
  const dayOfWeekChartData = useMemo(
    () =>
      dayOfWeekPatterns?.map((day) => ({
        day: day.day_name.substring(0, 3), // Mon, Tue, etc.
        interactions: day.total_interactions,
        users: day.unique_users,
        avg_per_occurrence: day.avg_interactions_per_occurrence,
      })),
    [dayOfWeekPatterns]
  )

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('behaviors.interaction_frequency.weekly_pattern.title')}</h3>
          <p className="text-sm text-gray-600">{t('behaviors.interaction_frequency.weekly_pattern.subtitle')}</p>
        </div>
      </div>

      <div className="mb-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dayOfWeekChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip />
            <Bar dataKey="interactions" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {dayOfWeekPatterns?.map((day, index) => (
          <div key={day?.day_name} className="text-center p-3 bg-slate-50 rounded-lg border">
            <div className="text-sm font-bold text-gray-900">{day?.day_name.substring(0, 3)}</div>
            <div className="text-lg font-bold text-green-600 mt-1">{day?.total_interactions}</div>
            <div className="text-xs text-gray-600">{day?.unique_users} {t('behaviors.interaction_frequency.weekly_pattern.users')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WeeklyActivityPattern
