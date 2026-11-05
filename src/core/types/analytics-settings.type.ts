import { AutoEvent } from '@/features/analytics-settings/types/auto-event.types'

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

export const DEFAULT_ANALYTICS_FEATURES: AnalyticsFeatures = {
  pageview_tracking: true,
  click_tracking: true,
  scroll_tracking: true,
  form_tracking: true,
  outbound_tracking: false,
  session_recording: false,
  visibility_tracking: false,
}

export interface TrackingSettings {
  cookie_path: string
  cookie_domain: string | null
  session_timeout: number
  cookie_expires_in_days: number
}

export const DEFAULT_TRACKING_SETTINGS: TrackingSettings = {
  cookie_path: '/',
  cookie_domain: null,
  session_timeout: 1800,
  cookie_expires_in_days: 365,
}

export interface AnalyticsSettings {
  id: string
  created_at: string
  updated_at: string
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
}

export interface AnalyticsSettingsInsert {
  organization_id: string
  publishable_key: string
  publishable_key_created_at?: string
  allowed_hostnames?: string[]
  auto_events?: any
  data_collection_rules?: DataCollectionRules
}

export interface AnalyticsSettingsUpdate {
  publishable_key?: string
  publishable_key_created_at?: string
  allowed_hostnames?: string[]
  auto_events?: AutoEvent[]
  data_collection_rules?: DataCollectionRules
  debug_mode_enabled?: boolean
  custom_scripts?: CustomScript[]
  features?: AnalyticsFeatures
  outbound_domains?: string[]
  tracking?: TrackingSettings
}
