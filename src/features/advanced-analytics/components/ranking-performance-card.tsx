import {
  AudienceInsights,
  CoreMetrics,
  TopTouchpoint,
} from '@/core/types/analytics/top-touch-point.type'
import { Activity, TrendingUp, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type RankingPerformanceCardProps = {
  id: string
  touchpoint: TopTouchpoint
  performanceBadge: Record<string, any>
  engagementBadge: Record<string, any>
}

export const RankingPerformanceCard = ({
  id,
  touchpoint,
  performanceBadge,
  engagementBadge,
}: RankingPerformanceCardProps) => {
  const { t } = useTranslation('advanced_analytics')
  const formatHour = (hour: number) => {
    return hour === 0
      ? '12 AM'
      : hour === 12
      ? '12 PM'
      : hour < 12
      ? `${hour} AM`
      : `${hour - 12} PM`
  }
  return (
    <div
      key={id}
      className="rounded-xl p-6 border border-gray-200 shadow-md hover:shadow-md transition-shadow"
    >
      {/* Enhanced Header with Rankings */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="flex items-center justify-center w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-full font-bold text-lg">
            #{touchpoint?.rank || 0}
          </div>
          <div>
            <h5 className="font-bold text-gray-900 mb-2 text-lg">{touchpoint.name}</h5>
            <div className="flex items-center space-x-2 mb-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${performanceBadge.bg} ${performanceBadge.text} flex items-center space-x-1`}
              >
                <span>{performanceBadge.icon}</span>
                <span>{performanceBadge.label}</span>
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${engagementBadge.bg} ${engagementBadge.text} flex items-center space-x-1`}
              >
                <span>{engagementBadge.icon}</span>
                <span>{engagementBadge.label}</span>
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-gray-600">
              <span>
                {t('top_performing_links.score')} <strong>{touchpoint.performance_score}</strong>
              </span>
              <span>•</span>
              <span>
                {t('top_performing_links.rank_by_volume')} <strong>#{touchpoint.rankings.by_volume}</strong>
              </span>
              <span>•</span>
              <span>
                {t('top_performing_links.engagement_rank')} <strong>#{touchpoint.rankings.by_engagement}</strong>
              </span>
            </div>
            {touchpoint.associated_tags && touchpoint.associated_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {touchpoint.associated_tags?.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium"
                  >
                    🏷️ {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">
            {touchpoint.core_metrics.total_interactions}
          </div>
          <div className="text-xs text-gray-500 font-medium">{t('top_performing_links.total_interactions_label')}</div>
        </div>
      </div>

      {/* Enhanced Core Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <div className="bg-background rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-bold text-gray-900">
            {touchpoint.core_metrics.unique_users}
          </div>
          <div className="text-xs text-gray-600">{t('top_performing_links.unique_users')}</div>
          <div className="text-xs text-gray-500">
            {t('top_performing_links.user_share', { pct: touchpoint.core_metrics.user_share_pct })}
          </div>
        </div>
        <div className="bg-background rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-bold text-gray-900">
            {touchpoint.core_metrics.interactions_per_user || 'N/A'}
          </div>
          <div className="text-xs text-gray-600">{t('top_performing_links.per_user')}</div>
          <div className="text-xs text-gray-500">{t('top_performing_links.engagement_depth')}</div>
        </div>
        <div className="bg-background rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-bold text-gray-900">
            {touchpoint.core_metrics.active_days}
          </div>
          <div className="text-xs text-gray-600">{t('top_performing_links.active_days')}</div>
          <div className="text-xs text-gray-500">{t('top_performing_links.consistency')}</div>
        </div>
        <div className="bg-background rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-bold text-gray-900">
            {touchpoint.core_metrics.volume_share_pct}%
          </div>
          <div className="text-xs text-gray-600">{t('top_performing_links.volume_share_label')}</div>
          <div className="text-xs text-gray-500">{t('top_performing_links.market_penetration')}</div>
        </div>
        <div className="bg-background rounded-lg p-3 border border-gray-100">
          <div className="text-sm font-bold text-gray-900">
            {formatHour(touchpoint.audience_insights.peak_hour || 0)}
          </div>
          <div className="text-xs text-gray-600">{t('top_performing_links.peak_hour')}</div>
          <div className="text-xs text-gray-500">{t('top_performing_links.optimal_timing')}</div>
        </div>
      </div>

      {/* Enhanced Channel & Audience Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        {/* Complete Channel Breakdown */}
        <div className="bg-background rounded-lg p-4 border border-gray-100">
          <div className="font-semibold text-gray-800 mb-3 flex items-center">
            <Activity className="w-4 h-4 mr-1" />
            {t('top_performing_links.channel_performance')}
          </div>
          <div className="space-y-2">
            {Object.entries(touchpoint.interaction_breakdown).map(([channel, value]) => {
              if (['nfc_taps', 'wifi_accesses'].includes(channel)) return
              const channelIcons = {
                link_clicks: {
                  icon: '🔗',
                  name: t('top_performing_links.channel_link_clicks'),
                  color: value > 0 ? 'text-blue-600' : 'text-gray-400',
                },
                qr_scans: {
                  icon: '📱',
                  name: t('top_performing_links.channel_qr_scans'),
                  color: value > 0 ? 'text-orange-600' : 'text-gray-400',
                },
                nfc_taps: {
                  icon: '📡',
                  name: t('top_performing_links.channel_nfc_taps'),
                  color: value > 0 ? 'text-purple-600' : 'text-gray-400',
                },
                wifi_accesses: {
                  icon: '📶',
                  name: t('top_performing_links.channel_wifi'),
                  color: value > 0 ? 'text-green-600' : 'text-gray-400',
                },
              }
              const channelInfo = channelIcons[channel as keyof typeof channelIcons]

              return (
                <div key={channel} className="flex items-center justify-between">
                  <span className={`flex items-center space-x-1 ${channelInfo.color}`}>
                    <span>{channelInfo.icon}</span>
                    <span>{channelInfo.name}:</span>
                  </span>
                  <span className={`font-medium ${value > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {value > 0 ? value : t('top_performing_links.inactive')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Enhanced Audience Insights */}
        <div className="bg-background rounded-lg p-4 border border-gray-100">
          <div className="font-semibold text-gray-800 mb-3 flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {t('top_performing_links.audience_profile')}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">🌍</span>
                {t('top_performing_links.countries')}
              </span>
              <span className="font-medium">{touchpoint.audience_insights.countries_reached}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">🏙️</span>
                {t('top_performing_links.cities')}
              </span>
              <span className="font-medium">{touchpoint.audience_insights.cities_reached}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">📱</span>
                {t('top_performing_links.mobile')}
              </span>
              <span className="font-medium">{touchpoint.audience_insights.mobile_usage_pct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">🎉</span>
                {t('top_performing_links.weekend')}
              </span>
              <span className="font-medium">{touchpoint.audience_insights.weekend_usage_pct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">🎯</span>
                {t('top_performing_links.direct')}
              </span>
              <span className="font-medium">
                {touchpoint.audience_insights.direct_traffic_pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Complete Rankings Dashboard */}
        <div className="bg-background rounded-lg p-4 border border-gray-100">
          <div className="font-semibold text-gray-800 mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            {t('top_performing_links.perf_rankings')}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">📊</span>
                {t('top_performing_links.rank_volume')}
              </span>
              <span className="font-bold text-blue-600">#{touchpoint.rankings.by_volume}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">🌐</span>{t('top_performing_links.rank_reach')}
              </span>
              <span className="font-bold text-green-600">#{touchpoint.rankings.by_reach}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">💫</span>
                {t('top_performing_links.rank_engagement')}
              </span>
              <span className="font-bold text-purple-600">
                #{touchpoint.rankings.by_engagement}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">⚡</span>
                {t('top_performing_links.rank_consistency')}
              </span>
              <span className="font-bold text-orange-600">
                #{touchpoint.rankings.by_consistency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">🗺️</span>
                {t('top_performing_links.rank_geographic')}
              </span>
              <span className="font-bold text-indigo-600">
                #{touchpoint.rankings.by_geographic_reach}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
