import { AnalyticByTagDataType } from '@/app/api/organizations/[org_id]/analytics/by-tags/route'
import { RankingShortLinkVisits, TypeVisitByLinks } from '@/core/types/analytics'
import { AnalyticByDestinationType } from '@/core/types/analytics/advanced.type'
import type { GeoAnalytics, GeoAnalyticsParams } from '@/core/types/analytics/geo.type'
import { axiosApiInstance } from '@/shared/lib/axios'
import { SearchFilterPagination } from '@/shared/types'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'

export type AnalyticByTagParams = {
  tag_ids: string[]
  tp_ids: string[]
  date_range: { from: Date | string; to: Date | string }
}

export type AnalyticByTouchPointParams = {
  tp_ids: string[]
  date_range: { from: Date | string; to: Date | string }
}

/**
 * Extended filter parameters supporting multiple filter types
 * This is the new unified type for filtering analytics with multiple dimensions
 */
export type AnalyticFiltersParams = {
  tag_ids?: string[]
  tp_ids?: string[]
  collection_ids?: string[]
  date_range: { from: Date | string; to: Date | string }
  exclude_bot?: boolean
  utm_source_values?: string[]
  utm_medium_values?: string[]
  utm_campaign_values?: string[]
  interaction_types?: AllTouchPointVariants[]
}

/**
 * Phân bố lượt truy cập theo vị trí, từ endpoint geo riêng.
 *
 * KHÔNG dùng `by-tags`: payload kia không có `parent_total`, `coverage`, `region_supported` hay
 * phần trăm tính sẵn, nên card vị trí buộc phải tự chia — và đó chính là nguồn lỗi % cũ (hàng cấp
 * tỉnh lấy tổng toàn cầu làm mẫu số). Endpoint này trả `pct` đã tính trên đúng mẫu số.
 */
export const useGetGeoAnalytics = (
  org_id: string,
  params: AnalyticFiltersParams & GeoAnalyticsParams
) => {
  return useQuery<GeoAnalytics>({
    queryKey: ['analytics-geo', org_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/geo`, {
        params,
      })
      return data
    },
    enabled: !!org_id,
  })
}

export const useGetAnalyticByTag = (org_id: string, params: AnalyticByTagParams) => {
  return useQuery<AnalyticByTagDataType>({
    queryKey: ['analytics-by-tag', org_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/by-tags`, {
        params: params,
      })
      return data
    },
    enabled: !!org_id,
  })
}

export const useGetAnalyticByTouchPoint = (org_id: string, params: AnalyticByTouchPointParams) => {
  return useQuery<AnalyticByTagDataType>({
    queryKey: ['analytics-by-touch-point', org_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/by-tp`, {
        params: params,
      })
      return data
    },
    enabled: !!org_id,
  })
}
export const useGetAnalyticByDestination = (
  org_id: string,
  tp_id: string,
  params: {
    date_range: { from: Date | string; to: Date | string }
    exclude_bot: boolean
  }
) => {
  return useSuspenseQuery<AnalyticByDestinationType>({
    queryKey: ['analytics-by-destination', org_id, tp_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: AnalyticByDestinationType }>(
        `/organizations/${org_id}/analytics/destinations`,
        {
          params: {
            tp_id,
            ...params,
          },
        }
      )
      return data.data
    },
  })
}

/**
 * New unified hook for querying analytics with multiple filter types
 * Supports filtering by tags, touch-points, and date ranges
 *
 * @param org_id - Organization ID
 * @param params - Filter parameters including optional tag_ids, tp_ids, and required date_range
 * @returns Query result with analytics data
 *
 * @example
 * const { data, isLoading } = useGetAnalyticsByFilters('org-123', {
 *   tag_ids: ['tag-1', 'tag-2'],
 *   tp_ids: ['tp-1'],
 *   date_range: { from: '2024-01-01', to: '2024-01-31' }
 * })
 */
export const useGetAnalyticsByFilters = (
  org_id: string,
  params: AnalyticFiltersParams,
  removeSpaceFilters: boolean = false
) => {
  return useQuery<AnalyticByTagDataType>({
    queryKey: ['analytics-by-filters', org_id, params],
    queryFn: async () => {
      const hasTpIds = params.tp_ids && params.tp_ids.length > 0
      const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/by-tags`, {
        params: {
          date_range: params.date_range,
          exclude_bot: params.exclude_bot,
          tp_ids: params.tp_ids,
          collection_ids: params.collection_ids,
          utm_source_values: params.utm_source_values,
          utm_medium_values: params.utm_medium_values,
          utm_campaign_values: params.utm_campaign_values,
          removeSpaceFilters: removeSpaceFilters,
          interaction_types: params.interaction_types,
          ...(hasTpIds ? {} : { tag_ids: params.tag_ids }),
        },
      })
      return data
      // // For now, we'll use the existing by-tags endpoint if tag_ids are provided
      // // This can be enhanced to use a unified endpoint when backend supports it
      // const hasTagIds = params.tag_ids && params.tag_ids.length > 0
      // const hasTpIds = params.tp_ids && params.tp_ids.length > 0

      // if (hasTagIds && hasTpIds) {
      //   // When both filters are provided, make a request with both parameters
      //   // Backend should handle combining the filters
      //   const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/by-tags`, {
      //     params: {
      //       tag_ids: params.tag_ids,
      //       tp_ids: params.tp_ids,
      //       date_range: params.date_range,
      //       exclude_bot: params.exclude_bot,
      //     },
      //   })
      //   return data
      // } else if (hasTagIds) {
      //   // Use by-tags endpoint
      //   const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/by-tags`, {
      //     params: {
      //       tag_ids: params.tag_ids,
      //       date_range: params.date_range,
      //       exclude_bot: params.exclude_bot,
      //     },
      //   })
      //   return data
      // } else if (hasTpIds) {
      //   // Use by-tp endpoint
      //   const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/by-tp`, {
      //     params: {
      //       tp_ids: params.tp_ids,
      //       date_range: params.date_range,
      //       exclude_bot: params.exclude_bot,
      //     },
      //   })
      //   return data
      // } else {
      //   // No specific filters, get all analytics
      //   const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/by-tags`, {
      //     params: {
      //       date_range: params.date_range,
      //       exclude_bot: params.exclude_bot,
      //     },
      //   })
      //   return data
      // }
    },
    enabled: !!org_id,
  })
}

