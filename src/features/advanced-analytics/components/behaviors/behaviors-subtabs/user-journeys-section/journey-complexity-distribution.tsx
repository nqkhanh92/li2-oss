import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { formatDuration } from '@/features/advanced-analytics/utils/helper'
import { getComplexityColor } from '@/features/advanced-analytics/utils/helper'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'
import { Tooltip } from 'recharts'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { useTranslation } from 'react-i18next'

const JourneyComplexityDistribution = () => {
  const { t } = useTranslation('advanced_analytics')
  const MAP_COMPLEXITY: Record<string, string> = {
    single_touchpoint: t('behaviors.user_journeys.complexity.single_link'),
    two_touchpoint: t('behaviors.user_journeys.complexity.two_links'),
    multi_touchpoint: t('behaviors.user_journeys.complexity.multi_links'),
  }
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-user-journeys', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const complexityChartData = data?.journey_analysis?.journey_patterns.map((pattern) => ({
    complexity: MAP_COMPLEXITY[pattern.complexity],
    percentage: pattern.pattern_percentage,
    users: pattern.users_count,
    avgInteractions: pattern.avg_interactions_per_journey,
    avgDuration: pattern.avg_journey_duration_minutes,
  }))

  const pieChartData = complexityChartData?.map((item, index) => ({
    name: item.complexity,
    value: item.percentage,
    users: item.users,
    color: ['#3b82f6', '#10b981', '#8b5cf6'][index] || '#6b7280',
  }))

  console.log('data?.journey_analysis?.journey_patterns')

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('behaviors.user_journeys.complexity.title')}</h3>
          <p className="text-sm text-gray-600">{t('behaviors.user_journeys.complexity.subtitle')}</p>
        </div>
      </div>

      {!data?.journey_analysis?.journey_patterns ? (
        <EmptySection />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value}% (${props?.payload?.users} users)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Complexity Details */}
          <div className="space-y-3">
            {data?.journey_analysis?.journey_patterns?.map((pattern) => (
              <div key={pattern?.complexity} className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getComplexityColor(
                      pattern?.complexity
                    )}`}
                  >
                    {MAP_COMPLEXITY[pattern?.complexity]}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      {pattern?.pattern_percentage}%
                    </div>
                    <div className="text-xs text-gray-600">{t('behaviors.user_journeys.complexity.users_count', { n: pattern?.users_count })}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {pattern?.avg_interactions_per_journey}
                    </div>
                    <div className="text-gray-600">{t('behaviors.user_journeys.complexity.avg_interactions')}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {pattern?.avg_touchpoints_per_journey}
                    </div>
                    <div className="text-gray-600">{t('behaviors.user_journeys.complexity.avg_links')}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {formatDuration(pattern?.avg_journey_duration_minutes || 0)}
                    </div>
                    <div className="text-gray-600">{t('behaviors.user_journeys.complexity.avg_duration')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default JourneyComplexityDistribution
