import { axiosApiInstance } from '@/shared/lib/axios'
import { useQuery } from '@tanstack/react-query'
import { DateRange } from 'react-day-picker'
import { ConversionEvent, ConversionStats, FunnelData, FunnelFilters } from '../types'
import { SearchFilterPagination } from '@/shared/types'
import { ConversionFilterParams } from '@/core/types/conversions'

export interface TouchpointAttribution {
  touchPointId: string
  touchPointName: string
  leadCount: number
  saleCount: number
  conversionRate: number
  revenue: number
}

export interface AttributionResponse {
  touchpoints: TouchpointAttribution[]
  totals: {
    leads: number
    sales: number
    revenue: number
  }
  currency: string
}

interface ConversionListResponse<T> {
  data: T[]
  rowCount: number
}

export const useGetConversions = (org_id: string, params: SearchFilterPagination) => {
  return useQuery<ConversionListResponse<ConversionEvent>>({
    queryKey: ['organizations', org_id, 'conversions', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<ConversionListResponse<ConversionEvent>>(
        `/organizations/${org_id}/conversions`,
        { params }
      )
      return data
    },
  })
}

export const useGetConversionStats = (org_id: string, params?: ConversionFilterParams) => {
  return useQuery<{ data: ConversionStats }>({
    queryKey: ['organizations', org_id, 'conversions', 'stats', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: ConversionStats }>(
        `/organizations/${org_id}/conversions/stats`,
        {
          params,
        }
      )
      return data
    },
  })
}

export const useGetFunnelData = (org_id: string, params?: ConversionFilterParams) => {
  return useQuery<{ data: FunnelData }>({
    queryKey: ['organizations', org_id, 'conversions', 'funnel', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: FunnelData }>(
        `/organizations/${org_id}/conversions/funnel`,
        { params }
      )
      return data
    },
    enabled: !!org_id,
  })
}

export const useGetTouchpointAttribution = (
  org_id: string,
  dateRange?: DateRange,
  touchPointId?: string,
  limit?: number
) => {
  return useQuery<{ data: AttributionResponse }>({
    queryKey: [
      'organizations',
      org_id,
      'conversions',
      'attribution',
      dateRange,
      touchPointId,
      limit,
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (dateRange?.from) queryParams.set('startDate', dateRange.from.toISOString())
      if (dateRange?.to) queryParams.set('endDate', dateRange.to.toISOString())
      if (touchPointId && touchPointId !== 'all') queryParams.set('touchPointId', touchPointId)
      if (limit) queryParams.set('limit', limit.toString())

      const queryString = queryParams.toString()
      const url = `/organizations/${org_id}/conversions/attribution${queryString ? `?${queryString}` : ''}`

      const { data } = await axiosApiInstance.get<{ data: AttributionResponse }>(url)
      return data
    },
    enabled: !!org_id,
  })
}

export interface TouchpointAttributionFull {
  touchPointId: string
  touchPointName: string
  touchPointShortUrl: string | null
  visitCount: number
  uniqueVisitCount: number
  leadCount: number
  saleCount: number
  conversionRate: number
  revenue: number
}

export interface AttributionFullResponse {
  touchpoints: TouchpointAttributionFull[]
  totals: {
    visits: number
    uniqueVisits: number
    leads: number
    sales: number
    revenue: number
  }
  currency: string
}

export const useGetConversionEventNames = (org_id: string) => {
  return useQuery<{ data: string[] }>({
    queryKey: ['organizations', org_id, 'conversions', 'event-names'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: string[] }>(
        `/organizations/${org_id}/conversions/event-names`
      )
      return data
    },
    enabled: !!org_id,
  })
}

export const useGetConversionChannels = (org_id: string, enabled = false) => {
  return useQuery<{ data: string[] }>({
    queryKey: ['organizations', org_id, 'conversions', 'channels'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: string[] }>(
        `/organizations/${org_id}/conversions/channels`
      )
      return data
    },
    enabled: !!org_id && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export const useGetConversionUtmSources = (org_id: string, enabled = false) => {
  return useQuery<{ data: string[] }>({
    queryKey: ['organizations', org_id, 'conversions', 'utm-sources'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: string[] }>(
        `/organizations/${org_id}/conversions/utm-sources`
      )
      return data
    },
    enabled: !!org_id && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export const useGetTouchpointAttributionFull = (
  org_id: string,
  params?: ConversionFilterParams
) => {
  return useQuery<{ data: AttributionFullResponse }>({
    queryKey: ['organizations', org_id, 'conversions', 'attribution-full', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: AttributionFullResponse }>(
        `/organizations/${org_id}/conversions/attribution-full`,
        { params }
      )
      return data
    },
    enabled: !!org_id,
  })
}
