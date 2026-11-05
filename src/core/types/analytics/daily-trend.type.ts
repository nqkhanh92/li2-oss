// types/daily-trend.types.ts

export interface DailyTrend {
    daily_data: DailyData[];
    summary: Summary;
  }
  
  export interface DailyData {
    date: string;
    link_clicks: number;
    qr_scans: number;
    nfc_taps: number;
    wifi_accesses: number;
    total_interactions: number;
    unique_users: number;
    active_touchpoints: number;
    moving_avg_3day: number;
    daily_growth_pct: number | null | undefined;
    same_day_last_week: any;
  }
  
  export interface Summary {
    total_days: number;
    days_with_activity: number;
    avg_daily_interactions: number;
    avg_daily_users: number;
    peak_day: PeakDay;
    trend_direction: string;
  }
  
  export interface PeakDay {
    date: string;
    interactions: number;
  }