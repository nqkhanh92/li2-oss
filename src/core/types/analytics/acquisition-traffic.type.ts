export type SourceCategory = 'direct' | 'social' | 'search' | 'email' | 'referral' | 'paid' | 'organic';

export interface FreeTierAcquisitionsTrafficSrc {
  period_info: PeriodInfo;
  filters_applied: FiltersApplied;
  traffic_sources: FreeTierTrafficSources;
  insights: Insights;
}

export interface PremiumTierAcquisitionsTrafficSrc {
  period_info: PeriodInfo;
  filters_applied: FiltersApplied;
  traffic_sources: PremiumTierTrafficSources;
  insights: Insights;
}

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
}

export interface FreeTierTrafficSources {
  sources: FreeTierSource[];
  summary: Summary;
}

export interface PremiumTierTrafficSources {
  sources: PremiumTierSource[];
  summary: Summary;
}


export interface PlatformDistribution {
  mobile_visits: number;
  desktop_visits: number;
  mobile_pct: number;
}

export interface InteractionBreakdown {
  link_interactions: number;
  qr_interactions: number;
  nfc_interactions: number;
  wifi_interactions: number;
}

export interface FreeTierQualityBreakdown {
  quality_score: number;
  quality_tier: string;
}

export interface PremiumTierQualityBreakdown {
  engagement_score: number
  volume_score: number
  reach_score: number
  consistency_score: number
  diversity_score: number
}

export interface FreeTierSource {
  source_category: string;
  volume_rank: number;
  total_visits: number;
  unique_users: number;
  source_share_pct: number;
  visits_per_user: number;
  quality_tier?: string;
  original_referrer?: string;
}

export interface PremiumTierSource {
  source_category: string;
  original_referrer: string;
  volume_rank: number;
  engagement_rank: number;
  quality_rank: number;
  quality_score: number;
  quality_tier: string;
  total_visits: number;
  unique_users: number;
  source_share_pct: number;
  visits_per_user: number;
  repeat_user_rate: number;
  touchpoints_accessed: number;
  countries_reached: number;
  active_days: number;
  platform_distribution: PlatformDistribution;
  interaction_breakdown: InteractionBreakdown;
  quality_breakdown: PremiumTierQualityBreakdown;
}

export interface Summary {
  total_source_categories: number;
  total_sources: number;
  sources_shown: number;
  total_visits: number;
  total_unique_users: number;
  avg_engagement_rate: number;
  avg_quality_score: any;
}

export interface Insights {
  top_source: TopSource;
  source_diversity: string;
  premium_insights: any;
}

export interface TopSource {
  source_category: string;
  visits: number;
  market_share_pct: number;
  engagement_rate: number;
}
