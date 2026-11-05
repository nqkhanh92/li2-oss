export type BehaviorUserJourneysResponse = {
  period_info: {
    period_days: number
    start_date: string // ISO timestamp
    end_date: string // ISO timestamp
    timezone: string
    is_premium: boolean
    analysis_type: 'user_journeys'
  }

  filters_applied: {
    has_filters: boolean
    tags_count: number
    touchpoints_count: number
  }

  journey_analysis: {
    journey_patterns: JourneyPattern[]
    entry_exit_analysis: EntryExitAnalysis[]
    touchpoint_transitions: TouchpointTransition[] | null // Premium only
  }

  insights: {
    journey_summary?: JourneySummary | null
    recommendations?: Recommendation[] | null // Premium only
  }
}

type JourneyPattern = {
  complexity: 'single_touchpoint' | 'two_touchpoint' | 'multi_touchpoint'
  interaction_diversity: 'single_method' | 'multi_method'
  users_count: number
  pattern_percentage: number // Rounded to 1 decimal
  avg_interactions_per_journey: number // Rounded to 2 decimals
  avg_touchpoints_per_journey: number // Rounded to 2 decimals
  avg_journey_duration_minutes: number // Rounded to 1 decimal
  avg_active_days: number // Rounded to 2 decimals
}

type EntryExitAnalysis = {
  role: 'entry' | 'exit'
  touchpoint_name: string
  interaction_type: 'LINK' | 'QR' | 'NFC' | 'WIFI'
  users_count: number
  avg_interactions: number // Rounded to 2 decimals
  avg_journey_duration: number // Rounded to 1 decimal
  effectiveness_metric: number // Rounded to 1 decimal (percentage)
}

type TouchpointTransition = {
  from_touchpoint: string
  to_touchpoint: string
  from_interaction_type: 'LINK' | 'QR' | 'NFC' | 'WIFI'
  to_interaction_type: 'LINK' | 'QR' | 'NFC' | 'WIFI'
  transition_count: number
  unique_users: number
  avg_time_between_minutes: number // Rounded to 1 decimal
  flow_strength: 'strong' | 'moderate' | 'weak'
}

type JourneySummary = {
  total_users: number
  avg_interactions_per_user: number // Rounded to 2 decimals
  avg_journey_duration_minutes: number // Rounded to 1 decimal
  median_journey_duration_minutes: number
  avg_touchpoints_per_user: number // Rounded to 2 decimals
  longest_journey_minutes: number
  journeys_over_1_hour: number
  complexity_distribution: {
    single_touchpoint_percentage: number // Rounded to 1 decimal
    two_touchpoint_percentage: number // Rounded to 1 decimal
    multi_touchpoint_percentage: number // Rounded to 1 decimal
  }
  interaction_diversity: {
    multi_method_percentage: number // Rounded to 1 decimal
  }
}

type Recommendation = {
  recommendation_type:
    | 'high_single_touchpoint_rate'
    | 'low_multi_touchpoint_engagement'
    | 'short_journey_duration'
    | 'limited_interaction_diversity'
  priority: 'high' | 'medium' | 'low'
  category:
    | 'journey_optimization'
    | 'engagement_depth'
    | 'user_engagement'
    | 'interaction_optimization'
  metric_key:
    | 'single_touchpoint_percentage'
    | 'multi_touchpoint_percentage'
    | 'avg_journey_duration_minutes'
    | 'multi_method_percentage'
  threshold: number
  current_value: number
  improvement_potential:
    | 'create_touchpoint_connections'
    | 'improve_cross_touchpoint_flows'
    | 'increase_engagement_depth'
    | 'diversify_interaction_types'
}
