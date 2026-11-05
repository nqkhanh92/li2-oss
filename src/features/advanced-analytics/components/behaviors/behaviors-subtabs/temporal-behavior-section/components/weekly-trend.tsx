import { TrendingUp, Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'

const WeeklyTrend = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-temporal-patterns', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const weeklyTrends = data?.temporal_analysis.weekly_trends

  if (!weeklyTrends || weeklyTrends.length === 0) return <></>

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
            {t('behaviors.temporal_behavior.weekly_trend.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">{t('behaviors.temporal_behavior.weekly_trend.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week_number" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total_interactions"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                name="Interactions"
              />
              <Line
                type="monotone"
                dataKey="unique_users"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name="Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Metrics */}
        <div className="space-y-3">
          {weeklyTrends?.map((week, index) => (
            <div
              key={week.week_number}
              className="bg-slate-50 border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-900">{t('behaviors.temporal_behavior.weekly_trend.week_label', { n: week.week_number })}</div>
                <div className="flex items-center space-x-2">
                  {index > 0 && (
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        week.total_interactions > weeklyTrends[index - 1].total_interactions
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {week.total_interactions > weeklyTrends[index - 1].total_interactions
                        ? '↗'
                        : '↘'}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-purple-600">{week.total_interactions}</div>
                  <div className="text-xs text-gray-600">{t('behaviors.temporal_behavior.weekly_trend.interactions')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600">{week.unique_users}</div>
                  <div className="text-xs text-gray-600">{t('behaviors.temporal_behavior.weekly_trend.users')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-600">{week.avg_interactions_per_day}</div>
                  <div className="text-xs text-gray-600">{t('behaviors.temporal_behavior.weekly_trend.daily_avg')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-600">{week.active_touchpoints}</div>
                  <div className="text-xs text-gray-600">{t('behaviors.temporal_behavior.weekly_trend.links')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WeeklyTrend
