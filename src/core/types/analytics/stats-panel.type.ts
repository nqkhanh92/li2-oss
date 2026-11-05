// types/stats-panel.types.ts
export interface CommonStats {
  value: number;
  change_pct: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Stats {
  total_visits: CommonStats;
  unique_visits: CommonStats;
  link_clicks: CommonStats;
  qr_scans: CommonStats;
  nfc_taps: CommonStats;
  wifi_accesses: CommonStats;
  touchpoints_active: number;
  value?: number;
}

export interface StatsPanel {
  stats: Stats;
}
