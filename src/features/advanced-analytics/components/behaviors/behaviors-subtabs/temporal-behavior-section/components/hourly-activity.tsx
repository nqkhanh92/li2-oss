import { useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Area,
} from 'recharts'
import { ChevronDown, ChevronRight, Smartphone, Monitor } from 'lucide-react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'
import { formatHour } from '@/features/advanced-analytics/utils/calculation'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

const HourlyActivity = () => {
  const { t } = useTranslation('advanced_analytics')
  const [showHourlyDetails, setShowHourlyDetails] = useState(false)
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

  const { data } = useAdvancedAnalytics(org_id, 'behaviors-temporal-patterns', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })
  // Prepare chart data
  const hourlyChartData = Array.from({ length: 24 }, (_, hour) => {
    const hourData = data?.temporal_analysis.hourly_patterns.find((h) => h.hour === hour)
    return {
      hour: hour,
      label: formatHour(hour),
      interactions: hourData?.total_interactions || 0,
      users: hourData?.unique_users || 0,
      interactions_per_user: hourData?.interactions_per_user || 0,
      mobile: hourData?.platform_breakdown.mobile_interactions || 0,
      desktop: hourData?.platform_breakdown.desktop_interactions || 0,
    }
  })
  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('behaviors.temporal_behavior.hourly_activity.title')}</h3>
          <p className="text-sm text-gray-600">
            {t('behaviors.temporal_behavior.hourly_activity.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setShowHourlyDetails(!showHourlyDetails)}
          size="xs"
          className="text-xs bg-orange-100 text-orange-700 px-3 py-2 rounded-full hover:bg-orange-200 transition-colors flex items-center space-x-1"
          iconLeft={
            showHourlyDetails ? (
              <ChevronDown className="max-h-3 max-w-3" />
            ) : (
              <ChevronRight className="max-h-3 max-w-3" />
            )
          }
        >
          <span>{showHourlyDetails ? t('behaviors.temporal_behavior.hourly_activity.toggle_hide') : t('behaviors.temporal_behavior.hourly_activity.toggle_show')}</span>
        </Button>
      </div>

      {/* Hourly Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={hourlyChartData}>
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
                  <div className="bg-background border border-gray-200 rounded-lg p-3 shadow-lg">
                    <div className="text-sm font-medium text-gray-900 mb-2">{label}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-orange-600">{t('behaviors.temporal_behavior.hourly_activity.tooltip_interactions')}</span>
                        <span className="font-bold">{data.interactions}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-blue-600">{t('behaviors.temporal_behavior.hourly_activity.tooltip_users')}</span>
                        <span className="font-bold">{data.users}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-green-600">{t('behaviors.temporal_behavior.hourly_activity.tooltip_avg_user')}</span>
                        <span className="font-bold">{data.interactions_per_user}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="interactions"
              stackId="1"
              stroke="#f97316"
              fill="#f97316"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Split - Progressive Disclosure */}
      {showHourlyDetails && (
        <div className="space-y-4 border-t border-gray-100 pt-6">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Monitor className="w-4 h-4 mr-2" />
            {t('behaviors.temporal_behavior.hourly_activity.platform_by_hour')}
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
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
                <Tooltip />
                <Bar dataKey="mobile" stackId="a" fill="#3b82f6" name="Mobile" />
                <Bar dataKey="desktop" stackId="a" fill="#10b981" name="Desktop" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">{t('behaviors.temporal_behavior.hourly_activity.mobile')}</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {hourlyChartData.reduce((sum, hour) => sum + hour.mobile, 0)}
              </div>
              <div className="text-xs text-blue-600">{t('behaviors.temporal_behavior.hourly_activity.total_interactions')}</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Monitor className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">{t('behaviors.temporal_behavior.hourly_activity.desktop')}</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {hourlyChartData.reduce((sum, hour) => sum + hour.desktop, 0)}
              </div>
              <div className="text-xs text-green-600">{t('behaviors.temporal_behavior.hourly_activity.total_interactions')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HourlyActivity
