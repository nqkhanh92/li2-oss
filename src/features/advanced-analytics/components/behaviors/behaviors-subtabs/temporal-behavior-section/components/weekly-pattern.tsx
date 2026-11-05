import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { useTranslation } from 'react-i18next'

const WeeklyPattern = () => {
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

  const { t } = useTranslation('advanced_analytics')
  const { data } = useAdvancedAnalytics(org_id, 'behaviors-temporal-patterns', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const concentrationData = [
    {
      subject: 'Peak Hours',
      A: data?.insights?.peak_activity?.activity_concentration?.above_avg_hours,
      fullMark: 24,
    },
    {
      subject: 'Peak Days',
      A: data?.insights?.peak_activity?.activity_concentration?.above_avg_days,
      fullMark: 7,
    },
    {
      subject: 'Hour Diversity',
      A:
        Math.round(
          ((data?.insights?.temporal_summary?.temporal_diversity?.hour_spread_percentage || 0) /
            100) *
            24
        ) || 0,
      fullMark: 24,
    },
    {
      subject: 'Day Diversity',
      A:
        Math.round(
          ((data?.insights?.temporal_summary?.temporal_diversity?.day_spread_percentage || 0) /
            100) *
            7
        ) || 0,
      fullMark: 7,
    },
    {
      subject: 'Active Hours',
      A: data?.insights?.temporal_summary?.unique_hours_active || 0,
      fullMark: 24,
    },
    {
      subject: 'Active Days',
      A: data?.insights?.temporal_summary?.unique_days_active || 0,
      fullMark: 7,
    },
  ]

  const dailyChartData = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ].map((dayName, index) => {
    const dayData = data?.temporal_analysis?.daily_patterns?.find((d) => d.day_of_week === index)
    return {
      day: dayName?.substring(0, 3),
      fullDay: dayName,
      interactions: dayData?.total_interactions || 0,
      users: dayData?.unique_users || 0,
      interactions_per_user: dayData?.interactions_per_user || 0,
      touchpoints: dayData?.active_touchpoints || 0,
    }
  })

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('behaviors.temporal_behavior.weekly_pattern.title')}</h3>
          <p className="text-sm text-gray-600">{t('behaviors.temporal_behavior.weekly_pattern.subtitle')}</p>
        </div>
      </div>

      {!data?.temporal_analysis?.daily_patterns ? (
        <EmptySection />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Bar Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border border-gray-200 rounded-lg p-3 shadow-lg">
                        <div className="text-sm font-medium text-gray-900 mb-2">{data.fullDay}</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between space-x-4">
                            <span className="text-blue-600">{t('behaviors.temporal_behavior.weekly_pattern.tooltip_interactions')}</span>
                            <span className="font-bold">{data.interactions}</span>
                          </div>
                          <div className="flex items-center justify-between space-x-4">
                            <span className="text-green-600">{t('behaviors.temporal_behavior.weekly_pattern.tooltip_users')}</span>
                            <span className="font-bold">{data.users}</span>
                          </div>
                          <div className="flex items-center justify-between space-x-4">
                            <span className="text-orange-600">{t('behaviors.temporal_behavior.weekly_pattern.tooltip_links')}</span>
                            <span className="font-bold">{data.touchpoints}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="interactions" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Concentration Radar */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4 text-center">
              {t('behaviors.temporal_behavior.weekly_pattern.temporal_profile')}
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={concentrationData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 24]} tick={{ fontSize: 8 }} />
                <Radar
                  name="Activity"
                  dataKey="A"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="text-center text-xs text-gray-600 mt-2">
              {t('behaviors.temporal_behavior.weekly_pattern.activity_distribution')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyPattern
