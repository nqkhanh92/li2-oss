// Deep Link Analytics — shared types for the Clicks → App Opens funnel surface.
// Mirror the RPC return shapes (get_deep_link_summary / get_deep_link_click_summary);
// the jsonb `by_*` maps are typed as Record<string, number> for the widgets.

export interface DeepLinkSummary {
  app_opens: number
  deferred_matches: number
  deferred_misses: number
  /** matches / (matches + misses); null when there were no deferred attempts. */
  match_rate: number | null
  by_platform: Record<string, number>
  by_method: Record<string, number>
  /** All 7 miss_reason enum keys, zero-filled (the D-3.B keystone). */
  by_miss_reason: Record<string, number>
}

export interface DeepLinkClickSummary {
  clicks: number
  by_channel: Record<string, number>
  by_segment_type: Record<string, number>
}

// One bucket of the App-Opens time-series (get_deep_link_timeseries). `bucket` is an ISO
// timestamp at hour or day granularity (server-chosen from the date span).
export interface DeepLinkTimeseriesPoint {
  bucket: string
  app_opens: number
  deferred_matches: number
  deferred_misses: number
}

// One bucket of the Clicks time-series (get_deep_link_click_timeseries) — the overlay
// series, from `visits`. Same bucketing as DeepLinkTimeseriesPoint; merged by bucket in
// the chart. Two independent series, never summed (decision D-A).
export interface DeepLinkClickTimeseriesPoint {
  bucket: string
  clicks: number
}

// Server-side filter args (snake-cased onto the RPC params in the repository).
export interface DeepLinkAnalyticsFilters {
  startDate?: string
  endDate?: string
  tpIds?: string[]
  tagIds?: string[]
  collectionIds?: string[]
  utmSources?: string[]
  utmMediums?: string[]
  utmCampaigns?: string[]
  excludeBot?: boolean
}

// ── Per-link ranking (Phase 7) ──────────────────────────────────────────────
// get_deep_link_ranking returns rows for one dimension. link/tag/space carry the
// full Clicks · Direct opens · Matched triple; referrer/utm are clicks-only.
export type DeepLinkRankingGroupBy =
  | 'link'
  | 'tag'
  | 'space'
  | 'referrer'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'

export interface DeepLinkRankingRow {
  key: string
  name: string
  clicks: number
  /** 0 for referrer/utm group-bys (clicks-only). */
  direct_opens: number
  /** 0 for referrer/utm group-bys (clicks-only). */
  matched: number
}

export interface DeepLinkRanking {
  group_by: DeepLinkRankingGroupBy
  data: DeepLinkRankingRow[]
  /** Sum of clicks in scope — used for client-side bar scaling. */
  total: number
}
