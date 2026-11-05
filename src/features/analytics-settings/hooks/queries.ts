'use client'

import { axiosApiInstance } from '@/shared/lib/axios'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { AutoEvent } from '../types/auto-event.types'

export interface DataCollectionRules {
  mode: 'exclude' | 'include'
  exclude_paths: string[]
  include_paths: string[]
}

export interface CustomScript {
  id: string
  name: string
  description: string
  script: string
  site_url: string
}

export interface AnalyticsFeatures {
  pageview_tracking: boolean
  click_tracking: boolean
  scroll_tracking: boolean
  form_tracking: boolean
  outbound_tracking: boolean
  session_recording: boolean
  visibility_tracking: boolean
}

export interface TrackingSettings {
  cookie_path: string
  cookie_domain: string | null
  session_timeout: number
  cookie_expires_in_days: number
}

export interface AnalyticsSettings {
  id: string
  organization_id: string
  publishable_key: string
  publishable_key_created_at: string
  allowed_hostnames: string[]
  auto_events: AutoEvent[]
  data_collection_rules: DataCollectionRules
  debug_mode_enabled: boolean
  custom_scripts: CustomScript[]
  features: AnalyticsFeatures | null
  outbound_domains: string[]
  tracking: TrackingSettings | null
  created_at: string
  updated_at: string
}

export interface DebugLog {
  id: string
  created_at: string
  organization_id: string
  request_id: string
  request_type: 'lead' | 'sale' | 'pageview' | 'interaction'
  request_payload: Record<string, any>
  response_status: number
  response_body: Record<string, any> | null
  ip: string
  user_agent: string
  referrer: string
  publishable_key: string
  batch_size: number
  error_message: string | null
  error_code: string | null
  client_type: 'publishable' | 'api'
  sdk_version?: string
}

export interface DebugLogsParams {
  page: number
  limit: number
  request_type?: string
  client_type?: string
  start_date?: string
  end_date?: string
}

export interface DebugLogsResponse {
  data: DebugLog[]
  total: number
  has_more: boolean
}

export interface BehaviorDebugStatus {
  pageview: boolean
  click: boolean
  scroll: boolean
  form: boolean
  session_recording: boolean
  site_url: string | null
}

export const useGetAnalyticsSettings = (org_id: string, suspense: boolean = false) => {
  if (suspense) {
    return useSuspenseQuery<AnalyticsSettings>({
      queryKey: ['organizations', org_id, 'analytics-settings'],
      queryFn: async () => {
        const { data } = await axiosApiInstance.get<{ data: AnalyticsSettings }>(
          `/organizations/${org_id}/analytics-settings`
        )
        return data.data
      },
    })
  }
  return useQuery<AnalyticsSettings>({
    queryKey: ['organizations', org_id, 'analytics-settings'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: AnalyticsSettings }>(
        `/organizations/${org_id}/analytics-settings`
      )
      return data.data
    },
  })
}

export const useGetDebugLogs = (
  org_id: string,
  params: DebugLogsParams,
  enabled: boolean = false
) => {
  return useQuery<DebugLogsResponse>({
    queryKey: ['organizations', org_id, 'debug-logs', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<DebugLogsResponse>(
        `/organizations/${org_id}/analytics-settings/debug-logs`,
        { params }
      )
      return data
    },
    refetchInterval: enabled ? 5000 : false, // Auto-refresh every 5s when enabled
    enabled,
  })
}
