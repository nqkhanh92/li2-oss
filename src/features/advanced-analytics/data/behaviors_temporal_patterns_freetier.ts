// data schema
// interface BehaviorTemporalPatternsResponse {
//  period_info: {
//    period_days: number;
//    start_date: string; // ISO timestamp
//    end_date: string; // ISO timestamp
//    timezone: string;
//    is_premium: boolean;
//    analysis_type: "temporal_patterns";
//  };
 
//  filters_applied: {
//    has_filters: boolean;
//    tags_count: number;
//    touchpoints_count: number;
//  };
 
//  temporal_analysis: {
//    hourly_patterns: HourlyPattern[];
//    daily_patterns: DailyPattern[];
//    weekly_trends: WeeklyTrend[] | null; // Premium only
//    touchpoint_temporal_patterns: TouchpointTemporalPattern[] | null; // Premium only
//  };
 
//  insights: {
//    peak_activity: PeakActivity;
//    temporal_summary: TemporalSummary;
//    recommendations: Recommendation[];
//  };
// }

// interface HourlyPattern {
//  hour: number; // 0-23
//  total_interactions: number;
//  unique_users: number;
//  interactions_per_user: number; // Rounded to 2 decimals
//  avg_interactions_per_day: number; // Rounded to 1 decimal
//  active_touchpoints: number;
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

// interface DailyPattern {
//  day_of_week: number; // 0-6 (0=Sunday)
//  day_name: "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
//  total_interactions: number;
//  unique_users: number;
//  interactions_per_user: number; // Rounded to 2 decimals
//  avg_interactions_per_occurrence: number; // Rounded to 1 decimal
//  occurrences: number;
//  active_touchpoints: number;
//  interaction_breakdown: {
//    link_interactions: number;
//    qr_interactions: number;
//    nfc_interactions: number;
//    wifi_interactions: number;
//  };
// }

// interface WeeklyTrend {
//  week_number: number;
//  total_interactions: number;
//  unique_users: number;
//  interactions_per_user: number; // Rounded to 2 decimals
//  avg_interactions_per_day: number; // Rounded to 1 decimal
//  active_touchpoints: number;
//  active_days: number;
// }

// interface TouchpointTemporalPattern {
//  touchpoint_name: string;
//  peak_hour: number; // 0-23
//  peak_day_of_week: number; // 0-6
//  total_interactions: number;
//  unique_users: number;
//  avg_daily_interactions: number; // Rounded to 1 decimal
//  activity_spread: "all_day" | "extended_hours" | "moderate_hours" | "limited_hours";
//  weekly_consistency: "all_week" | "most_days" | "some_days" | "few_days";
//  hours_active: number;
//  days_of_week_active: number;
// }

// interface PeakActivity {
//  peak_periods: {
//    peak_hour: {
//      hour: number;
//      interactions: number;
//    };
//    peak_day: {
//      day: string; // Day name
//      interactions: number;
//    };
//  };
//  low_activity_periods: {
//    lowest_hour: {
//      hour: number;
//      interactions: number;
//    };
//    lowest_day: {
//      day: string; // Day name
//      interactions: number;
//    };
//  };
//  activity_concentration: {
//    above_avg_hours: number;
//    above_avg_days: number;
//    concentration_score: number; // Rounded to 1 decimal (percentage)
//  };
// }

// interface TemporalSummary {
//  total_users: number;
//  total_interactions: number;
//  total_active_days: number;
//  avg_interaction_hour: number; // Rounded to 1 decimal
//  most_common_hour: number; // 0-23
//  most_common_day: number; // 0-6
//  unique_hours_active: number;
//  unique_days_active: number;
//  activity_pattern: "morning_peak" | "business_hours" | "evening_peak" | "late_night" | "varied";
//  weekly_pattern: "weekday_focused" | "weekend_focused" | "balanced";
//  temporal_diversity: {
//    hour_spread_percentage: number; // Rounded to 1 decimal
//    day_spread_percentage: number; // Rounded to 1 decimal
//  };
// }

// interface Recommendation {
//  recommendation_type: "optimize_peak_hours" | "leverage_peak_day" | "improve_low_activity_periods" | "expand_temporal_reach";
//  priority: "high" | "medium" | "low";
//  category: "timing_optimization" | "weekly_optimization" | "coverage_optimization" | "reach_optimization";
//  metric_key: "peak_hour" | "peak_day" | "activity_concentration" | "temporal_diversity";
//  threshold: string | null; // TEXT type from SQL
//  current_value: string | null; // TEXT type from SQL
//  improvement_potential: "schedule_campaigns_during_peak" | "focus_weekly_campaigns" | "increase_off_peak_engagement" | "diversify_interaction_times";
// }

