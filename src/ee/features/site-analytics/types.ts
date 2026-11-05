export interface SitePageTypeBreakdown {
  type: string
  count: number
}

export interface SitePage {
  scheme: string
  hostname: string
  page_path: string
  total_count: number
  /** kept for PageTreeSidebar compatibility (same value as total_count) */
  click_count: number
  by_type: SitePageTypeBreakdown[]
}

export interface SitePageSession {
  scheme: string
  hostname: string
  page_path: string
  total_sessions: number
  unique_visitors: number
  bounce_rate: number | null
  avg_duration_sec: number | null
}

export interface SessionDayData {
  date: string
  sessions: number
  visitors: number
}

export interface SessionAnalytics {
  by_date: SessionDayData[]
  by_device: { device_type: string; count: number }[]
  by_browser: { browser: string; count: number }[]
  by_os: { os: string; count: number }[]
  by_country: { country: string; count: number }[]
  by_referrer: { referrer_domain: string; count: number }[]
  by_utm_source: { utm_source: string; count: number }[]
  by_channel: { channel: string; count: number }[]
}

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  click: 'Clicks',
  rage_click: 'Rage Clicks',
  scroll: 'Scrolls',
  form_fill: 'Form Fills',
  form_submit: 'Form Submits',
}
