import { PlatformDistribution } from './acquisition-traffic.type';

export interface CampaignPerformanceFreeTierData {
  period_info: PeriodInfo;
  filters_applied: FiltersApplied;
  campaign_performance: CampaignPerformanceFreeTier;
  insights: Insights;
}

export interface CampaignPerformancePremiumTierData {
  period_info: PeriodInfo;
  filters_applied: FiltersApplied;
  campaign_performance: CampaignPerformancePremiumTier;
  insights: Insights;
}

export interface SourceMediumCombo {
  source_medium_combo: string;
  utm_source: string;
  utm_medium: string;
  combo_rank: number;
  campaigns_count: number;
  total_visits: number;
  total_unique_users: number;
  total_touchpoints_used: number;
  avg_engagement: number;
  combo_share_pct: number;
}

export interface CampaignPerformancePremiumTier {
  campaigns: Campaign[];
  source_medium_combinations: SourceMediumCombo[] | null;
  summary: Summary;
}

export interface CampaignPerformanceFreeTier {
  campaigns: Campaign[];
  source_medium_combinations: SourceMediumCombo[] | null;
  summary: Summary;
}

export interface PeriodInfo {
  period_days: number;
  start_date: string;
  end_date: string;
  timezone: string;
  is_premium: boolean;
  data_requirement: string;
}

export interface FiltersApplied {
  has_filters: boolean;
  tags_count: number;
  touchpoints_count: number;
}

export interface CampaignPerformance {
  campaigns: Campaign[];
  source_medium_combinations: SourceMediumCombo[];
  summary: Summary;
}

export interface TimePatterns {
  weekday_visits: number;
  weekend_visits: number;
  business_hours_visits: number;
  weekend_pct: number;
  business_hours_pct: number;
}

export interface InteractionBreakdown {
  link_interactions: number;
  qr_interactions: number;
  nfc_interactions: number;
  wifi_interactions: number;
}

export interface PerformanceBreakdown {
  engagement_score: number;
  volume_score: number;
  reach_score: number;
  consistency_score: number;
  touchpoint_diversity_score: number;
}

export interface CommonCampaign {
    utm_campaign: string;
    utm_source: string;
    utm_medium: string;
    touchpoints_in_campaign: number;
    volume_rank: number;
    total_visits: number ;
    unique_users: number;
    campaign_share_pct: number;
    visits_per_user: number;
}
export interface Campaign extends CommonCampaign {
  touchpoint_names?: string[];
  engagement_rank?: number;
  performance_rank?: number;
  performance_score?: number;
  performance_tier?: string;
  repeat_user_rate?: number;
  countries_reached?: number;
  active_days?: number;
  campaign_duration_hours?: number;
  platform_distribution?: PlatformDistribution;
  time_patterns?: TimePatterns;
  interaction_breakdown?: InteractionBreakdown;
  performance_breakdown?: PerformanceBreakdown;
}

export interface Summary {
  total_campaigns: number;
  total_sources: number;
  total_mediums: number;
  total_touchpoints_with_utm: number;
  campaigns_shown: number;
  total_campaign_visits: number;
  total_campaign_users: number;
  avg_campaign_engagement: number;
  avg_performance_score: any;
  data_completeness: string;
}

export interface Insights {
  top_campaign: TopCampaign;
  utm_setup_status: UtmSetupStatus;
  premium_insights: any;
}

export interface TopCampaign {
  utm_campaign: string;
  utm_source: string;
  utm_medium: string;
  visits: number;
  touchpoints_used: number;
  market_share_pct: number;
  engagement_rate: number;
}

export interface UtmSetupStatus {
  total_touchpoints_analyzed: number;
  message: string;
}
