interface BehaviorInteractionFrequencyResponse {
  period_info: {
    period_days: number
    start_date: string // ISO timestamp
    end_date: string // ISO timestamp
    timezone: string
    is_premium: boolean
    analysis_type: 'interaction_frequency'
  }

  filters_applied: {
    has_filters: boolean
    tags_count: number
    touchpoints_count: number
  }

  frequency_analysis: {
    daily_patterns: Temporal[]
    hourly_patterns: TemporalHourlyPattern[]
    day_of_week_patterns: DayOfWeekPattern[]
    user_frequency_distribution: UserFrequencyDistribution[] | null // Premium only
  }

  insights: {
    peak_periods?: PeakPeriods | null
    user_behavior_summary?: UserBehaviorSummary | null
    recommendations?: Recommendation[] | null
  }
}

interface Temporal {
  date: string // YYYY-MM-DD
  total_interactions: number
  unique_users: number
  interactions_per_user: number // Rounded to 2 decimals
  active_touchpoints: number
  peak_hour: number // 0-23
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

interface TemporalHourlyPattern {
  hour: number // 0-23
  total_interactions: number
  unique_users: number
  avg_interactions_per_day: number // Rounded to 1 decimal
  avg_users_per_day: number // Rounded to 1 decimal
  active_days: number
}

interface DayOfWeekPattern {
  day_of_week: number // 0-6 (0=Sunday)
  day_name: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
  total_interactions: number
  unique_users: number
  avg_interactions_per_occurrence: number // Rounded to 1 decimal
  avg_users_per_occurrence: number // Rounded to 1 decimal
  occurrences: number
}

interface UserFrequencyDistribution {
  frequency_segment: 'one_time' | 'occasional' | 'regular' | 'frequent'
  consistency_segment: 'single_day' | 'highly_consistent' | 'moderately_consistent' | 'sporadic'
  user_count: number
  avg_interactions: number // Rounded to 2 decimals
  avg_active_days: number // Rounded to 2 decimals
  avg_interactions_per_day: number // Rounded to 2 decimals
}

interface PeakPeriods {
  peak_day: {
    day: string // Day name
    interactions: number
  }
  peak_hour: {
    hour: number // 0-23
    interactions: number
  }
  lowest_activity: {
    day: string // Day name
    hour: number // 0-23
  }
}

interface UserBehaviorSummary {
  total_users: number
  total_interactions: number
  active_days: number
  avg_interactions_per_user: number // Rounded to 2 decimals
  avg_interactions_per_day: number // Rounded to 1 decimal
  frequency_distribution: {
    one_time_users: number
    occasional_users: number
    regular_users: number
    frequent_users: number
  }
  consistency_distribution: {
    highly_consistent: number
    moderately_consistent: number
    sporadic: number
  } | null // Premium only
}

interface Recommendation {
  recommendation_type:
    | 'high_one_time_users'
    | 'strong_frequent_users'
    | 'business_hours_peak'
    | 'evening_peak'
    | 'high_sporadic_usage'
    | 'low_engagement_consistency'
  priority: 'high' | 'medium' | 'low'
  category:
    | 'retention'
    | 'loyalty'
    | 'timing_optimization'
    | 'engagement_consistency'
    | 'user_experience'
  metric_key:
    | 'one_time_user_rate'
    | 'frequent_user_rate'
    | 'peak_hour'
    | 'sporadic_user_rate'
    | 'consistent_user_rate'
  threshold: number | null
  current_value: number | null
  improvement_potential:
    | 'implement_follow_up_campaigns'
    | 'implement_loyalty_programs'
    | 'optimize_for_professional_use'
    | 'focus_on_leisure_marketing'
    | 'improve_content_scheduling'
    | 'enhance_user_experience'
}
