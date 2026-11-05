// data schemas
// interface BehaviorUserJourneysResponse {
//  period_info: {
//    period_days: number;
//    start_date: string; // ISO timestamp
//    end_date: string; // ISO timestamp
//    timezone: string;
//    is_premium: boolean;
//    analysis_type: "user_journeys";
//  };

import { BehaviorUserJourneysResponse } from "@/core/types/analytics/behaviors_user_journeys.type";

 
//  filters_applied: {
//    has_filters: boolean;
//    tags_count: number;
//    touchpoints_count: number;
//  };
 
//  journey_analysis: {
//    journey_patterns: JourneyPattern[];
//    entry_exit_analysis: EntryExitAnalysis[];
//    touchpoint_transitions: TouchpointTransition[] | null; // Premium only
//  };
 
//  insights: {
//    journey_summary: JourneySummary;
//    recommendations: Recommendation[] | null; // Premium only
//  };
// }

// interface JourneyPattern {
//  complexity: "single_touchpoint" | "two_touchpoint" | "multi_touchpoint";
//  interaction_diversity: "single_method" | "multi_method";
//  users_count: number;
//  pattern_percentage: number; // Rounded to 1 decimal
//  avg_interactions_per_journey: number; // Rounded to 2 decimals
//  avg_touchpoints_per_journey: number; // Rounded to 2 decimals
//  avg_journey_duration_minutes: number; // Rounded to 1 decimal
//  avg_active_days: number; // Rounded to 2 decimals
// }

// interface EntryExitAnalysis {
//  role: "entry" | "exit";
//  touchpoint_name: string;
//  interaction_type: "LINK" | "QR" | "NFC" | "WIFI";
//  users_count: number;
//  avg_interactions: number; // Rounded to 2 decimals
//  avg_journey_duration: number; // Rounded to 1 decimal
//  effectiveness_metric: number; // Rounded to 1 decimal (percentage)
// }

// interface TouchpointTransition {
//  from_touchpoint: string;
//  to_touchpoint: string;
//  from_interaction_type: "LINK" | "QR" | "NFC" | "WIFI";
//  to_interaction_type: "LINK" | "QR" | "NFC" | "WIFI";
//  transition_count: number;
//  unique_users: number;
//  avg_time_between_minutes: number; // Rounded to 1 decimal
//  flow_strength: "strong" | "moderate" | "weak";
// }

// interface JourneySummary {
//  total_users: number;
//  avg_interactions_per_user: number; // Rounded to 2 decimals
//  avg_journey_duration_minutes: number; // Rounded to 1 decimal
//  median_journey_duration_minutes: number;
//  avg_touchpoints_per_user: number; // Rounded to 2 decimals
//  longest_journey_minutes: number;
//  journeys_over_1_hour: number;
//  complexity_distribution: {
//    single_touchpoint_percentage: number; // Rounded to 1 decimal
//    two_touchpoint_percentage: number; // Rounded to 1 decimal
//    multi_touchpoint_percentage: number; // Rounded to 1 decimal
//  };
//  interaction_diversity: {
//    multi_method_percentage: number; // Rounded to 1 decimal
//  };
// }

// interface Recommendation {
//  recommendation_type: "high_single_touchpoint_rate" | "low_multi_touchpoint_engagement" | "short_journey_duration" | "limited_interaction_diversity";
//  priority: "high" | "medium" | "low";
//  category: "journey_optimization" | "engagement_depth" | "user_engagement" | "interaction_optimization";
//  metric_key: "single_touchpoint_percentage" | "multi_touchpoint_percentage" | "avg_journey_duration_minutes" | "multi_method_percentage";
//  threshold: number;
//  current_value: number;
//  improvement_potential: "create_touchpoint_connections" | "improve_cross_touchpoint_flows" | "increase_engagement_depth" | "diversify_interaction_types";
// }

