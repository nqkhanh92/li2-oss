import { supabaseService } from '@/infrastructure/database/supabase'
import {
  DeepLinkAnalyticsFilters,
  DeepLinkClickSummary,
  DeepLinkClickTimeseriesPoint,
  DeepLinkRanking,
  DeepLinkRankingGroupBy,
  DeepLinkSummary,
  DeepLinkTimeseriesPoint,
} from '@/ee/features/deep-link-analytics/types'

export type DeepLinkBucket = 'hour' | 'day'

// Both RPCs RETURN TABLE(...) with a single aggregate row, so supabase-js returns
// a one-element array — we take [0]. `viewableTpIds`:
//   undefined → org-wide (owner; includes NULL-touch_point_id events)
//   array     → scoped to exactly those touch points (NULL-tp events excluded)
// See get_deep_link_summary / get_deep_link_click_summary migration headers.
class DeepLinkAnalyticsRepository {
  async getSummary(
    orgId: string,
    viewableTpIds: string[] | undefined,
    filters: DeepLinkAnalyticsFilters
  ): Promise<DeepLinkSummary> {
    const { data, error } = await supabaseService.rpc('get_deep_link_summary', {
      _organization_id: orgId,
      _viewable_tp_ids: viewableTpIds,
      _tp_ids: filters.tpIds?.length ? filters.tpIds : undefined,
      _tag_ids: filters.tagIds?.length ? filters.tagIds : undefined,
      _collection_ids: filters.collectionIds?.length ? filters.collectionIds : undefined,
      _start_date: filters.startDate || undefined,
      _end_date: filters.endDate || undefined,
      _utm_sources: filters.utmSources?.length ? filters.utmSources : undefined,
      _utm_mediums: filters.utmMediums?.length ? filters.utmMediums : undefined,
      _utm_campaigns: filters.utmCampaigns?.length ? filters.utmCampaigns : undefined,
      _exclude_bot: filters.excludeBot ?? false,
    })
    if (error) throw error
    const row = data?.[0]
    if (!row) return emptySummary()
    return row as unknown as DeepLinkSummary
  }

  async getClickSummary(
    orgId: string,
    viewableTpIds: string[] | undefined,
    filters: DeepLinkAnalyticsFilters
  ): Promise<DeepLinkClickSummary> {
    const { data, error } = await supabaseService.rpc('get_deep_link_click_summary', {
      _organization_id: orgId,
      _viewable_tp_ids: viewableTpIds,
      _tp_ids: filters.tpIds?.length ? filters.tpIds : undefined,
      _tag_ids: filters.tagIds?.length ? filters.tagIds : undefined,
      _collection_ids: filters.collectionIds?.length ? filters.collectionIds : undefined,
      _start_date: filters.startDate || undefined,
      _end_date: filters.endDate || undefined,
      _utm_sources: filters.utmSources?.length ? filters.utmSources : undefined,
      _utm_mediums: filters.utmMediums?.length ? filters.utmMediums : undefined,
      _utm_campaigns: filters.utmCampaigns?.length ? filters.utmCampaigns : undefined,
      _exclude_bot: filters.excludeBot ?? false,
    })
    if (error) throw error
    const row = data?.[0]
    if (!row) return { clicks: 0, by_channel: {}, by_segment_type: {} }
    return row as unknown as DeepLinkClickSummary
  }

  // App-Opens time-series (keystone get_deep_link_timeseries) — base area series.
  async getTimeseries(
    orgId: string,
    viewableTpIds: string[] | undefined,
    filters: DeepLinkAnalyticsFilters,
    bucket: DeepLinkBucket,
    timezone?: string
  ): Promise<DeepLinkTimeseriesPoint[]> {
    const { data, error } = await supabaseService.rpc('get_deep_link_timeseries', {
      _organization_id: orgId,
      _viewable_tp_ids: viewableTpIds,
      _tp_ids: filters.tpIds?.length ? filters.tpIds : undefined,
      _tag_ids: filters.tagIds?.length ? filters.tagIds : undefined,
      _collection_ids: filters.collectionIds?.length ? filters.collectionIds : undefined,
      _start_date: filters.startDate || undefined,
      _end_date: filters.endDate || undefined,
      _utm_sources: filters.utmSources?.length ? filters.utmSources : undefined,
      _utm_mediums: filters.utmMediums?.length ? filters.utmMediums : undefined,
      _utm_campaigns: filters.utmCampaigns?.length ? filters.utmCampaigns : undefined,
      _exclude_bot: filters.excludeBot ?? false,
      _bucket: bucket,
      _timezone: timezone,
    })
    if (error) throw error
    return (data ?? []) as unknown as DeepLinkTimeseriesPoint[]
  }

  // Clicks time-series (sibling get_deep_link_click_timeseries) — overlay line series.
  async getClickTimeseries(
    orgId: string,
    viewableTpIds: string[] | undefined,
    filters: DeepLinkAnalyticsFilters,
    bucket: DeepLinkBucket,
    timezone?: string
  ): Promise<DeepLinkClickTimeseriesPoint[]> {
    const { data, error } = await supabaseService.rpc('get_deep_link_click_timeseries', {
      _organization_id: orgId,
      _viewable_tp_ids: viewableTpIds,
      _tp_ids: filters.tpIds?.length ? filters.tpIds : undefined,
      _tag_ids: filters.tagIds?.length ? filters.tagIds : undefined,
      _collection_ids: filters.collectionIds?.length ? filters.collectionIds : undefined,
      _start_date: filters.startDate || undefined,
      _end_date: filters.endDate || undefined,
      _utm_sources: filters.utmSources?.length ? filters.utmSources : undefined,
      _utm_mediums: filters.utmMediums?.length ? filters.utmMediums : undefined,
      _utm_campaigns: filters.utmCampaigns?.length ? filters.utmCampaigns : undefined,
      _exclude_bot: filters.excludeBot ?? false,
      _bucket: bucket,
      _timezone: timezone,
    })
    if (error) throw error
    return (data ?? []) as unknown as DeepLinkClickTimeseriesPoint[]
  }

  // Per-link/tag/space (+ referrer/utm) ranking. get_deep_link_ranking RETURNS jsonb
  // (scalar), so supabase-js resolves `data` to the object directly — NOT data[0] like
  // the RETURNS TABLE summaries above.
  async getRanking(
    orgId: string,
    viewableTpIds: string[] | undefined,
    groupBy: DeepLinkRankingGroupBy,
    filters: DeepLinkAnalyticsFilters
  ): Promise<DeepLinkRanking> {
    const { data, error } = await supabaseService.rpc('get_deep_link_ranking', {
      _organization_id: orgId,
      _group_by: groupBy,
      _viewable_tp_ids: viewableTpIds,
      _tp_ids: filters.tpIds?.length ? filters.tpIds : undefined,
      _tag_ids: filters.tagIds?.length ? filters.tagIds : undefined,
      _collection_ids: filters.collectionIds?.length ? filters.collectionIds : undefined,
      _start_date: filters.startDate || undefined,
      _end_date: filters.endDate || undefined,
      _utm_sources: filters.utmSources?.length ? filters.utmSources : undefined,
      _utm_mediums: filters.utmMediums?.length ? filters.utmMediums : undefined,
      _utm_campaigns: filters.utmCampaigns?.length ? filters.utmCampaigns : undefined,
      _exclude_bot: filters.excludeBot ?? false,
    })
    if (error) throw error
    if (!data) return { group_by: groupBy, data: [], total: 0 }
    return data as unknown as DeepLinkRanking
  }
}

function emptySummary(): DeepLinkSummary {
  return {
    app_opens: 0,
    deferred_matches: 0,
    deferred_misses: 0,
    match_rate: null,
    by_platform: {},
    by_method: {},
    by_miss_reason: {},
  }
}

export const deepLinkAnalyticsRepository = new DeepLinkAnalyticsRepository()
