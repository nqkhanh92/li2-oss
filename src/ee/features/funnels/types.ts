export type Funnel = {
  id: string
  organization_id: string
  name: string
  description: string | null
  is_active: boolean | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type FunnelStep = {
  id: string
  funnel_id: string
  position: number
  name: string
  pattern_type: string
  condition: string
  pattern: string
  is_required: boolean
  event_name: string | null
  created_at: string
}

export type FunnelWithStepCount = Funnel & {
  funnel_steps: { count: number }[]
}

export type FunnelListStats = {
  total_entries: number | null
  total_conversions: number | null
  conversion_rate: number | null
  cvr_trend: number | null
  biggest_dropoff_step_position: number | null
  biggest_dropoff_step_name: string | null
  biggest_dropoff_next_step_name: string | null
  biggest_dropoff_drop_offs: number | null
  biggest_dropoff_rate: number | null
}

export type FunnelListItem = FunnelWithStepCount & { stats: FunnelListStats | null }

export type FunnelWithSteps = Funnel & {
  funnel_steps: FunnelStep[]
}

// Report types (matches Go backend FunnelReportResult / StepMetrics)
export type StepMetrics = {
  step_position: number
  step_name: string
  visits: number
  entries: number
  proceeds: number
  drop_offs: number
  drop_off_rate: number
  skips: number
}

export type FunnelReportResult = {
  funnel_id: string
  funnel_name: string
  period_start: string
  period_end: string
  total_entries: number
  total_conversions: number
  conversion_rate: number
  steps: StepMetrics[]
  has_pageviews_in_period: boolean
  has_computation_results: boolean
  is_computation_complete: boolean
}

// Visitor detail types (Phase 8)
export type StepVisitor = {
  session_id: string
  visitor_id: string
  reached_step: number
  total_steps: number
  dropped_off: boolean
  completed: boolean
  browser: string | null
  os: string | null
  device_type: string | null
  country: string | null
  city: string | null
  referrer_domain: string | null
  started_at: string
}

export type StepVisitorsResponse = {
  visitors: StepVisitor[]
  total: number
  page: number
}

export type SessionDetail = {
  session_id: string
  visitor_id: string
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  device_type: string | null
  country: string | null
  region: string | null
  city: string | null
  referrer_domain: string | null
  started_at: string
  ended_at: string | null
  duration_ms: number
  page_count: number
  entry_page: string | null
  exit_page: string | null
  is_bounce: boolean
}

export type PageviewDetail = {
  id: string
  page_path: string
  page_url: string
  page_title: string | null
  search_query: string | null
  event_name: string | null
  tp_id: string | null
  li2_cid: string | null
  event_type: string | null
  timestamp: string
  time_on_page: number | null
}

export type SessionWithPageviews = {
  session: SessionDetail
  pageviews: PageviewDetail[]
}

// Raw DB row from funnel_results table
export type FunnelResultRow = {
  id: string
  funnel_id: string
  organization_id: string
  period_start: string
  period_end: string
  period_type: string
  step_metrics: StepMetrics[]
  total_entries: number
  total_conversions: number
  conversion_rate: number
  computed_at: string
  data_version: number
}
