// Data schema
// interface BehaviorInteractionFrequencyResponse {
//  period_info: {
//    period_days: number;
//    start_date: string; // ISO timestamp
//    end_date: string; // ISO timestamp
//    timezone: string;
//    is_premium: boolean;
//    analysis_type: "interaction_frequency";
//  };
 
//  filters_applied: {
//    has_filters: boolean;
//    tags_count: number;
//    touchpoints_count: number;
//  };
 
//  frequency_analysis: {
//    daily_patterns: DailyPattern[];
//    hourly_patterns: HourlyPattern[];
//    day_of_week_patterns: DayOfWeekPattern[];
//    user_frequency_distribution: UserFrequencyDistribution[] | null; // Premium only
//  };
 
//  insights: {
//    peak_periods: PeakPeriods;
//    user_behavior_summary: UserBehaviorSummary;
//    recommendations: Recommendation[];
//  };
// }

// interface DailyPattern {
//  date: string; // YYYY-MM-DD
//  total_interactions: number;
//  unique_users: number;
//  interactions_per_user: number; // Rounded to 2 decimals
//  active_touchpoints: number;
//  peak_hour: number; // 0-23
//  interaction_breakdown: {
//    link_interactions: number;
//    qr_interactions: number;
//    nfc_interactions: number;
//    wifi_interactions: number;
//  };
//  platform_breakdown: {
//    mobile_interactions: number;
//    desktop_interactions: number;
//  };
// }

// interface HourlyPattern {
//  hour: number; // 0-23
//  total_interactions: number;
//  unique_users: number;
//  avg_interactions_per_day: number; // Rounded to 1 decimal
//  avg_users_per_day: number; // Rounded to 1 decimal
//  active_days: number;
// }

// interface DayOfWeekPattern {
//  day_of_week: number; // 0-6 (0=Sunday)
//  day_name: "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
//  total_interactions: number;
//  unique_users: number;
//  avg_interactions_per_occurrence: number; // Rounded to 1 decimal
//  avg_users_per_occurrence: number; // Rounded to 1 decimal
//  occurrences: number;
// }

// interface UserFrequencyDistribution {
//  frequency_segment: "one_time" | "occasional" | "regular" | "frequent";
//  consistency_segment: "single_day" | "highly_consistent" | "moderately_consistent" | "sporadic";
//  user_count: number;
//  avg_interactions: number; // Rounded to 2 decimals
//  avg_active_days: number; // Rounded to 2 decimals
//  avg_interactions_per_day: number; // Rounded to 2 decimals
// }

// interface PeakPeriods {
//  peak_day: {
//    day: string; // Day name
//    interactions: number;
//  };
//  peak_hour: {
//    hour: number; // 0-23
//    interactions: number;
//  };
//  lowest_activity: {
//    day: string; // Day name
//    hour: number; // 0-23
//  };
// }

// interface UserBehaviorSummary {
//  total_users: number;
//  total_interactions: number;
//  active_days: number;
//  avg_interactions_per_user: number; // Rounded to 2 decimals
//  avg_interactions_per_day: number; // Rounded to 1 decimal
//  frequency_distribution: {
//    one_time_users: number;
//    occasional_users: number;
//    regular_users: number;
//    frequent_users: number;
//  };
//  consistency_distribution: {
//    highly_consistent: number;
//    moderately_consistent: number;
//    sporadic: number;
//  } | null; // Premium only
// }

// interface Recommendation {
//  recommendation_type: "high_one_time_users" | "strong_frequent_users" | "business_hours_peak" | "evening_peak" | "high_sporadic_usage" | "low_engagement_consistency";
//  priority: "high" | "medium" | "low";
//  category: "retention" | "loyalty" | "timing_optimization" | "engagement_consistency" | "user_experience";
//  metric_key: "one_time_user_rate" | "frequent_user_rate" | "peak_hour" | "sporadic_user_rate" | "consistent_user_rate";
//  threshold: number | null;
//  current_value: number | null;
//  improvement_potential: "implement_follow_up_campaigns" | "implement_loyalty_programs" | "optimize_for_professional_use" | "focus_on_leisure_marketing" | "improve_content_scheduling" | "enhance_user_experience";
// }