export const behaviorsUserJourneysFreeTier: BehaviorUserJourneysResponse = {
  "period_info": {
    "period_days": 7,
    "start_date": "2025-08-06T13:54:42.198717+00:00",
    "end_date": "2025-08-13T13:54:42.198717+00:00",
    "timezone": "Asia/Ho_Chi_Minh",
    "is_premium": false,
    "analysis_type": "user_journeys"
  },
  "filters_applied": {
    "has_filters": false,
    "tags_count": 0,
    "touchpoints_count": 0
  },
  "journey_analysis": {
    "journey_patterns": [
      {
        "complexity": "single_touchpoint",
        "interaction_diversity": "single_method",
        "users_count": 66,
        "pattern_percentage": 89.2,
        "avg_interactions_per_journey": 1.18,
        "avg_touchpoints_per_journey": 1,
        "avg_journey_duration_minutes": 202.7,
        "avg_active_days": 1.05
      },
      {
        "complexity": "two_touchpoint",
        "interaction_diversity": "single_method",
        "users_count": 4,
        "pattern_percentage": 5.4,
        "avg_interactions_per_journey": 2,
        "avg_touchpoints_per_journey": 2,
        "avg_journey_duration_minutes": 573,
        "avg_active_days": 1.5
      },
      {
        "complexity": "multi_touchpoint",
        "interaction_diversity": "single_method",
        "users_count": 4,
        "pattern_percentage": 5.4,
        "avg_interactions_per_journey": 4.25,
        "avg_touchpoints_per_journey": 3.5,
        "avg_journey_duration_minutes": 4662.2,
        "avg_active_days": 2.5
      }
    ],
    "entry_exit_analysis": [
      {
        "role": "entry",
        "touchpoint_name": "Mini game",
        "interaction_type": "LINK",
        "users_count": 27,
        "avg_interactions": 1.59,
        "avg_journey_duration": 711.3,
        "effectiveness_metric": 22.2
      },
      {
        "role": "exit",
        "touchpoint_name": "Mini game",
        "interaction_type": "LINK",
        "users_count": 24,
        "avg_interactions": 1.38,
        "avg_journey_duration": 546.9,
        "effectiveness_metric": 12.5
      },
      {
        "role": "exit",
        "touchpoint_name": "ADS GG QR",
        "interaction_type": "LINK",
        "users_count": 22,
        "avg_interactions": 1.14,
        "avg_journey_duration": 28.3,
        "effectiveness_metric": 4.5
      },
      {
        "role": "entry",
        "touchpoint_name": "ADS GG QR",
        "interaction_type": "LINK",
        "users_count": 21,
        "avg_interactions": 1.1,
        "avg_journey_duration": 0,
        "effectiveness_metric": 0
      },
      {
        "role": "exit",
        "touchpoint_name": "ADS GG",
        "interaction_type": "LINK",
        "users_count": 10,
        "avg_interactions": 1.4,
        "avg_journey_duration": 201.4,
        "effectiveness_metric": 10
      },
      {
        "role": "entry",
        "touchpoint_name": "ADS GG",
        "interaction_type": "LINK",
        "users_count": 10,
        "avg_interactions": 1.3,
        "avg_journey_duration": 120.3,
        "effectiveness_metric": 10
      },
      {
        "role": "exit",
        "touchpoint_name": "Trang chủ",
        "interaction_type": "LINK",
        "users_count": 9,
        "avg_interactions": 2.33,
        "avg_journey_duration": 2061.5,
        "effectiveness_metric": 33.3
      },
      {
        "role": "entry",
        "touchpoint_name": "Trang chủ",
        "interaction_type": "LINK",
        "users_count": 7,
        "avg_interactions": 2,
        "avg_journey_duration": 1986.8,
        "effectiveness_metric": 14.3
      },
      {
        "role": "exit",
        "touchpoint_name": "Trang chủ TT",
        "interaction_type": "LINK",
        "users_count": 6,
        "avg_interactions": 1.17,
        "avg_journey_duration": 0.2,
        "effectiveness_metric": 0
      },
      {
        "role": "entry",
        "touchpoint_name": "Trang chủ TT",
        "interaction_type": "LINK",
        "users_count": 6,
        "avg_interactions": 1.17,
        "avg_journey_duration": 0.2,
        "effectiveness_metric": 0
      },
      {
        "role": "entry",
        "touchpoint_name": "ADS GG Minigame",
        "interaction_type": "LINK",
        "users_count": 3,
        "avg_interactions": 1,
        "avg_journey_duration": 0,
        "effectiveness_metric": 0
      },
      {
        "role": "exit",
        "touchpoint_name": "ADS GG Minigame",
        "interaction_type": "LINK",
        "users_count": 3,
        "avg_interactions": 1,
        "avg_journey_duration": 0,
        "effectiveness_metric": 0
      }
    ],
    "touchpoint_transitions": null
  },
  "insights": {
    "journey_summary": {
      "total_users": 74,
      "avg_interactions_per_user": 1.39,
      "avg_journey_duration_minutes": 463.7,
      "median_journey_duration_minutes": 0,
      "avg_touchpoints_per_user": 1.19,
      "longest_journey_minutes": 7524.290247566667,
      "journeys_over_1_hour": 10,
      "complexity_distribution": {
        "single_touchpoint_percentage": 89.2,
        "two_touchpoint_percentage": 5.4,
        "multi_touchpoint_percentage": 5.4
      },
      "interaction_diversity": {
        "multi_method_percentage": 0
      }
    },
    "recommendations": null
  }
}