export interface ChannelAttributionTouchpoint {
  period_info: PeriodInfo
  filters_applied: FiltersApplied
  touchpoint_attribution: TouchpointAttribution
  insights: Insights
}

export interface PeriodInfo {
  period_days: number
  start_date: string
  end_date: string
  timezone: string
  is_premium: boolean
  analysis_type: string
}

export interface FiltersApplied {
  has_filters: boolean
  tags_count: number
  touchpoints_count: number
}

export interface ChanneltSequence {
  touchpoint_path: string
  channel_path: string
  journey_complexity: string
  users_count: number
  path_share_pct: number
  avg_interactions: number
  avg_duration_hours: number
}

export interface TouchpointChannelCombinations {
  tp_id: string
  touchpoint_name: string
  interaction_channel: string
  discovery_channel: string
  total_users: number
  total_interactions: number
  avg_engagement: number
  combination_share_pct: number
}

export interface TouchpointAttribution {
  first_touch_attribution: FirstTouchAttribution[]
  last_touch_attribution: LastTouchAttribution[]
  channel_performance?: ChannelPerformance[] | null
  touchpoint_channel_combinations?: TouchpointChannelCombinations[] | null
  channel_sequences?: ChanneltSequence[] | null
  summary: Summary
}

export interface LastTouchAttribution {
  tp_id: string
  touchpoint_name: string
  interaction_channel: string
  discovery_channel: string
  attributed_users: number
  total_attributed_interactions: number
  avg_interactions_per_user: number
  user_share_pct: number
  single_touchpoint_users: number
  multi_touchpoint_users: number
  avg_journey_duration_hours?: number
}

export interface FirstTouchAttribution {
  tp_id: string
  touchpoint_name: string
  interaction_channel: string
  discovery_channel: string
  attributed_users: number
  total_attributed_interactions: number
  avg_interactions_per_user: number
  user_share_pct: number
  single_touchpoint_users: number
  multi_touchpoint_users: number
  avg_journey_duration_hours?: number
}

export interface ChannelPerformance {
  interaction_channel: string
  unique_touchpoints_using_channel: number
  total_attributed_users: number
  total_interactions: number
  avg_engagement: number
  channel_market_share_pct: number
  avg_journey_duration: number
}

export interface Summary {
  total_users_analyzed: number
  avg_interactions_per_user: number
  avg_channels_per_user: number
  avg_journey_duration_hours: number
  multi_touch_rate_pct: number
  unique_first_touchpoints: number
  unique_last_touchpoints: number
  unique_first_channels: number
  unique_last_channels: number
  journey_distribution: JourneyDistribution
  attribution_reliability: string
}

export interface JourneyDistribution {
  single_touchpoint: number
  two_touchpoint: number
  multi_touchpoint: number
}

export interface PremiumInsights {
  most_common_touchpoint_journey: MostCommonTouchpointJourney
  best_touchpoint_channel_combination: BestTouchpointChannelCombination
  optimization_opportunities: OptimizationOpportunity[]
}

export interface MostCommonTouchpointJourney {
  touchpoint_path: string
  channel_path: string
  users: number
  share_pct: number
  avg_interactions: number
}

export interface BestTouchpointChannelCombination {
  touchpoint_name: string
  interaction_channel: string
  discovery_channel: string
  total_users: number
  avg_engagement: number
  share_pct: number
}

export interface OptimizationOpportunity {
  opportunity_type: string
  confidence_level: string
  supporting_metrics: SupportingMetrics
}

export interface SupportingMetrics {
  multi_touch_rate_pct: number
  avg_channels_per_user: number
  avg_journey_duration_hours: number
  touchpoint_funnel_efficiency: number
  channel_utilization: number
  sample_size: number
}

export interface Insights {
  dominant_first_touch_touchpoint: DominantFirstTouchTouchpoint
  dominant_last_touch_touchpoint: DominantLastTouchTouchpoint
  best_performing_channel: BestPerformingChannel
  touchpoint_model_comparison: TouchpointModelComparison
  premium_insights: PremiumInsights | null
}

export interface DominantFirstTouchTouchpoint {
  tp_id: string
  touchpoint_name: string
  interaction_channel: string
  users: number
  share_pct: number
}

export interface DominantLastTouchTouchpoint {
  tp_id: string
  touchpoint_name: string
  interaction_channel: string
  users: number
  share_pct: number
}

export interface BestPerformingChannel {
  interaction_channel: string
  market_share_pct: number
  avg_engagement: number
  unique_touchpoints: number
}

export interface TouchpointModelComparison {
  first_vs_last_touchpoint_difference: string
  first_vs_last_channel_difference: string
  multi_touchpoint_significance: string
  touchpoint_diversity: string
  channel_diversity: string
}