export const behaviorsTemporalPatternsFreeTier: BehaviorTemporalPatternsResponse = {
  "period_info": {
    "period_days": 7,
    "start_date": "2025-08-06T16:14:18.147516+00:00",
    "end_date": "2025-08-13T16:14:18.147516+00:00",
    "timezone": "Asia/Ho_Chi_Minh",
    "is_premium": false,
    "analysis_type": "temporal_patterns"
  },
  "filters_applied": {
    "has_filters": false,
    "tags_count": 0,
    "touchpoints_count": 0
  },
  "temporal_analysis": {
    "hourly_patterns": [
      {
        "hour": 0,
        "total_interactions": 6,
        "unique_users": 2,
        "interactions_per_user": 3,
        "avg_interactions_per_day": 6,
        "active_touchpoints": 1,
        "interaction_breakdown": {
          "link_interactions": 3,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 2
        }
      },
      {
        "hour": 1,
        "total_interactions": 2,
        "unique_users": 1,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2,
        "active_touchpoints": 1,
        "interaction_breakdown": {
          "link_interactions": 1,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 0
        }
      },
      {
        "hour": 3,
        "total_interactions": 2,
        "unique_users": 1,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2,
        "active_touchpoints": 1,
        "interaction_breakdown": {
          "link_interactions": 1,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 0
        }
      },
      {
        "hour": 4,
        "total_interactions": 10,
        "unique_users": 4,
        "interactions_per_user": 2.5,
        "avg_interactions_per_day": 10,
        "active_touchpoints": 2,
        "interaction_breakdown": {
          "link_interactions": 5,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 4
        }
      },
      {
        "hour": 5,
        "total_interactions": 6,
        "unique_users": 3,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2,
        "active_touchpoints": 3,
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
        "hour": 7,
        "total_interactions": 4,
        "unique_users": 2,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 4,
        "active_touchpoints": 2,
        "interaction_breakdown": {
          "link_interactions": 2,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 1
        }
      },
      {
        "hour": 9,
        "total_interactions": 4,
        "unique_users": 2,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2,
        "active_touchpoints": 2,
        "interaction_breakdown": {
          "link_interactions": 2,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 1
        }
      },
      {
        "hour": 10,
        "total_interactions": 44,
        "unique_users": 21,
        "interactions_per_user": 2.1,
        "avg_interactions_per_day": 14.7,
        "active_touchpoints": 3,
        "interaction_breakdown": {
          "link_interactions": 22,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 15,
          "desktop_interactions": 7
        }
      },
      {
        "hour": 11,
        "total_interactions": 20,
        "unique_users": 9,
        "interactions_per_user": 2.22,
        "avg_interactions_per_day": 6.7,
        "active_touchpoints": 3,
        "interaction_breakdown": {
          "link_interactions": 10,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 6,
          "desktop_interactions": 4
        }
      },
      {
        "hour": 12,
        "total_interactions": 6,
        "unique_users": 3,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2,
        "active_touchpoints": 3,
        "interaction_breakdown": {
          "link_interactions": 3,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 2
        }
      },
      {
        "hour": 13,
        "total_interactions": 8,
        "unique_users": 4,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2.7,
        "active_touchpoints": 3,
        "interaction_breakdown": {
          "link_interactions": 4,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 3
        }
      },
      {
        "hour": 14,
        "total_interactions": 18,
        "unique_users": 7,
        "interactions_per_user": 2.57,
        "avg_interactions_per_day": 4.5,
        "active_touchpoints": 5,
        "interaction_breakdown": {
          "link_interactions": 9,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 3,
          "desktop_interactions": 6
        }
      },
      {
        "hour": 15,
        "total_interactions": 10,
        "unique_users": 4,
        "interactions_per_user": 2.5,
        "avg_interactions_per_day": 3.3,
        "active_touchpoints": 2,
        "interaction_breakdown": {
          "link_interactions": 5,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 0,
          "desktop_interactions": 5
        }
      },
      {
        "hour": 16,
        "total_interactions": 8,
        "unique_users": 4,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2,
        "active_touchpoints": 3,
        "interaction_breakdown": {
          "link_interactions": 4,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 2,
          "desktop_interactions": 2
        }
      },
      {
        "hour": 17,
        "total_interactions": 12,
        "unique_users": 5,
        "interactions_per_user": 2.4,
        "avg_interactions_per_day": 6,
        "active_touchpoints": 3,
        "interaction_breakdown": {
          "link_interactions": 6,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 3,
          "desktop_interactions": 3
        }
      },
      {
        "hour": 18,
        "total_interactions": 22,
        "unique_users": 9,
        "interactions_per_user": 2.44,
        "avg_interactions_per_day": 7.3,
        "active_touchpoints": 4,
        "interaction_breakdown": {
          "link_interactions": 11,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 10
        }
      },
      {
        "hour": 19,
        "total_interactions": 4,
        "unique_users": 2,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2,
        "active_touchpoints": 2,
        "interaction_breakdown": {
          "link_interactions": 2,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 1
        }
      },
      {
        "hour": 20,
        "total_interactions": 8,
        "unique_users": 4,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 8,
        "active_touchpoints": 3,
        "interaction_breakdown": {
          "link_interactions": 4,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 3
        }
      },
      {
        "hour": 22,
        "total_interactions": 4,
        "unique_users": 2,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 2,
        "active_touchpoints": 2,
        "interaction_breakdown": {
          "link_interactions": 2,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 1,
          "desktop_interactions": 1
        }
      },
      {
        "hour": 23,
        "total_interactions": 12,
        "unique_users": 6,
        "interactions_per_user": 2,
        "avg_interactions_per_day": 6,
        "active_touchpoints": 2,
        "interaction_breakdown": {
          "link_interactions": 6,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        },
        "platform_breakdown": {
          "mobile_interactions": 5,
          "desktop_interactions": 1
        }
      }
    ],
    "daily_patterns": [
      {
        "day_of_week": 1,
        "day_name": "Monday",
        "total_interactions": 32,
        "unique_users": 14,
        "interactions_per_user": 2.29,
        "avg_interactions_per_occurrence": 32,
        "occurrences": 1,
        "active_touchpoints": 7,
        "interaction_breakdown": {
          "link_interactions": 16,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        }
      },
      {
        "day_of_week": 2,
        "day_name": "Tuesday",
        "total_interactions": 82,
        "unique_users": 33,
        "interactions_per_user": 2.48,
        "avg_interactions_per_occurrence": 82,
        "occurrences": 1,
        "active_touchpoints": 5,
        "interaction_breakdown": {
          "link_interactions": 41,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        }
      },
      {
        "day_of_week": 3,
        "day_name": "Wednesday",
        "total_interactions": 20,
        "unique_users": 10,
        "interactions_per_user": 2,
        "avg_interactions_per_occurrence": 10,
        "occurrences": 2,
        "active_touchpoints": 5,
        "interaction_breakdown": {
          "link_interactions": 10,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        }
      },
      {
        "day_of_week": 4,
        "day_name": "Thursday",
        "total_interactions": 38,
        "unique_users": 15,
        "interactions_per_user": 2.53,
        "avg_interactions_per_occurrence": 38,
        "occurrences": 1,
        "active_touchpoints": 5,
        "interaction_breakdown": {
          "link_interactions": 19,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        }
      },
      {
        "day_of_week": 5,
        "day_name": "Friday",
        "total_interactions": 36,
        "unique_users": 14,
        "interactions_per_user": 2.57,
        "avg_interactions_per_occurrence": 36,
        "occurrences": 1,
        "active_touchpoints": 5,
        "interaction_breakdown": {
          "link_interactions": 18,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        }
      },
      {
        "day_of_week": 6,
        "day_name": "Saturday",
        "total_interactions": 2,
        "unique_users": 1,
        "interactions_per_user": 2,
        "avg_interactions_per_occurrence": 2,
        "occurrences": 1,
        "active_touchpoints": 1,
        "interaction_breakdown": {
          "link_interactions": 1,
          "qr_interactions": 0,
          "nfc_interactions": 0,
          "wifi_interactions": 0
        }
      }
    ],
    "weekly_trends": null,
    "touchpoint_temporal_patterns": null
  },
  "insights": {
    "peak_activity": {
      "peak_periods": {
        "peak_hour": {
          "hour": 10,
          "interactions": 44
        },
        "peak_day": {
          "day": "Tuesday",
          "interactions": 82
        }
      },
      "low_activity_periods": {
        "lowest_hour": {
          "hour": 1,
          "interactions": 2
        },
        "lowest_day": {
          "day": "Saturday",
          "interactions": 2
        }
      },
      "activity_concentration": {
        "above_avg_hours": 6,
        "above_avg_days": 3,
        "concentration_score": 33.9
      }
    },
    "temporal_summary": {
      "total_users": 76,
      "total_interactions": 105,
      "total_active_days": 7,
      "avg_interaction_hour": 12.9,
      "most_common_hour": 12,
      "most_common_day": 2,
      "unique_hours_active": 20,
      "unique_days_active": 6,
      "activity_pattern": "business_hours",
      "weekly_pattern": "weekday_focused",
      "temporal_diversity": {
        "hour_spread_percentage": 83.3,
        "day_spread_percentage": 85.7
      }
    },
    "recommendations": null
  }
}