export const behaviorsInteractionFrequencyFreeTier : BehaviorInteractionFrequencyResponse = {
  "period_info": {
    "period_days": 7,
    "start_date": "2025-08-06T10:53:37.582304+00:00",
    "end_date": "2025-08-13T10:53:37.582304+00:00",
    "timezone": "Asia/Ho_Chi_Minh",
    "is_premium": false,
    "analysis_type": "interaction_frequency"
  },
  "filters_applied": {
    "has_filters": false,
    "tags_count": 0,
    "touchpoints_count": 0
  },
  "frequency_analysis": {
    "daily_patterns": [
      {
        "date": "2025-08-06",
        "total_interactions": 3,
        "unique_users": 3,
        "interactions_per_user": 1,
        "active_touchpoints": 3,
        "peak_hour": 19,
        "interaction_breakdown": {
          "link_interactions": 3,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 3,
          "desktop_interactions": 0
        }
      },
      {
        "date": "2025-08-07",
        "total_interactions": 19,
        "unique_users": 15,
        "interactions_per_user": 1.27,
        "active_touchpoints": 5,
        "peak_hour": 18,
        "interaction_breakdown": {
          "link_interactions": 19,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 6,
          "desktop_interactions": 13
        }
      },
      {
        "date": "2025-08-08",
        "total_interactions": 18,
        "unique_users": 14,
        "interactions_per_user": 1.29,
        "active_touchpoints": 5,
        "peak_hour": 4,
        "interaction_breakdown": {
          "link_interactions": 18,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 6,
          "desktop_interactions": 12
        }
      },
      {
        "date": "2025-08-09",
        "total_interactions": 1,
        "unique_users": 1,
        "interactions_per_user": 1,
        "active_touchpoints": 1,
        "peak_hour": 12,
        "interaction_breakdown": {
          "link_interactions": 1,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 0,
          "desktop_interactions": 1
        }
      },
      {
        "date": "2025-08-11",
        "total_interactions": 16,
        "unique_users": 14,
        "interactions_per_user": 1.14,
        "active_touchpoints": 7,
        "peak_hour": 18,
        "interaction_breakdown": {
          "link_interactions": 16,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 9,
          "desktop_interactions": 7
        }
      },
      {
        "date": "2025-08-12",
        "total_interactions": 41,
        "unique_users": 33,
        "interactions_per_user": 1.24,
        "active_touchpoints": 5,
        "peak_hour": 10,
        "interaction_breakdown": {
          "link_interactions": 41,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 22,
          "desktop_interactions": 19
        }
      },
      {
        "date": "2025-08-13",
        "total_interactions": 4,
        "unique_users": 4,
        "interactions_per_user": 1,
        "active_touchpoints": 2,
        "peak_hour": 10,
        "interaction_breakdown": {
          "link_interactions": 4,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 3,
          "desktop_interactions": 1
        }
      }
    ],
    "hourly_patterns": [
      {
        "hour": 0,
        "total_interactions": 3,
        "unique_users": 2,
        "avg_interactions_per_day": 3,
        "avg_users_per_day": 2,
        "active_days": 1
      },
      {
        "hour": 1,
        "total_interactions": 1,
        "unique_users": 1,
        "avg_interactions_per_day": 1,
        "avg_users_per_day": 1,
        "active_days": 1
      },
      {
        "hour": 3,
        "total_interactions": 1,
        "unique_users": 1,
        "avg_interactions_per_day": 1,
        "avg_users_per_day": 1,
        "active_days": 1
      },
      {
        "hour": 4,
        "total_interactions": 5,
        "unique_users": 4,
        "avg_interactions_per_day": 5,
        "avg_users_per_day": 4,
        "active_days": 1
      },
      {
        "hour": 5,
        "total_interactions": 3,
        "unique_users": 3,
        "avg_interactions_per_day": 1,
        "avg_users_per_day": 1,
        "active_days": 3
      },
      {
        "hour": 7,
        "total_interactions": 2,
        "unique_users": 2,
        "avg_interactions_per_day": 2,
        "avg_users_per_day": 2,
        "active_days": 1
      },
      {
        "hour": 9,
        "total_interactions": 2,
        "unique_users": 2,
        "avg_interactions_per_day": 1,
        "avg_users_per_day": 1,
        "active_days": 2
      },
      {
        "hour": 10,
        "total_interactions": 22,
        "unique_users": 21,
        "avg_interactions_per_day": 7.3,
        "avg_users_per_day": 7,
        "active_days": 3
      },
      {
        "hour": 11,
        "total_interactions": 10,
        "unique_users": 9,
        "avg_interactions_per_day": 3.3,
        "avg_users_per_day": 3,
        "active_days": 3
      },
      {
        "hour": 12,
        "total_interactions": 2,
        "unique_users": 2,
        "avg_interactions_per_day": 1,
        "avg_users_per_day": 1,
        "active_days": 2
      },
      {
        "hour": 13,
        "total_interactions": 3,
        "unique_users": 3,
        "avg_interactions_per_day": 1.5,
        "avg_users_per_day": 1.5,
        "active_days": 2
      },
      {
        "hour": 14,
        "total_interactions": 8,
        "unique_users": 6,
        "avg_interactions_per_day": 2.7,
        "avg_users_per_day": 2,
        "active_days": 3
      },
      {
        "hour": 15,
        "total_interactions": 3,
        "unique_users": 2,
        "avg_interactions_per_day": 1.5,
        "avg_users_per_day": 1,
        "active_days": 2
      },
      {
        "hour": 16,
        "total_interactions": 4,
        "unique_users": 4,
        "avg_interactions_per_day": 1,
        "avg_users_per_day": 1,
        "active_days": 4
      },
      {
        "hour": 17,
        "total_interactions": 6,
        "unique_users": 5,
        "avg_interactions_per_day": 3,
        "avg_users_per_day": 2.5,
        "active_days": 2
      },
      {
        "hour": 18,
        "total_interactions": 11,
        "unique_users": 9,
        "avg_interactions_per_day": 3.7,
        "avg_users_per_day": 3,
        "active_days": 3
      },
      {
        "hour": 19,
        "total_interactions": 3,
        "unique_users": 3,
        "avg_interactions_per_day": 1,
        "avg_users_per_day": 1,
        "active_days": 3
      },
      {
        "hour": 20,
        "total_interactions": 4,
        "unique_users": 4,
        "avg_interactions_per_day": 4,
        "avg_users_per_day": 4,
        "active_days": 1
      },
      {
        "hour": 22,
        "total_interactions": 3,
        "unique_users": 3,
        "avg_interactions_per_day": 1,
        "avg_users_per_day": 1,
        "active_days": 3
      },
      {
        "hour": 23,
        "total_interactions": 6,
        "unique_users": 6,
        "avg_interactions_per_day": 3,
        "avg_users_per_day": 3,
        "active_days": 2
      }
    ],
    "day_of_week_patterns": [
      {
        "day_of_week": 1,
        "day_name": "Monday",
        "total_interactions": 16,
        "unique_users": 14,
        "avg_interactions_per_occurrence": 16,
        "avg_users_per_occurrence": 14,
        "occurrences": 1
      },
      {
        "day_of_week": 2,
        "day_name": "Tuesday",
        "total_interactions": 41,
        "unique_users": 33,
        "avg_interactions_per_occurrence": 41,
        "avg_users_per_occurrence": 33,
        "occurrences": 1
      },
      {
        "day_of_week": 3,
        "day_name": "Wednesday",
        "total_interactions": 7,
        "unique_users": 7,
        "avg_interactions_per_occurrence": 3.5,
        "avg_users_per_occurrence": 3.5,
        "occurrences": 2
      },
      {
        "day_of_week": 4,
        "day_name": "Thursday",
        "total_interactions": 19,
        "unique_users": 15,
        "avg_interactions_per_occurrence": 19,
        "avg_users_per_occurrence": 15,
        "occurrences": 1
      },
      {
        "day_of_week": 5,
        "day_name": "Friday",
        "total_interactions": 18,
        "unique_users": 14,
        "avg_interactions_per_occurrence": 18,
        "avg_users_per_occurrence": 14,
        "occurrences": 1
      },
      {
        "day_of_week": 6,
        "day_name": "Saturday",
        "total_interactions": 1,
        "unique_users": 1,
        "avg_interactions_per_occurrence": 1,
        "avg_users_per_occurrence": 1,
        "occurrences": 1
      }
    ],
    "user_frequency_distribution": null
  },
  "insights": {
    "peak_periods": {
      "peak_day": {
        "day": "Tuesday",
        "interactions": 41
      },
      "peak_hour": {
        "hour": 10,
        "interactions": 22
      },
      "lowest_activity": {
        "day": "Saturday",
        "hour": 1
      }
    },
    "user_behavior_summary": {
      "total_users": 73,
      "total_interactions": 102,
      "active_days": 7,
      "avg_interactions_per_user": 1.4,
      "avg_interactions_per_day": 14.6,
      "frequency_distribution": {
        "one_time_users": 56,
        "occasional_users": 17,
        "regular_users": 0,
        "frequent_users": 0
      },
      "consistency_distribution": null
    },
    "recommendations": null
  }
}