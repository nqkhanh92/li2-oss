import { axiosApiInstance } from '@/shared/lib/axios'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  AudienceListResponse,
  ContentView,
  CustomerCountry,
  CustomerProfile,
  DeviceActivity,
} from '../types'
import { SearchFilterPagination } from '@/shared/types'

export interface JourneyNode {
  /** `artifact_view` = đã mở một nội dung; xem `conversion.service.ts` cho vì sao nó phải có. */
  type: 'first_visit' | 'lead' | 'sale' | 'session' | 'artifact_view'
  date: string
  touchPoint: string | null
  data: {
    eventName?: string
    amount?: number | null
    currency?: string | null
    referrer?: string | null
    linkedLeadId?: string | null
    metadata?: Record<string, any>
    // session-specific
    sessionId?: string
    durationMs?: number | null
    entryPage?: string | null
    exitPage?: string | null
    isBounce?: boolean
    browser?: string | null
    os?: string | null
    deviceType?: string | null
    pageviewCount?: number
    hasRecording?: boolean
    // artifact_view-specific
    artifactId?: string
    artifactName?: string
    serveToken?: string | null
    /** Tổng số lần mở. `artifact_views` không giữ từng lần mở riêng lẻ. */
    openCount?: number
    lastViewedAt?: string | null
  }
}

export interface SessionPageview {
  id: string
  page_path: string
  page_url: string
  page_title: string | null
  event_name: string | null
  time_on_page: number | null
  timestamp: string
}

export interface SessionDetail {
  session: {
    session_id: string
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
    duration_ms: number | null
    page_count: number | null
    entry_page: string | null
    exit_page: string | null
    is_bounce: boolean | null
  }
  pageviews: SessionPageview[]
}

export interface JourneyMetrics {
  timeToLead: number | null
  timeToSale: number | null
  totalEvents: number
}

/**
 * First visit information from visits table
 * Includes device, location, and traffic source data
 */
export interface FirstVisitInfo {
  id: string
  date: string
  referrer: string | null
  rawReferrer: string | null
  userAgent: string | null
  os: string | null
  platform: string | null
  city: string | null
  country: string | null
  region: string | null
  utmTags: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  } | null
  interactionType: string | null
}

export interface CustomerJourney {
  timeline: JourneyNode[]
  metrics: JourneyMetrics
  firstVisit: FirstVisitInfo | null
}

/** Tập khán giả: người có email + thiết bị ẩn danh. Xem `AudienceMember`. */
export const useGetAudience = (org_id: string, params: SearchFilterPagination) => {
  return useQuery<AudienceListResponse>({
    queryKey: ['organizations', org_id, 'customers', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<AudienceListResponse>(
        `/organizations/${org_id}/customers`,
        { params }
      )
      return data
    },
  })
}

/** Nội dung một khách có email đã mở. */
export const useGetContentViews = (org_id: string, customer_id: string | null) => {
  return useQuery<ContentView[]>({
    queryKey: ['organizations', org_id, 'customers', customer_id, 'content-views'],
    queryFn: async () => {
      const { data: response } = await axiosApiInstance.get<{ data: ContentView[] }>(
        `/organizations/${org_id}/customers/${customer_id}/content-views`
      )
      return response.data
    },
    enabled: !!org_id && !!customer_id,
  })
}

/** Lịch sử truy cập của một thiết bị ẩn danh, nhóm theo `fp`. */
export const useGetDeviceActivity = (org_id: string, fp: string | null) => {
  return useQuery<DeviceActivity | null>({
    queryKey: ['organizations', org_id, 'customers', 'devices', fp],
    queryFn: async () => {
      const { data: response } = await axiosApiInstance.get<{ data: DeviceActivity | null }>(
        `/organizations/${org_id}/customers/devices/${encodeURIComponent(fp!)}`
      )
      return response.data
    },
    enabled: !!org_id && !!fp,
  })
}

export const useGetCustomerById = (org_id: string, customer_id: string | null) => {
  return useQuery<CustomerProfile>({
    queryKey: ['organizations', org_id, 'customers', customer_id],
    queryFn: async () => {
      const { data: response } = await axiosApiInstance.get<{ data: CustomerProfile }>(
        `/organizations/${org_id}/customers/${customer_id}`
      )
      return response.data
    },
    enabled: !!org_id && !!customer_id,
  })
}

export const useGetCustomerJourney = (org_id: string, customer_id: string | null) => {
  return useQuery<CustomerJourney>({
    queryKey: ['organizations', org_id, 'customers', customer_id, 'journey'],
    queryFn: async () => {
      const { data: response } = await axiosApiInstance.get<{ data: CustomerJourney }>(
        `/organizations/${org_id}/customers/${customer_id}/journey`
      )
      return response.data
    },
    enabled: !!org_id && !!customer_id,
  })
}

export interface CustomerConversionEvent {
  id: string
  event_name: string
  event_type: 'lead' | 'sale'
  amount: number | null
  currency: string | null
  created_at: string
  touch_points: { id: string; name: string } | null
  lead_event: { id: string; event_name: string; created_at: string } | null
  metadata?: Record<string, any>
}

export const useGetSessionPageviews = (
  org_id: string,
  customer_id: string,
  session_id: string,
  isExpanded: boolean
) => {
  return useQuery<SessionDetail>({
    queryKey: ['organizations', org_id, 'customers', customer_id, 'sessions', session_id, 'pageviews'],
    queryFn: async () => {
      const { data: response } = await axiosApiInstance.get<{ data: SessionDetail }>(
        `/organizations/${org_id}/customers/${customer_id}/sessions/${session_id}/pageviews`
      )
      return response.data
    },
    enabled: !!org_id && !!customer_id && !!session_id && isExpanded,
  })
}

export const useGetCustomerConversions = (org_id: string, customer_id: string) => {
  return useQuery<CustomerConversionEvent[]>({
    queryKey: ['organizations', org_id, 'customers', customer_id, 'conversions'],
    queryFn: async () => {
      const { data: response } = await axiosApiInstance.get<{ data: CustomerConversionEvent[] }>(
        `/organizations/${org_id}/customers/${customer_id}/conversions`
      )
      return response.data
    },
    enabled: !!org_id && !!customer_id,
  })
}

// Phase 2: Country filter hook
export const useGetCustomerCountries = (org_id: string) => {
  return useQuery<CustomerCountry[]>({
    queryKey: ['organizations', org_id, 'customers', 'countries'],
    queryFn: async () => {
      const { data: response } = await axiosApiInstance.get<{ data: CustomerCountry[] }>(
        `/organizations/${org_id}/customers/countries`
      )
      return response.data
    },
    enabled: !!org_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

// Phase 2: Export customers mutation
export const useExportCustomers = (org_id: string) => {
  return useMutation({
    mutationFn: async () => {
      const response = await axiosApiInstance.get(`/organizations/${org_id}/customers/export`, {
        responseType: 'blob',
      })
      return response.data
    },
    onSuccess: (blob) => {
      // Trigger file download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
  })
}
