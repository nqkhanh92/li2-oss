export interface LinkJourneyTouchPoint {
  id: string
  name: string
  short_url: string
  destination_url: string
  pageview_count: number
}

export interface TrafficSummary {
  total_clicks: number
  unique_visitors: number
  total_sessions: number
  bounce_rate: number
}

export interface PageFlowItem {
  page_path: string
  page_title: string | null
  pageviews: number
  sessions: number
  visitors: number
}

export interface TopClickedElement {
  selector_path: string | null
  element_text: string | null
  element_tag: string | null
  click_count: number
}

export interface BehavioralHighlights {
  total_interactions: number
  rage_clicks: number
  top_clicked_elements: TopClickedElement[]
}

export interface RecentConversion {
  id: string
  event_type: string
  event_name: string
  amount: number | null
  currency: string | null
  created_at: string
  customer_name: string | null
  customer_email: string | null
}

export interface ConversionSummary {
  total_leads: number
  total_sales: number
  total_revenue: number
  recent_conversions: RecentConversion[]
}
