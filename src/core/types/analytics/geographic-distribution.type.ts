export interface GeographicDistribution {
  period_info: PeriodInfo;
  filters_applied: FiltersApplied;
  geographic_data: GeographicData;
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

export interface City {
  country: string;
  city: string;
  city_rank_in_country: number;
  city_rank_global: number;
  total_visits: number;
  unique_users: number;
  visits_per_user: number;
  touchpoints_accessed: number;
  interaction_breakdown: {
    link_clicks: number;
    qr_scans: number;
    nfc_taps: number;
    wifi_accesses: number;
  };
}

export interface GeographicData {
  countries: Country[];
  cities: City[] | null;
  summary: Summary;
}

export interface Country {
  country: string;
  rank: number;
  total_visits: number;
  unique_users: number;
  visits_per_user: number;
  visit_share_pct: number;
  cities_in_country?: number | null;
  touchpoints_accessed?: number | null;
}

export interface Summary {
  total_countries: number;
  total_cities: any;
  countries_shown: number;
  cities_shown: any;
  total_visits: number;
  total_unique_users: number;
  avg_engagement_rate: number;
  geographic_diversity: any;
}

export interface ExpansionOpportunity {
  country: string;
  cities_count: number;
  current_visits: number;
  growth_potential: "medium" | "high" | "low";
}

export interface TopCity {
  city: string;
  country: string;
  visits: number;
  engagement_rate: number;
}

export interface PremiumInsights {
  top_city: TopCity | null;
  expansion_opportunities: ExpansionOpportunity[] | null; 
}

export interface Insights {
  top_market: TopMarket;
  geographic_concentration: string;
  premium_insights: PremiumInsights | null;
}

export interface TopMarket {
  country: string;
  visits: number;
  market_share_pct: number;
  engagement_rate: number;
}
