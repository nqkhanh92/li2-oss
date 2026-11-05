import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { getTrendStyling, getWeeklyAggregatedData } from '../../../utils/helper'
import { Crown } from 'lucide-react'
import { ResponsiveContainer } from 'recharts'
import { CartesianGrid } from 'recharts'
import { XAxis, YAxis, Tooltip, Line, Area, AreaChart } from 'recharts'
import { Button } from '@/shared/components/ui/button'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'

const DailyGrowthTrend = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-growth-trends', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const summary = useMemo(() => data?.growth_analysis?.summary, [data])

  const { orgPlan } = useOrganizationStoreProvider()
  const [chartViewMode, setChartViewMode] = useState('day')
  const allowExtraAdvancedAnalytic = orgPlan?.extra_advanced_analytics
  const chartData = useMemo(() => {
    return chartViewMode === 'day'
      ? data?.growth_analysis?.daily_trends
      : getWeeklyAggregatedData(
          data?.growth_analysis?.daily_trends,
          allowExtraAdvancedAnalytic || false
        )
  }, [chartViewMode, data])
  const trendStyling = getTrendStyling(summary?.trend_direction || '')
  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {chartViewMode === 'day' ? t('growth_trends.daily_growth.title_daily') : t('growth_trends.daily_growth.title_weekly')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('growth_trends.daily_growth.subtitle', { days: data?.period_info?.period_days })}
            {chartViewMode === 'week' && ` (${chartData?.length} ${t('growth_trends.daily_growth.btn_week').toLowerCase()})`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Day/Week Toggle */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <Button
              type="button"
              onClick={() => setChartViewMode('day')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                chartViewMode === 'day' ? '' : 'bg-background text-black'
              }`}
            >
              {t('growth_trends.daily_growth.btn_day')}
            </Button>
            <Button
              type="button"
              onClick={() => setChartViewMode('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                chartViewMode === 'week' ? '' : 'bg-background text-black'
              }`}
            >
              {t('growth_trends.daily_growth.btn_week')}
            </Button>
          </div>
          <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {data?.period_info?.period_days}{t('growth_trends.daily_growth.day_view_suffix')}
            {allowExtraAdvancedAnalytic && (
              <Crown className="inline w-3 h-3 ml-1 text-purple-500" />
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => {
                const dateObj = new Date(date)
                if (chartViewMode === 'week') {
                  return `Week of ${dateObj.toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                  })}`
                }
                return dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' })
              }}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length || !label) return null
                const data = payload[0].payload
                return (
                  <div className="bg-background border border-gray-200 rounded-lg p-3 shadow-lg">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      {chartViewMode === 'week'
                        ? `Week of ${new Date(label).toLocaleDateString('en', {
                            month: 'short',
                            day: 'numeric',
                          })}`
                        : new Date(label).toLocaleDateString('en', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-blue-600">
                          {chartViewMode === 'week' ? t('growth_trends.daily_growth.tooltip_total_visits') : t('growth_trends.daily_growth.tooltip_visits')}
                        </span>
                        <span className="font-bold">{data.total_visits}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-green-600">
                          {chartViewMode === 'week' ? t('growth_trends.daily_growth.tooltip_total_users') : t('growth_trends.daily_growth.tooltip_users')}
                        </span>
                        <span className="font-bold">{data.unique_users}</span>
                      </div>
                      {chartViewMode === 'week' && data.days_count && (
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-orange-600">{t('growth_trends.daily_growth.tooltip_days')}</span>
                          <span className="font-bold">{data.days_count}</span>
                        </div>
                      )}
                      {data.visits_growth_rate !== null && chartViewMode === 'day' && (
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-gray-600">{t('growth_trends.daily_growth.tooltip_growth')}</span>
                          <span
                            className={`font-bold ${
                              data.visits_growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {data.visits_growth_rate > 0 ? '+' : ''}
                            {data.visits_growth_rate}%
                          </span>
                        </div>
                      )}
                      {allowExtraAdvancedAnalytic &&
                        data.visits_3day_avg &&
                        chartViewMode === 'day' && (
                          <div className="flex items-center justify-between space-x-4">
                            <span className="text-purple-600">{t('growth_trends.daily_growth.tooltip_3day_avg')}</span>
                            <span className="font-bold">{data.visits_3day_avg}</span>
                          </div>
                        )}
                      {allowExtraAdvancedAnalytic &&
                        chartViewMode === 'week' &&
                        data.countries_reached > 0 && (
                          <div className="flex items-center justify-between space-x-4">
                            <span className="text-purple-600">{t('growth_trends.daily_growth.tooltip_countries')}</span>
                            <span className="font-bold">{data.countries_reached}</span>
                          </div>
                        )}
                      {allowExtraAdvancedAnalytic &&
                        chartViewMode === 'week' &&
                        data.channels_active > 0 && (
                          <div className="flex items-center justify-between space-x-4">
                            <span className="text-indigo-600">{t('growth_trends.daily_growth.tooltip_channels')}</span>
                            <span className="font-bold">{data.channels_active}</span>
                          </div>
                        )}
                    </div>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="total_visits"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="unique_users"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend & Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-700">{t('growth_trends.daily_growth.legend_total_visits')}</span>
          </div>
          <div className="text-lg font-bold text-blue-600">
            {Math.max(...(chartData?.map((d) => d.total_visits) || []))}
          </div>
          <div className="text-xs text-blue-600">
            {chartViewMode === 'week' ? t('growth_trends.daily_growth.peak_week') : t('growth_trends.daily_growth.peak_day')}
          </div>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700">{t('growth_trends.daily_growth.legend_unique_users')}</span>
          </div>
          <div className="text-lg font-bold text-green-600">
            {Math.max(...(chartData?.map((d) => d.unique_users) || []))}
          </div>
          <div className="text-xs text-green-600">
            {chartViewMode === 'week' ? t('growth_trends.daily_growth.peak_week') : t('growth_trends.daily_growth.peak_day')}
          </div>
        </div>

        <div className="text-center p-3 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-1">
            {chartViewMode === 'week' ? t('growth_trends.daily_growth.data_points') : t('growth_trends.daily_growth.volatility')}
          </div>
          <div className="text-lg font-bold text-gray-600">
            {chartViewMode === 'week'
              ? chartData?.length
              : allowExtraAdvancedAnalytic && summary?.growth_volatility
                ? `±${summary.growth_volatility}%`
                : 'High'}
          </div>
          <div className="text-xs text-gray-600">
            {chartViewMode === 'week' ? t('growth_trends.daily_growth.weeks_analyzed') : t('growth_trends.daily_growth.daily_variation')}
          </div>
        </div>

        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-sm font-medium text-purple-700 mb-1">{t('growth_trends.daily_growth.trend_direction')}</div>
          <div className={`text-lg font-bold ${trendStyling.color}`}>{trendStyling.icon}</div>
          <div className="text-xs text-purple-600 capitalize">
            {summary?.trend_direction?.replace('_', ' ')}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyGrowthTrend
