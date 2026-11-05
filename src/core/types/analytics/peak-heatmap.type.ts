// types/peak-heatmap.types.ts

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
  
  export interface PeakHeatmap {
    period_info: PeriodInfo;
    filters_applied: FiltersApplied;
    heatmap_data: HeatmapDaum[];
    insights: Insights;
    message?: string;
    premium_feature?: boolean;
  }
  
  export interface HeatmapDaum {
    day_of_week: number;
    day_name: string;
    hour_of_day: number;
    interactions: number;
    unique_users: number;
    active_touchpoints: number;
    interactions_per_user: number;
    intensity_score: number;
    activity_level: string;
    time_category: string;
    breakdown: Breakdown;
  }
  
  export interface Breakdown {
    link_clicks: number;
    qr_scans: number;
    nfc_taps: number;
    wifi_accesses: number;
  }
  
  export interface Insights {
    peak_performance: PeakPerformance;
    top_5_time_slots: Top5TimeSlot[];
    activity_summary: ActivitySummary;
    recommendations: Recommendations;
  }
  
  export interface PeakPerformance {
    day_name: string;
    hour: number;
    interactions: number;
    time_category: string;
    unique_users: number;
  }
  
  export interface Top5TimeSlot {
    rank: number;
    day_name: string;
    hour: number;
    interactions: number;
    unique_users: number;
    time_category: string;
  }
  
  export interface ActivitySummary {
    total_time_slots: number;
    active_time_slots: number;
    activity_rate_pct: number;
    avg_interactions_per_slot: number;
    peak_interactions: number;
    business_hours_active: number;
    weekend_active: number;
    evening_active: number;
  }
  
  export interface Recommendations {
    best_posting_times: BestPostingTime[];
    optimization_tip: string;
  }
  
  export interface BestPostingTime {
    day_name: string;
    hour_range: string;
    expected_interactions: number;
    time_category: string;
  }