/**
 * Hook for fetching distinct UTM parameter values
 * Used to populate UTM filter dropdowns with actual values from visit data
 *
 * @param org_id - Organization ID
 * @param params - Filter parameters to scope the distinct values
 * @returns Query result with distinct UTM values for source, medium, and campaign
 */
export const useGetDistinctUtmValues = (
  org_id: string,
  params: {
    tag_ids?: string[]
    tp_ids?: string[]
    collection_ids?: string[]
    date_range: { from: Date | string; to: Date | string }
    exclude_bot?: boolean
  }
) => {
  return useQuery<{
    utm_source: string[]
    utm_medium: string[]
    utm_campaign: string[]
  }>({
    queryKey: ['utm-values', org_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${org_id}/analytics/utm-values`, {
        params,
      })
      return data
    },
    enabled: !!org_id,
  })
}

export type RawVisitDataParams = {
  tag_ids?: string[]
  tp_ids?: string[]
  collection_ids?: string[]
  date_range: { from: Date | string; to: Date | string }
  exclude_bot?: boolean
  utm_sources?: string[]
  utm_mediums?: string[]
  utm_campaigns?: string[]
  interaction_types?: string[]
  pagination?: {
    pageIndex: number
    pageSize: number
  }
}

export type RawVisitData = {
  touchpoint_id: string
  touchpoint_name: string
  os: string
  platform: string
  channel: string
  country: string
  city: string
  ip: string
  isp: string
  referrer: string
  created_at: string
  id: string
  visitor_id: string | null
  customer_profile_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_external_id: string | null
}

/**
 * Note: useGetRawVisitData has been replaced with useRawVisitDataInfiniteScroll
 * for better performance with large datasets using infinite scrolling.
 * See: src/features/analytics/hooks/useRawVisitDataInfiniteScroll.ts
 */

/**
 * Hook for fetching analytics filtered to a specific space
 * Used in dedicated space analytics page
 *
 * @param org_id - Organization ID
 * @param space_id - Space (collection) ID
 * @param params - Filter parameters without collection_ids (automatically set to space_id)
 * @returns Query result with analytics data scoped to the space
 */
export const useGetSpaceAnalyticsByFilters = (
  org_id: string,
  space_id: string,
  params: Omit<AnalyticFiltersParams, 'collection_ids'>
) => {
  return useQuery<AnalyticByTagDataType>({
    queryKey: ['space-analytics-by-filters', org_id, space_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${org_id}/spaces/${space_id}/analytics/by-tags`,
        {
          params: {
            date_range: params.date_range,
            exclude_bot: params.exclude_bot,
            tag_ids: params.tag_ids,
            tp_ids: params.tp_ids,
          },
        }
      )
      return data
    },
    enabled: !!org_id && !!space_id,
  })
}

/**
 * Hook for fetching raw visit data filtered to a specific space
 * Used in space analytics page for detailed visit information
 *
 * @param org_id - Organization ID
 * @param space_id - Space (collection) ID
 * @param params - Filter parameters
 * @returns Query result with raw visit data scoped to the space
 */
