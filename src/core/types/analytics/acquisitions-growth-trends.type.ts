export interface AcquisitionsGrowthTrends {
  period_info?: PeriodInfo | null;
  filters_applied?: FiltersApplied | null;
  growth_analysis?: GrowthAnalysis | null;
  insights?: Insights | null;
}

export interface PeriodInfo {
  period_days: number;
  start_date: string;
  end_date: string;
  comparison_start_date: string;
  timezone: string;
  is_premium: boolean;
  analysis_type: string;
}

export interface FiltersApplied {
  has_filters: boolean;
  tags_count: number;
  touchpoints_count: number;
}

export interface GrowthAnalysis {
  daily_trends: DailyTrend[];
  source_growth: SourceGrowth[];
  quality_evolution?: QualityEvolution[] | null;
  summary: Summary;
}

export type OpportunityType =
  | 'scale_emerging_channel'
  | 'invest_in_acceleration'
  | 'revive_declining_channel'
  | 'optimize_high_growth_source'
  | 'diversify_traffic_sources'
  | 'improve_user_retention'
  | 'expand_geographic_reach';

interface Opportunity {
  opportunity_type?: OpportunityType;
}

export interface DailyTrend {
  date: string;
  total_visits: number;
  unique_users: number;
  visits_per_user?: number;
  visits_growth_rate?: number | null;
  users_growth_rate?: number | null;
  visits_3day_avg?: number;
  countries_reached?: number;
  channels_active?: number;
  days_count?: number | null;
}

export interface SourceGrowth {
  channel: string;
  current_period_visits: number;
  comparison_period_visits?: number | null;
  visits_growth_rate?: number | null;
  growth_momentum?: string;
  current_period_users?: number | null;
  comparison_period_users?: number | null;
}

export interface QualityEvolution {
  period_type: string;
  avg_visits_per_user: number;
  avg_countries_per_day: number;
  avg_active_channels: number;
  mobile_percentage: number;
  days_analyzed: number;
}

export interface Summary {
  current_total_visits: number;
  comparison_total_visits: number;
  current_total_users: number;
  comparison_total_users: number;
  overall_visits_growth_rate?: number | null;
  growth_volatility?: number | null;
  positive_growth_days?: number | null;
  total_current_days?: number | null;
  growth_consistency?: string;
  trend_direction?: string;
}

export interface Insights {
  growth_performance: GrowthPerformance | null;
  top_growing_source: TopGrowingSource | null;
  fastest_declining_source: FastestDecliningSource | null;
  premium_insights: PremiumInsights | null;
}

export interface GrowthPerformance {
  overall_trend: string | null;
  growth_rate?: number | null;
  growth_consistency?: string | null;
}

export interface TopGrowingSource {
  channel: string;
  growth_rate?: number | null;
  momentum?: string;
  current_visits?: number | null;
}

export interface FastestDecliningSource {
  channel: string;
  decline_rate?: number | null;
  momentum?: string;
  current_visits?: number | null;
}

export interface PremiumInsights {
  growth_opportunities: GrowthOpportunity[];
  quality_insights: QualityInsights;
  growth_forecast: GrowthForecast;
  momentum_analysis: MomentumAnalysis;
}

export interface GrowthOpportunity {
  opportunity_type: string | null;
  target_channel: string;
  current_performance: CurrentPerformance;
  priority: string;
}

export interface CurrentPerformance {
  visits: number | null;
  growth_rate?: number | null;
  momentum: string | null;
}

export interface QualityInsights {
  engagement_trend: string;
  geographic_expansion: string;
  channel_diversification: string;
}

export interface GrowthForecast {
  forecast_method: string;
  confidence_level: string;
  projected_growth_rate: number;
  projected_visits: number;
  forecast_period: string;
  key_assumptions: string[];
}

export interface MomentumAnalysis {
  accelerating_channels: number;
  emerging_channels: number;
  declining_channels: number;
  portfolio_health: string;
}
