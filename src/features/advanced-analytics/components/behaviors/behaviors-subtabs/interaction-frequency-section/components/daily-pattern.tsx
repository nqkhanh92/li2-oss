import { ChevronDown, ChevronRight, Monitor, Smartphone } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from 'recharts'
import { useParams } from 'next/navigation'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { formatHour } from '@/features/advanced-analytics/utils/calculation'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

const DailyPattern = () => {
  const { t } = useTranslation('advanced_analytics')
  const {
    allowExtraAdvancedAnalytic,
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-interaction-frequency', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const [showPlatformDetails, setShowPlatformDetails] = useState(false)
  const dailyPatterns = data?.frequency_analysis?.daily_patterns

  const summary = data?.insights?.user_behavior_summary

  const dailyChartData = useMemo(
    () =>
      dailyPatterns?.map((day) => ({
        date: day.date,
        label: new Date(day.date).toLocaleDateString('en', {
          month: 'short',
          day: 'numeric',
        }),
        interactions: day.total_interactions,
        users: day.unique_users,
        interactions_per_user: day.interactions_per_user,
        active_touchpoints: day.active_touchpoints,
        peak_hour: day.peak_hour,
        mobile_interactions: day.platform_breakdown.mobile_interactions,
        desktop_interactions: day.platform_breakdown.desktop_interactions,
      })) || [],
    [dailyPatterns]
  )

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('behaviors.interaction_frequency.daily_pattern.title')}</h3>
          <p className="text-sm text-gray-600">
            {t('behaviors.interaction_frequency.daily_pattern.subtitle')}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowPlatformDetails(!showPlatformDetails)}
          size="xs"
          className="text-xs px-3 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors flex items-center font-normal"
          iconLeft={
            showPlatformDetails ? (
              <ChevronDown className="max-w-3 max-h-3" />
            ) : (
              <ChevronRight className="max-w-3 max-h-3" />
            )
          }
        >
          <span>{showPlatformDetails ? t('behaviors.interaction_frequency.daily_pattern.toggle_hide') : t('behaviors.interaction_frequency.daily_pattern.toggle_show')}</span>
        </Button>
      </div>

      {/* Daily Timeline Chart */}
      <div className="mb-6">
        {/* <ResponsiveContainer> */}
        <LineChart
          data={dailyChartData}
          style={{ width: '100%', height: '100%', maxHeight: '300px', aspectRatio: 1.618 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            stroke="#6b7280"
            fontSize={12}
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
                <div className="bg-background border border-gray-200 rounded-lg p-3 shadow-lg">
                  <div className="text-sm font-medium text-gray-900 mb-2">{label}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between space-x-4">
                      <span className="text-blue-600">{t('behaviors.interaction_frequency.daily_pattern.tooltip_interactions')}</span>
                      <span className="font-bold">{data.interactions}</span>
                    </div>
                    <div className="flex items-center justify-between space-x-4">
                      <span className="text-green-600">{t('behaviors.interaction_frequency.daily_pattern.tooltip_users')}</span>
                      <span className="font-bold">{data.users}</span>
                    </div>
                    <div className="flex items-center justify-between space-x-4">
                      <span className="text-purple-600">{t('behaviors.interaction_frequency.daily_pattern.tooltip_per_user')}</span>
                      <span className="font-bold">{data.interactions_per_user}</span>
                    </div>
                    <div className="flex items-center justify-between space-x-4">
                      <span className="text-orange-600">{t('behaviors.interaction_frequency.daily_pattern.tooltip_active_links')}</span>
                      <span className="font-bold">{data.active_touchpoints}</span>
                    </div>
                    <div className="flex items-center justify-between space-x-4">
                      <span className="text-indigo-600">{t('behaviors.interaction_frequency.daily_pattern.tooltip_peak_hour')}</span>
                      <span className="font-bold">{formatHour(data.peak_hour)}</span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="interactions"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="users"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
        {/* </ResponsiveContainer> */}
      </div>

      {/* Platform Breakdown - Progressive Disclosure */}
      {showPlatformDetails && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Monitor className="w-4 h-4 mr-2" />
            {t('behaviors.interaction_frequency.daily_pattern.platform_by_day')}
          </h4>
          <div className="space-y-2">
            {dailyPatterns?.map((day, index) => {
              const totalInteractions = day?.total_interactions || 0
              const mobilePercent =
                totalInteractions > 0
                  ? Math.round(
                      (day?.platform_breakdown?.mobile_interactions / totalInteractions) * 100
                    )
                  : 0
              const desktopPercent = 100 - mobilePercent

              return (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-700 w-16">
                      {new Date(day?.date || '').toLocaleDateString('en', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-sm text-gray-900">{totalInteractions} {t('behaviors.interaction_frequency.daily_pattern.interactions_suffix')}</div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-blue-500" />
                      <div className="text-sm">
                        <span className="font-medium text-blue-600">
                          {day?.platform_breakdown?.mobile_interactions || 0}
                        </span>
                        <span className="text-gray-500"> ({mobilePercent}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4 text-green-500" />
                      <div className="text-sm">
                        <span className="font-medium text-green-600">
                          {day?.platform_breakdown?.desktop_interactions || 0}
                        </span>
                        <span className="text-gray-500"> ({desktopPercent}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Platform Summary */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">{t('behaviors.interaction_frequency.daily_pattern.mobile')}</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {dailyPatterns?.reduce(
                  (sum, day) => sum + (day?.platform_breakdown?.mobile_interactions || 0),
                  0
                )}
              </div>
              <div className="text-xs text-blue-600">
                {Math.round(
                  (dailyPatterns?.reduce(
                    (sum, day) => sum + (day?.platform_breakdown?.mobile_interactions || 0),
                    0
                  ) /
                    (summary?.total_interactions || 0)) *
                    100
                ) || 0}
                {t('behaviors.interaction_frequency.daily_pattern.of_total')}
              </div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Monitor className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">{t('behaviors.interaction_frequency.daily_pattern.desktop')}</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {dailyPatterns?.reduce(
                  (sum, day) => sum + (day?.platform_breakdown?.desktop_interactions || 0),
                  0
                )}
              </div>
              <div className="text-xs text-green-600">
                {Math.round(
                  (dailyPatterns?.reduce(
                    (sum, day) => sum + (day?.platform_breakdown?.desktop_interactions || 0),
                    0
                  ) /
                    (summary?.total_interactions || 0)) *
                    100
                ) || 0}
                {t('behaviors.interaction_frequency.daily_pattern.of_total')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyPattern
