import { BaseRepository } from './base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import { AnalyticByTagDataType } from '@/app/api/organizations/[org_id]/analytics/by-tags/route'
import {
  AdvancedAnalyticsParams,
  AdvancedAnalytics,
  RealtimeParams,
  RealtimeAnalytics,
} from '../types/analytics/advanced.type'
import { logger } from '@/infrastructure/logging/logger'
import {
  RankingShortLinkVisits,
  TypeVisitByLinks,
  RankingDestinationVisits,
  RankingUTMParameterVisits,
  RankingReferrerVisits,
} from '../types/analytics'
import { GeoBreakdownRow } from '../types/analytics/geo.type'

const log = logger.child({
  service: 'AnalyticRepository',
})
export class AnalyticRepository extends BaseRepository<'visits'> {
  constructor() {
    super('visits')
  }

  async getRankingByLinks<T extends TypeVisitByLinks>(
    type: T,
    org_id: string,
    tag_ids: string[] | undefined,
    start_time: string,
    end_time: string,
    tp_ids?: string[],
    exclude_bot?: boolean,
    collection_ids?: string[],
    include_null_collection?: boolean,
    utm_source_values?: string[],
    utm_medium_values?: string[],
    utm_campaign_values?: string[],
    interaction_types?: string[],
    user_id?: string
  ) {
    const { data: analytics, error: analytics_error } = await supabaseService
      .rpc('get_ranking_by_links', {
        _type: type,
        _organization_id: org_id,
        _tag_ids: tag_ids || undefined,
        _tp_ids: tp_ids || undefined,
        _collection_ids: collection_ids || undefined,
        _include_null_collection: include_null_collection ?? false,
        _start_time: start_time,
        _end_time: end_time,
        _exclude_bot: exclude_bot ?? false,
        _utm_source_values: utm_source_values || undefined,
        _utm_medium_values: utm_medium_values || undefined,
        _utm_campaign_values: utm_campaign_values || undefined,
        _user_id: user_id,
        _interaction_types: interaction_types || undefined,
      })
      .overrideTypes<RankingShortLinkVisits<T>>()
    if (analytics_error) {
      throw analytics_error
    }
    return analytics
  }

  async getRankingByDestinations(
    type: 'full_urls' | 'base_urls',
    org_id: string,
    tag_ids: string[] | undefined,
    start_time: string,
    end_time: string,
    tp_ids?: string[],
    exclude_bot?: boolean,
    collection_ids?: string[],
    include_null_collection?: boolean,
    utm_source_values?: string[],
    utm_medium_values?: string[],
    utm_campaign_values?: string[],
    interaction_types?: string[],
    user_id?: string
  ) {
    const { data: analytics, error: analytics_error } = await supabaseService
      .rpc('get_ranking_by_destinations', {
        _type: type,
        _organization_id: org_id,
        _tag_ids: tag_ids || undefined,
        _tp_ids: tp_ids || undefined,
        _collection_ids: collection_ids || undefined,
        _include_null_collection: include_null_collection ?? false,
        _start_time: start_time,
        _end_time: end_time,
        _exclude_bot: exclude_bot ?? false,
        _utm_source_values: utm_source_values || undefined,
        _utm_medium_values: utm_medium_values || undefined,
        _utm_campaign_values: utm_campaign_values || undefined,
        _user_id: user_id,
        _interaction_types: interaction_types || undefined,
      })
      .overrideTypes<RankingDestinationVisits>()
    if (analytics_error) {
      throw analytics_error
    }
    return analytics
  }

  async getRankingByUTMParameters(
    type: 'by_source' | 'by_medium' | 'by_campaign' | 'by_term' | 'by_content',
    org_id: string,
    tag_ids: string[] | undefined,
    start_time: string,
    end_time: string,
    tp_ids?: string[],
    exclude_bot?: boolean,
    collection_ids?: string[],
    include_null_collection?: boolean,
    utm_source_values?: string[],
    utm_medium_values?: string[],
    utm_campaign_values?: string[],
    interaction_types?: string[],
    user_id?: string
  ) {
    const { data: analytics, error: analytics_error } = await supabaseService
      .rpc('get_ranking_by_utm_parameters', {
        _type: type,
        _organization_id: org_id,
        _tag_ids: tag_ids || undefined,
        _tp_ids: tp_ids || undefined,
        _collection_ids: collection_ids || undefined,
        _include_null_collection: include_null_collection ?? false,
        _start_time: start_time,
        _end_time: end_time,
        _exclude_bot: exclude_bot ?? false,
        _utm_source_values: utm_source_values || undefined,
        _utm_medium_values: utm_medium_values || undefined,
        _utm_campaign_values: utm_campaign_values || undefined,
        _user_id: user_id,
        _interaction_types: interaction_types || undefined,
      })
      .overrideTypes<RankingUTMParameterVisits>()
    if (analytics_error) {
      throw analytics_error
    }
    return analytics
  }

  async getRankingByReferrers(
    type: 'referrer' | 'raw',
    org_id: string,
    tag_ids: string[] | undefined,
    start_time: string,
    end_time: string,
    tp_ids?: string[],
    exclude_bot?: boolean,
    collection_ids?: string[],
    include_null_collection?: boolean,
    utm_source_values?: string[],
    utm_medium_values?: string[],
    utm_campaign_values?: string[],
    interaction_types?: string[],
    user_id?: string
  ) {
    const { data: analytics, error: analytics_error } = await supabaseService
      .rpc('get_ranking_by_referrers', {
        _type: type,
        _organization_id: org_id,
        _tag_ids: tag_ids || undefined,
        _tp_ids: tp_ids || undefined,
        _collection_ids: collection_ids || undefined,
        _include_null_collection: include_null_collection ?? false,
        _start_time: start_time,
        _end_time: end_time,
        _exclude_bot: exclude_bot ?? false,
        _utm_source_values: utm_source_values || undefined,
        _utm_medium_values: utm_medium_values || undefined,
        _utm_campaign_values: utm_campaign_values || undefined,
        _user_id: user_id,
        _interaction_types: interaction_types || undefined,
      })
      .overrideTypes<RankingReferrerVisits>()
    if (analytics_error) {
      throw analytics_error
    }
    return analytics
  }

  async getAnalyticByTag(
    org_id: string,
    tag_ids: string[] | undefined,
    start_time: string,
    end_time: string,
    tp_ids?: string[],
    exclude_bot?: boolean,
    collection_ids?: string[],
    include_null_collection?: boolean,
    utm_source_values?: string[],
    utm_medium_values?: string[],
    utm_campaign_values?: string[],
    interaction_types?: string[],
    user_id?: string
  ) {
    // console.log({
    //   _organization_id: org_id,
    //   _tag_ids: tag_ids || undefined,
    //   _tp_ids: tp_ids || undefined,
    //   _collection_ids: collection_ids || undefined,
    //   _include_null_collection: include_null_collection ?? false,
    //   _start_time: start_time,
    //   _end_time: end_time,
    //   _exclude_bot: exclude_bot ?? false,
    //   _utm_source_values: utm_source_values || undefined,
    //   _utm_medium_values: utm_medium_values || undefined,
    //   _utm_campaign_values: utm_campaign_values || undefined,
    // })
    const { data: analytics, error: analytics_error } = await supabaseService
      .rpc('get_visits_analytics_v4', {
        _organization_id: org_id,
        _tag_ids: tag_ids || undefined,
        _tp_ids: tp_ids || undefined,
        _collection_ids: collection_ids || undefined,
        _include_null_collection: include_null_collection ?? false,
        _start_time: start_time,
        _end_time: end_time,
        _exclude_bot: exclude_bot ?? false,
        _utm_source_values: utm_source_values || undefined,
        _utm_medium_values: utm_medium_values || undefined,
        _utm_campaign_values: utm_campaign_values || undefined,
        _user_id: user_id,
        _interaction_types: interaction_types || undefined,
      })
      .overrideTypes<AnalyticByTagDataType>()
    if (analytics_error) {
      throw analytics_error
    }
    return analytics
  }

  async getAnalyticByTouchPoint(
    org_id: string,
    tp_ids: string[] | undefined,
    start_time: string,
    end_time: string,
    exclude_bot?: boolean,
    collection_ids?: string[],
    include_null_collection?: boolean,
    utm_source_values?: string[],
    utm_medium_values?: string[],
    utm_campaign_values?: string[]
  ) {
    const { data: analytics, error: analytics_error } = await supabaseService
      .rpc('get_visits_analytics', {
        _organization_id: org_id,
        _tp_ids: tp_ids || undefined,
        _collection_ids: collection_ids || undefined,
        _include_null_collection: include_null_collection ?? false,
        _start_time: start_time,
        _end_time: end_time,
        _exclude_bot: exclude_bot ?? false,
        _utm_source_values: utm_source_values || undefined,
        _utm_medium_values: utm_medium_values || undefined,
        _utm_campaign_values: utm_campaign_values || undefined,
      } as any)
      .returns<AnalyticByTagDataType>()
    if (analytics_error) {
      throw analytics_error
    }
    return analytics
  }

  async getAdvancedAnalytics(
    orgId: string,
    type: (typeof AdvancedAnalytics)[keyof typeof AdvancedAnalytics],
    params: AdvancedAnalyticsParams
  ) {
    const { data: analytics, error: analytics_error } = await supabaseService.rpc(type, {
      p_organization_id: orgId,
      p_tag_ids: (params.p_tag_ids ?? null) as any,
      p_touchpoint_ids: (params.p_touchpoint_ids ?? null) as any,
      p_collection_ids: (params.p_collection_ids ?? null) as any,
      p_include_null_collection: params.p_include_null_collection ?? false,
      p_period_days: params.p_period_days,
      p_timezone: params.p_timezone,
      p_is_premium: params.p_is_premium,
    })
    if (analytics_error) {
      throw analytics_error
    }
    return analytics
  }

  async getVisitsByDestinations(
    orgId: string,
    tpId: string,
    start_time: string,
    end_time: string,
    exclude_bot?: boolean,
    timezone?: string,
    collection_ids?: string[],
    include_null_collection?: boolean
  ) {
    const { data: visits, error: visits_error } = await supabaseService.rpc(
      'get_visits_by_destinations_v2',
      {
        p_org_id: orgId,
        p_tp_id: tpId,
        p_start_time: start_time,
        p_end_time: end_time,
        p_exclude_bot: exclude_bot ?? false,
        p_timezone: timezone ?? 'UTC',
        p_collection_ids: collection_ids || undefined,
        p_include_null_collection: include_null_collection ?? false,
      }
    )
    if (visits_error) {
      throw visits_error
    }
    return visits
  }

  async getRealtimeAnalytics(
    orgId: string,
    type: (typeof RealtimeAnalytics)[keyof typeof RealtimeAnalytics],
    params: RealtimeParams & { p_user_id?: string }
  ) {
    // Only get_realtime_top_links accepts p_limit — v3 and others do not
    const supportsLimit = type === 'get_realtime_top_links'

    const { data: analytics, error: analytics_error } = await supabaseService.rpc(type, {
      p_organization_id: orgId,
      p_last_hours: params.p_last_hours,
      p_timezone: params.p_timezone,
      p_collection_ids: params.p_collection_ids || undefined,
      p_include_null_collection: params.p_include_null_collection ?? true,
      p_user_id: params.p_user_id,
      p_exclude_bot: params.p_exclude_bot,
      ...(supportsLimit && params.p_limit !== undefined && { p_limit: params.p_limit }),
    })

    if (analytics_error) {
      throw analytics_error
    }

    return {
      data: analytics,
      rowCount: analytics.length,
    }
  }

  async getRawVisitData(
    org_id: string,
    tag_ids?: string[],
    tp_ids?: string[],
    start_time?: string,
    end_time?: string,
    exclude_bot?: boolean,
    timezone?: string,
    last_hours?: number,
    limit?: number,
    offset?: number,
    collection_ids?: string[],
    include_null_collection?: boolean,
    utm_source_values?: string[],
    utm_medium_values?: string[],
    utm_campaign_values?: string[],
    interaction_types?: string[],
    user_id?: string
  ) {
    const { data: visits, error: visits_error } = await supabaseService
      .rpc('get_raw_visit_data_v4', {
        p_organization_id: org_id,
        p_tag_ids: tag_ids || undefined,
        p_tp_ids: tp_ids || undefined,
        p_collection_ids: collection_ids || undefined,
        p_include_null_collection: include_null_collection ?? false,
        p_start_time: start_time || undefined,
        p_end_time: end_time || undefined,
        p_exclude_bot: exclude_bot ?? false,
        p_timezone: timezone || 'UTC',
        p_last_hours: last_hours ?? 24,
        p_limit: limit || undefined,
        p_offset: offset || 0,
        p_utm_source_values: utm_source_values || undefined,
        p_utm_medium_values: utm_medium_values || undefined,
        p_utm_campaign_values: utm_campaign_values || undefined,
        p_interaction_types: interaction_types || undefined,
        p_user_id: user_id || undefined,
      })
      .returns<
        {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          touchpoint_id: string
          touchpoint_name: string
          total_count: number
          visitor_id: string | null
          customer_profile_id: string | null
          customer_name: string | null
          customer_email: string | null
          customer_external_id: string | null
        }[]
      >()

    if (visits_error) {
      throw visits_error
    }

    return visits
  }

  async getDistinctUtmValues(
    org_id: string,
    tag_ids?: string[],
    tp_ids?: string[],
    collection_ids?: string[],
    include_null_collection?: boolean,
    start_time?: string,
    end_time?: string,
    exclude_bot?: boolean
  ) {
    const { data, error } = await supabaseService
      .rpc('get_distinct_utm_values', {
        _organization_id: org_id,
        _tag_ids: tag_ids || undefined,
        _tp_ids: tp_ids || undefined,
        _collection_ids: collection_ids || undefined,
        _include_null_collection: include_null_collection ?? false,
        _start_time: start_time || undefined,
        _end_time: end_time || undefined,
        _exclude_bot: exclude_bot ?? false,
      })
      .returns<{
        utm_source: string[]
        utm_medium: string[]
        utm_campaign: string[]
      }>()

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Get touch-point IDs filtered by collection IDs
   * Used for filtering realtime analytics by accessible collections
   */
  async getTouchPointIdsByCollections(
    orgId: string,
    collectionIds: string[],
    includeNull: boolean
  ): Promise<string[]> {
    let query = supabaseService.from('touch_points').select('id').eq('organization_id', orgId)

    if (includeNull) {
      // Include touch-points in specified collections OR uncategorized
      query = query.or(`collection_id.in.(${collectionIds.join(',')}),collection_id.is.null`)
    } else {
      // Only include touch-points in specified collections
      query = query.in('collection_id', collectionIds)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data?.map((tp) => tp.id) || []
  }

  /**
   * Lượt truy cập đã gộp theo tổ hợp vị trí thô `(country, region, city, region_iso)`.
   *
   * Không COALESCE về `'unknown'`: `country = 'ZZ'` (không rõ nước) và `region_iso IS NULL` (rõ
   * nước, chưa rõ vùng) là hai nghĩa khác nhau, và việc tra tỉnh xảy ra ở TypeScript — bảng
   * `aliases` + `LEGACY_ISO_CODES` nằm ở `src/shared/constants/vietnam-provinces.ts`, không ở DB.
   *
   * Số hàng trả về là số tổ hợp vị trí khác nhau, không phải số lượt (LiHi 2026-10-26: 5 hàng cho
   * cả bảng 195 lượt).
   */
  async getGeoBreakdown(
    org_id: string,
    start_time: string,
    end_time: string,
    tag_ids?: string[],
    tp_ids?: string[],
    exclude_bot?: boolean,
    collection_ids?: string[],
    include_null_collection?: boolean,
    interaction_types?: string[],
    user_id?: string,
    country?: string
  ): Promise<GeoBreakdownRow[]> {
    const { data, error } = await supabaseService
      .rpc('get_visits_geo_breakdown', {
        _organization_id: org_id,
        _tp_ids: tp_ids || undefined,
        _tag_ids: tag_ids || undefined,
        _collection_ids: collection_ids || undefined,
        _include_null_collection: include_null_collection ?? false,
        _start_time: start_time,
        _end_time: end_time,
        _exclude_bot: exclude_bot ?? false,
        _user_id: user_id,
        _interaction_types: interaction_types || undefined,
        _country: country || undefined,
      })
      .overrideTypes<GeoBreakdownRow[]>()

    if (error) {
      throw error
    }

    return data ?? []
  }
}

export const analyticRepo =
  process.env.NODE_ENV !== 'production'
    ? new AnalyticRepository()
    : (globalThis._analyticRepo ?? (globalThis._analyticRepo = new AnalyticRepository()))
