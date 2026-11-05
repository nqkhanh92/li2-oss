import {
  FreeTierAcquisitionsTrafficSrc,
  PremiumTierAcquisitionsTrafficSrc,
} from './acquisition-traffic.type'
import { AcquisitionsGrowthTrends } from './acquisitions-growth-trends.type'
import { BehaviorUserJourneysResponse } from './behaviors_user_journeys.type'
import {
  CampaignPerformanceFreeTierData,
  CampaignPerformancePremiumTierData,
} from './campaign-performance.type'
import { ChannelAttributionTouchpoint } from './channel-attribution-touchpoint.type'
import { DailyTrend } from './daily-trend.type'
import { DeviceAnalysis } from './device-analytic.type'
import { GeographicDistribution } from './geographic-distribution.type'
import { PeakHeatmap } from './peak-heatmap.type'
import { RealtimeTouchpointResponse } from './real_time_data.type'
import { StatsPanel } from './stats-panel.type'
import { TouchpointReport } from './top-touch-point.type'

export const OverviewAnalytics = {
  'daily-trend': 'get_overview_daily_trend',
  'peak-heatmap': 'get_overview_peak_heatmap',
  'stats-panel': 'get_overview_stats_panel',
  'top-touchpoint': 'get_overview_top_touchpoints',
} as const

export const AudienceAnalytics = {
  'geographic-distribution': 'get_audience_geographic_distribution',
  'device-analysis': 'get_audience_device_analysis',
  // 'behavior-segments': 'get_audience_behavior_segments',
} as const

export const AcquisitionAnalytics = {
  'acquisition-traffic': 'get_acquisition_traffic_sources',
  'acquisitions-campaign-performance': 'get_acquisition_campaign_performance',
  'acquisitions-touchpoint-channel-attribution': 'get_acquisition_touchpoint_attribution',
  'acquisitions-growth-trends': 'get_acquisition_growth_trends',
} as const

export const BehaviorsAnalytics = {
  'behaviors-user-journeys': 'get_behavior_user_journeys',
  'behaviors-temporal-patterns': 'get_behavior_temporal_patterns',
  'behaviors-interaction-frequency': 'get_behavior_interaction_frequency',
} as const

export const AdvancedAnalytics = {
  ...OverviewAnalytics,
  ...AudienceAnalytics,
  ...AcquisitionAnalytics,
  ...BehaviorsAnalytics,
} as const

export const RealtimeAnalytics = {
  'realtime-touchpoint': 'get_realtime_data',
  'realtime-touchpoint-v2': 'get_realtime_data_v2',
  'realtime-touchpoint-v3': 'get_realtime_data_v3',
  'realtime-touchpoint-v4': 'get_realtime_data_v4',
  'realtime-summary': 'get_realtime_summary',
  'realtime-top-links': 'get_realtime_top_links',
} as const

export type RealtimeAnalyticsTypes = keyof typeof RealtimeAnalytics
export type AdvancedAnalyticTypes = keyof typeof AdvancedAnalytics

export type AdvancedAnalyticsParams = {
  p_period_days: number
  p_timezone?: string
  p_tag_ids?: string[]
  p_touchpoint_ids?: string[]
  p_collection_ids?: string[]
  p_include_null_collection?: boolean
  p_is_premium: boolean
  p_organization_id: string
}

export type RealtimeParams = {
  p_last_hours: number
  p_timezone?: string | 'UTC'
  p_is_premium?: boolean | false
  p_organization_id: string
  p_limit?: number
  p_offset?: number
  p_collection_ids?: string[] | null
  p_include_null_collection?: boolean
  p_exclude_bot?: boolean
}

export type AdvancedAnalyticQueryParams = {
  period_days: number
  tag_ids?: string[]
  touchpoint_ids?: string[]
  collection_ids?: string[]
}

export type AdvancedAnalyticReturnTypes<T extends AdvancedAnalyticTypes> = {
  'daily-trend': DailyTrend
  'peak-heatmap': PeakHeatmap
  'stats-panel': StatsPanel
  'top-touchpoint': TouchpointReport
  'geographic-distribution': GeographicDistribution
  // 'behavior-segments': Json;
  'device-analysis': DeviceAnalysis
  'acquisition-traffic': FreeTierAcquisitionsTrafficSrc | PremiumTierAcquisitionsTrafficSrc
  'acquisitions-campaign-performance':
    | CampaignPerformanceFreeTierData
    | CampaignPerformancePremiumTierData
  'acquisitions-touchpoint-channel-attribution': ChannelAttributionTouchpoint
  'acquisitions-growth-trends': AcquisitionsGrowthTrends
  'behaviors-user-journeys': BehaviorUserJourneysResponse
  'behaviors-temporal-patterns': BehaviorTemporalPatternsResponse
  'behaviors-interaction-frequency': BehaviorInteractionFrequencyResponse
}[T]

export type RealtimeSummaryData = {
  active_visitors_5min: number
  clicks_1hr: number
  clicks_24hr: number
  clicks_prev_24hr: number
  top_channel: string | null
}

export type RealtimeTopLinkData = {
  touchpoint_id: string
  touchpoint_name: string
  short_url: string
  click_count: number
  qr_count: number
  link_count: number
  nfc_count: number
}

export type RealtimeAnalyticsReturnTypes<T extends RealtimeAnalyticsTypes> = {
  'realtime-touchpoint': RealtimeTouchpointResponse
  'realtime-touchpoint-v2': RealtimeTouchpointResponse
  'realtime-touchpoint-v3': RealtimeTouchpointResponse
  'realtime-touchpoint-v4': RealtimeTouchpointResponse
  'realtime-summary': RealtimeSummaryData[]
  'realtime-top-links': RealtimeTopLinkData[]
}[T]

export type AnalyticByDestinationType = {
  analytics: {
    destination: string
    total_visits: number
    unique_visits: number
    segment_type: 'targeting' | 'default'
  }[]
  destinations: {
    changed_at: string
    destination: string
    segment_type: 'targeting' | 'default'
    type: 'current' | 'logs'
  }[]
}
