import { DailyTrend } from '@/core/types/analytics/daily-trend.type'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { Activity, Crown, TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartConfig, ChartContainer } from '@/shared/components/ui/chart'
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/components/ui/card'
import { Switch } from '@/shared/components/ui/switch'
import { useState } from 'react'
type ActivityLineChartProps = {
  dailyTrendData?: DailyTrend
}
export const ActivityLineChart = ({ dailyTrendData }: ActivityLineChartProps) => {
  const { t } = useTranslation('advanced_analytics')
  const { timePeriod, allowExtraAdvancedAnalytic } = useAdvancedAnalyticsProvider()
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    total_interactions: true,
    unique_users: false,
    moving_avg_3day: false,
  })
  const chartConfig = {
    unique_users: {
      label: t('activity_line_chart.legend_unique_visits'),
      color: 'var(--chart-2)',
    },
    moving_avg_3day: {
      label: t('activity_line_chart.legend_average'),
      color: 'var(--chart-3)',
    },
    total_interactions: {
      label: t('activity_line_chart.legend_total_visits'),
      color: 'var(--chart-1)',
    },
  } satisfies ChartConfig
  const handleToggle = (key: string) => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <Card className="space-y-6">
      <CardHeader>
        <div className="flex items-center justify-between flex-row">
          <div className="md:flex grid grid-cols-2 w-full justify-end items-center gap-6">
            {Object.entries(chartConfig).map(([key, cfg]) => (
              <div
                key={key}
                className="flex items-center flex-row gap-2 text-slate-500 font-normal text-xs"
              >
                {key !== 'total_interactions' && (
                  <Switch
                    className="data-[state=unchecked]:bg-slate-300"
                    checked={visibleLines[key]}
                    onCheckedChange={() => handleToggle(key)}
                    disabled={key !== 'total_interactions' && !allowExtraAdvancedAnalytic} // disable when not allowed
                    checkedIcon={
                      <Crown className="h-5 w-5 p-1 text-neutral-900 fill-neutral-900" />
                    }
                    uncheckedIcon={
                      <Crown className="h-5 w-5 p-1 text-neutral-900 fill-neutral-900" />
                    }
                  />
                )}
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }}></div>
                <div>{cfg.label}</div>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Line Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer>
            {/* <ChartContainer config={chartConfig}> */}
            <LineChart
              // style={{ width: '100%', height: '100%', maxHeight: '300px', aspectRatio: 1.618 }}
              // accessibilityLayer
              data={dailyTrendData?.daily_data || []}
              margin={{
                top: 20,
                left: 12,
                right: 12,
              }}
              // responsive
            >
              <CartesianGrid vertical={false} />
              <YAxis
                fontSize={12}
                axisLine={{ stroke: 'var(--primary)', strokeWidth: 2 }}
                tickLine={{ stroke: 'var(--primary)', strokeWidth: 2 }}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip
                labelFormatter={(date) =>
                  new Date(date).toLocaleDateString('en', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }
                formatter={(value, name) => [
                  value,
                  name === 'total_interactions'
                    ? t('activity_line_chart.tooltip_total_visits')
                    : name === 'unique_users'
                      ? t('activity_line_chart.tooltip_unique_visits')
                      : name === 'moving_avg_3day'
                        ? t('activity_line_chart.legend_average')
                        : name,
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                }}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  const d = new Date(date)
                  if (timePeriod <= 7) {
                    return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })
                  } else {
                    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
                  }
                }}
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280' }}
                interval={'preserveStartEnd'}
              />
              {Object.entries(chartConfig).map(([key, cfg]) =>
                visibleLines[key] ? (
                  <Line
                    key={key}
                    dataKey={key}
                    type="monotone"
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={{ fill: cfg.color }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground"
                      fontSize={12}
                    />
                  </Line>
                ) : null
              )}
            </LineChart>
            {/* </ChartContainer> */}
          </ResponsiveContainer>
        </div>
      </CardContent>
      {/* Key Insights Summary */}
      <CardFooter className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <div className="bg-background rounded-xl p-4 border border-gray-200 shadow-xs">
            <div className="text-2xl font-bold text-gray-900">
              {dailyTrendData?.summary?.peak_day?.interactions}
            </div>
            <div className="text-sm text-gray-600">{t('activity_line_chart.peak_day')}</div>
            <div className="text-xs text-orange-600 mt-1">
              {new Date(dailyTrendData?.summary?.peak_day?.date || '').toLocaleDateString('en', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
          <div className="bg-background rounded-xl p-4 border border-gray-200 shadow-xs">
            <div className="text-2xl font-bold text-gray-900">
              {dailyTrendData?.summary?.avg_daily_interactions}
            </div>
            <div className="text-sm text-gray-600">{t('activity_line_chart.daily_average')}</div>
            <div className="text-xs text-blue-600 mt-1">
              {t('activity_line_chart.interactions_per_day')}
            </div>
          </div>

          <div className="bg-background rounded-xl p-4 border border-gray-200 shadow-xs">
            <div className="text-2xl font-bold text-gray-900">
              {dailyTrendData?.summary?.days_with_activity || 0}
            </div>
            <div className="text-sm text-gray-600">{t('activity_line_chart.active_days')}</div>
            <div className="text-xs text-green-600 mt-1">
              {t('activity_line_chart.out_of', { total: dailyTrendData?.summary?.total_days || 0 })}
            </div>
          </div>

          <div className="bg-background rounded-xl p-4 border border-gray-200 shadow-xs">
            <div
              className={`text-2xl font-bold flex items-center ${
                dailyTrendData?.summary?.trend_direction === 'up'
                  ? 'text-green-600'
                  : dailyTrendData?.summary?.trend_direction === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600'
              }`}
            >
              {dailyTrendData?.summary?.trend_direction === 'up' ? (
                <TrendingUp className="w-6 h-6 mr-1" />
              ) : dailyTrendData?.summary?.trend_direction === 'down' ? (
                <TrendingDown className="w-6 h-6 mr-1" />
              ) : (
                <Activity className="w-6 h-6 mr-1" />
              )}
              <span className="capitalize">
                {dailyTrendData?.summary?.trend_direction || t('activity_line_chart.no_data')}
              </span>
            </div>
            <div className="text-sm text-gray-600">{t('activity_line_chart.trend')}</div>
            <div className="text-xs text-gray-500 mt-1">
              {t('activity_line_chart.overall_direction')}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