export const useGetSpaceRawVisits = (
  org_id: string,
  space_id: string,
  params: {
    date_range: { from: Date | string; to: Date | string }
    exclude_bot?: boolean
    timezone?: string
    last_hours?: number
  }
) => {
  return useQuery({
    queryKey: ['space-raw-visits', org_id, space_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${org_id}/spaces/${space_id}/analytics/raw-visits`,
        { params }
      )
      return data
    },
    enabled: !!org_id && !!space_id,
  })
}

/**
 * Hook for fetching ranking by links, tags, or spaces
 * Used in analytics ranking view
 *
 * @param org_id - Organization ID
 * @param type - Type of ranking: 'by_links', 'by_tags', or 'by_spaces'
 * @param params - Filter parameters
 * @returns Query result with ranking data
 */
export const useGetRankingByLinks = <T extends TypeVisitByLinks>(
  org_id: string,
  type: T,
  params: AnalyticFiltersParams,
  removeSpaceFilters: boolean = false
) => {
  return useQuery<RankingShortLinkVisits<T>>({
    queryKey: ['ranking-by-links', org_id, type, params, removeSpaceFilters],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${org_id}/analytics/short-links`,
        {
          params: {
            type,
            date_range: params.date_range,
            exclude_bot: params.exclude_bot,
            tag_ids: params.tag_ids,
            tp_ids: params.tp_ids,
            collection_ids: params.collection_ids,
            utm_source_values: params.utm_source_values,
            utm_medium_values: params.utm_medium_values,
            utm_campaign_values: params.utm_campaign_values,
            interaction_types: params.interaction_types,
            removeSpaceFilters,
          },
        }
      )
      return data.data
    },
    enabled: !!org_id && !!type,
  })
}

/**
 * Hook for fetching ranking by destinations (full URLs or base URLs)
 * Used in analytics ranking view
 *
 * @param org_id - Organization ID
 * @param type - Type of ranking: 'full_urls' or 'base_urls'
 * @param params - Filter parameters
 * @returns Query result with ranking data
 */
export const useGetRankingByDestinations = (
  org_id: string,
  type: 'full_urls' | 'base_urls',
  params: AnalyticFiltersParams,
  removeSpaceFilters: boolean = false
) => {
  return useQuery<import('@/core/types/analytics').RankingDestinationVisits>({
    queryKey: ['ranking-by-destinations', org_id, type, params, removeSpaceFilters],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${org_id}/analytics/destination-rankings`,
        {
          params: {
            type,
            date_range: params.date_range,
            exclude_bot: params.exclude_bot,
            tag_ids: params.tag_ids,
            tp_ids: params.tp_ids,
            collection_ids: params.collection_ids,
            utm_source_values: params.utm_source_values,
            utm_medium_values: params.utm_medium_values,
            utm_campaign_values: params.utm_campaign_values,
            interaction_types: params.interaction_types,
            removeSpaceFilters,
          },
        }
      )
      return data.data
    },
    enabled: !!org_id && !!type,
  })
}

/**
 * Hook for fetching ranking by UTM parameters
 * Used in analytics ranking view
 *
 * @param org_id - Organization ID
 * @param type - Type of UTM parameter: 'by_source', 'by_medium', 'by_campaign', 'by_term', or 'by_content'
 * @param params - Filter parameters
 * @returns Query result with ranking data
 */
export const useGetRankingByUTMParameters = (
  org_id: string,
  type: 'by_source' | 'by_medium' | 'by_campaign' | 'by_term' | 'by_content',
  params: AnalyticFiltersParams,
  removeSpaceFilters: boolean = false
) => {
  return useQuery<import('@/core/types/analytics').RankingUTMParameterVisits>({
    queryKey: ['ranking-by-utm-parameters', org_id, type, params, removeSpaceFilters],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${org_id}/analytics/utm-rankings`,
        {
          params: {
            type,
            date_range: params.date_range,
            exclude_bot: params.exclude_bot,
            tag_ids: params.tag_ids,
            tp_ids: params.tp_ids,
            collection_ids: params.collection_ids,
            utm_source_values: params.utm_source_values,
            utm_medium_values: params.utm_medium_values,
            utm_campaign_values: params.utm_campaign_values,
            interaction_types: params.interaction_types,
            removeSpaceFilters,
          },
        }
      )
      return data.data
    },
    enabled: !!org_id && !!type,
  })
}

/**
 * Hook for fetching ranking by referrers
 * Used in analytics ranking view
 *
 * @param org_id - Organization ID
 * @param type - Type of referrer: 'referrer' or 'raw'
 * @param params - Filter parameters
 * @returns Query result with ranking data
 */
export const useGetRankingByReferrers = (
  org_id: string,
  type: 'referrer' | 'raw',
  params: AnalyticFiltersParams,
  removeSpaceFilters: boolean = false
) => {
  return useQuery<import('@/core/types/analytics').RankingReferrerVisits>({
    queryKey: ['ranking-by-referrers', org_id, type, params, removeSpaceFilters],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${org_id}/analytics/referrer-rankings`,
        {
          params: {
            type,
            date_range: params.date_range,
            exclude_bot: params.exclude_bot,
            tag_ids: params.tag_ids,
            tp_ids: params.tp_ids,
            collection_ids: params.collection_ids,
            utm_source_values: params.utm_source_values,
            utm_medium_values: params.utm_medium_values,
            utm_campaign_values: params.utm_campaign_values,
            interaction_types: params.interaction_types,
            removeSpaceFilters,
          },
        }
      )
      return data.data
    },
    enabled: !!org_id && !!type,
  })
}
