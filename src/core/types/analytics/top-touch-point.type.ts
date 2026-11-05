// types/top-touch-point.types.ts

export interface PeriodInfo {
  period_days: number;
  start_date: string;
  end_date: string;
  timezone: string;
  is_premium: boolean;
}

export interface FiltersApplied {
  has_filters: boolean;
  tags_count: number;
  touchpoints_count: number;
  total_touchpoints_in_filter: number;
  active_touchpoints_in_period: number;
}

export interface TopPerformer {
  name: string;
  performance_score: number;
  performance_tier:
    | "top_performer"
    | "good_performer"
    | "average_performer"
    | "underperformer"
    | "poor_performer";
  total_interactions: number;
}

export interface PerformanceDistribution {
  top_performers: number;
  good_performers: number;
  average_performers: number;
  underperformers: number;
  poor_performers: number;
}

export interface CoreMetrics {
  total?: number;
  unique_users?: number;
  link_clicks?: number;
  qr_scans?: number;
  nfc_taps?: number;
  wifi_accesses?: number;
  total_interactions?: number;
  interactions_per_user: number | null | undefined;
  active_days?: number;
  volume_share_pct?: number;
  user_share_pct?: number;
}

export interface AudienceInsights {
  countries_reached: number;
  cities_reached: number;
  mobile_usage_pct: number;
  weekend_usage_pct: number;
  direct_traffic_pct: number;
  peak_hour: number | null;
}

export interface InteractionBreakdown {
  link_clicks: number;
  qr_scans: number;
  nfc_taps: number;
  wifi_accesses: number;
}

export interface Rankings {
  by_volume: number;
  by_reach: number;
  by_engagement: number;
  by_consistency: number;
  by_geographic_reach: number;
}

export interface TopTouchpoint {
  rank: number;
  touchpoint_id: string;
  name: string;
  performance_score: number;
  slug?: string | null;
  performance_tier:
    | "top_performer"
    | "good_performer"
    | "average_performer"
    | "underperformer"
    | "poor_performer";
  engagement_quality: string;
  associated_tags: { id: string; name: string }[] | null;
  core_metrics: CoreMetrics;
  interaction_breakdown: InteractionBreakdown;
  rankings: Rankings;
  audience_insights: AudienceInsights;
}

export interface ISummary {
  total_touchpoints_analyzed: number;
  active_touchpoints_count: number;
  total_interactions_all: number;
  avg_performance_score: number;
  avg_engagement_rate: number;
  performance_distribution: PerformanceDistribution;
  top_performer: TopPerformer;
}

export interface TouchpointReport {
  period_info: PeriodInfo;
  filters_applied: FiltersApplied;
  summary: ISummary;
  top_touchpoints: TopTouchpoint[];
}
