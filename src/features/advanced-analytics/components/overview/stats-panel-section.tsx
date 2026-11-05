import { CommonStats, Stats, StatsPanel } from '@/core/types/analytics/stats-panel.type'
import { Activity, Link, QrCode, Smartphone, Users, Wifi } from 'lucide-react'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { channels } from '../../constants'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useTranslation } from 'react-i18next'

export const StatsPanelSection = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { selectedTags, selectedTouchpoints, timePeriod } = useAdvancedAnalyticsProvider()

  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  const { data } = useAdvancedAnalytics(org_id, 'stats-panel', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
  })

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start w-full gap-6">
        <div className="text-sm text-gray-500">{t('stats_panel.period_comparison')}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audience Metrics Card */}
        <div className="bg-background rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-semibold text-gray-900">{t('stats_panel.audience')}</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p
                className="text-2xl font-bold
text-gray-900"
              >
                {formatNumber(data?.stats?.total_visits?.value ?? 0)}
              </p>
              <p className="text-sm text-gray-600">{t('stats_panel.total_visits')}</p>
              <p
                className="text-xs
text-green-600"
              >
                {data?.stats?.total_visits?.change_pct}%
              </p>
            </div>
            <div>
              <p
                className="text-2xl font-bold
text-gray-900"
              >
                {formatNumber(data?.stats?.unique_visits?.value ?? 0)}
              </p>
              <p className="text-sm text-gray-600">{t('stats_panel.unique_visitors')}</p>
              <p
                className="text-xs
text-green-600"
              >
                {data?.stats?.unique_visits?.change_pct}%
              </p>
            </div>
          </div>
        </div>

        {/* Channels Card */}
        <div className="bg-background rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-4">
            <Activity className="w-5 h-5 text-purple-600 mr-2" />
            <h4 className="font-semibold text-gray-900">{t('stats_panel.channels')}</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {channels?.map((channel) => {
              const Icon = channel.icon
              const channelData = data?.stats[channel.key]
              return (
                <div key={channel.key} className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 ${channel.color}`} />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatNumber(channelData?.value ?? 0)}
                    </p>
                    <p className="text-xs text-gray-600">{channel.name}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
