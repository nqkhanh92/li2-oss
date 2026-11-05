export interface DeviceAnalysis {
  period_info: PeriodInfo
  filters_applied: FiltersApplied
  device_data?: DeviceData | null
  insights?: Insights | null
}

export interface PeriodInfo {
  period_days: number
  start_date: string
  end_date: string
  timezone: string
  is_premium: boolean
}

export interface FiltersApplied {
  has_filters: boolean
  tags_count: number
  touchpoints_count: number
}

export interface UsagePattern {
  weekday_visits?: number | null
  weekend_visits?: number | null
  business_hours_visits?: number | null
  weekend_usage_pct?: number | null
  business_hours_pct?: number | null
}
export interface InteractionBreakdown {
  link_clicks?: number | null
  qr_scans?: number | null
  nfc_taps?: number | null
  wifi_accesses?: number | null
}

export interface DeviceData {
  platforms: Platform[]
  operating_systems: OperatingSystem[]
  summary: Summary
  visits_per_user?: number | null
  touchpoints_accessed?: number | null
  usage_patterns?: UsagePattern | null
  interaction_breakdown?: InteractionBreakdown | null
}

export interface Platform {
  platform: string | null
  total_visits: number | null
  unique_users: number | null
  platform_share_pct: number | null
  visits_per_user?: number | null
  touchpoints_accessed?: number | null
  usage_patterns?: UsagePattern | null
  interaction_breakdown?: InteractionBreakdown | null
}

export interface OperatingSystem {
  platform: string
  os: string
  total_visits: number
  unique_users: number
  os_rank_in_platform?: number | null
  visits_per_user?: number | null
  os_share_in_platform_pct?: number | null
}

export interface Summary {
  total_platforms: number
  total_operating_systems: number
  total_visits: number
  total_unique_users: number
  device_diversity: string
}

export interface EngagementLeader {
  platform: string
  visits_per_user: number
  engagement_advantage: string
}

export interface CrossPlatformUsers {
  count: number
  percentage: number
}

export interface UsageTiming {
  platform: string
  peak_time: string
  business_hours_pct: number
}

export interface PremiumInsights {
  engagement_leader: EngagementLeader
  cross_platform_users: CrossPlatformUsers
  usage_timing: UsageTiming[]
}

export interface PremiumInsights {
  engagement_leader: EngagementLeader
  cross_platform_users: CrossPlatformUsers
  usage_timing: UsageTiming[]
}

export interface Insights {
  dominant_platform: DominantPlatform
  premium_insights?: PremiumInsights | null
}

export interface DominantPlatform {
  platform: string
  visits: number
  market_share_pct: number
  users: number
}
