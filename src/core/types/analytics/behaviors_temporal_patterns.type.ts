interface BehaviorTemporalPatternsResponse {
  period_info: {
    period_days: number
    start_date: string // ISO timestamp
    end_date: string // ISO timestamp
    timezone: string
    is_premium: boolean
    analysis_type: 'temporal_patterns'
  }

  filters_applied: {
    has_filters: boolean
    tags_count: number
    touchpoints_count: number
  }

  temporal_analysis: {
    hourly_patterns: HourlyPattern[]
    daily_patterns: TemporalDailyPattern[]
    weekly_trends: WeeklyTrend[] | null // Premium only
    touchpoint_temporal_patterns: TouchpointTemporalPattern[] | null // Premium only
  }

  insights: {
    peak_activity?: PeakActivity | null
    temporal_summary?: TemporalSummary | null
    recommendations?: TemporalRecommendation[] | null
  }
}

interface HourlyPattern {
  hour: number // 0-23
  total_interactions: number
  unique_users: number
  interactions_per_user: number // Rounded to 2 decimals
  avg_interactions_per_day: number // Rounded to 1 decimal
  active_touchpoints: number
  interaction_breakdown: {
    link_interactions: number
    qr_interactions: number
    nfc_interactions: number
    wifi_interactions: number
  }
  platform_breakdown: {
    mobile_interactions: number
    desktop_interactions: number
  }
}

interface TemporalDailyPattern {
  day_of_week: number // 0-6 (0=Sunday)
  day_name: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
  total_interactions: number
  unique_users: number
  interactions_per_user: number // Rounded to 2 decimals
  avg_interactions_per_occurrence: number // Rounded to 1 decimal
  occurrences: number
  active_touchpoints: number
  interaction_breakdown: {
    link_interactions: number
    qr_interactions: number
    nfc_interactions: number
    wifi_interactions: number
  }
}

interface WeeklyTrend {
  week_number: number
  total_interactions: number
  unique_users: number
  interactions_per_user: number // Rounded to 2 decimals
  avg_interactions_per_day: number // Rounded to 1 decimal
  active_touchpoints: number
  active_days: number
}

interface TouchpointTemporalPattern {
  touchpoint_name: string
  peak_hour: number // 0-23
  peak_day_of_week: number // 0-6
  total_interactions: number
  unique_users: number
  avg_daily_interactions: number // Rounded to 1 decimal
  activity_spread: 'all_day' | 'extended_hours' | 'moderate_hours' | 'limited_hours'
  weekly_consistency: 'all_week' | 'most_days' | 'some_days' | 'few_days'
  hours_active: number
  days_of_week_active: number
}

interface PeakActivity {
  peak_periods: {
    peak_hour: {
      hour: number
      interactions: number
    }
    peak_day: {
      day: string // Day name
      interactions: number
    }
  }
  low_activity_periods: {
    lowest_hour: {
      hour: number
      interactions: number
    }
    lowest_day: {
      day: string // Day name
      interactions: number
    }
  }
  activity_concentration: {
    above_avg_hours: number
    above_avg_days: number
    concentration_score: number // Rounded to 1 decimal (percentage)
  }
}

interface TemporalSummary {
  total_users: number
  total_interactions: number
  total_active_days: number
  avg_interaction_hour: number // Rounded to 1 decimal
  most_common_hour: number // 0-23
  most_common_day: number // 0-6
  unique_hours_active: number
  unique_days_active: number
  activity_pattern: 'morning_peak' | 'business_hours' | 'evening_peak' | 'late_night' | 'varied'
  weekly_pattern: 'weekday_focused' | 'weekend_focused' | 'balanced'
  temporal_diversity: {
    hour_spread_percentage: number // Rounded to 1 decimal
    day_spread_percentage: number // Rounded to 1 decimal
  }
}

interface TemporalRecommendation {
  recommendation_type:
    | 'optimize_peak_hours'
    | 'leverage_peak_day'
    | 'improve_low_activity_periods'
    | 'expand_temporal_reach'
  priority: 'high' | 'medium' | 'low'
  category:
    | 'timing_optimization'
    | 'weekly_optimization'
    | 'coverage_optimization'
    | 'reach_optimization'
  metric_key: 'peak_hour' | 'peak_day' | 'activity_concentration' | 'temporal_diversity'
  threshold: string | null
  current_value: string | null
  improvement_potential:
    | 'schedule_campaigns_during_peak'
    | 'focus_weekly_campaigns'
    | 'increase_off_peak_engagement'
    | 'diversify_interaction_times'
}
