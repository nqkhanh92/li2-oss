import { disabledFeatures } from '@/shared/constants/disabled-features'
import type { DataSource, Visualization } from '../types'

export interface DataSourceSpec {
  label: string
  proOnly: boolean
  metrics: { value: string; label: string }[]
  dimensions: { value: string; label: string }[]
  filterFields: { value: string; label: string; ops: ('=' | '!=' | 'contains')[] }[]
  suggestedViz: Record<string, Visualization>
}

export const DATA_SOURCE_CONFIG: Record<DataSource, DataSourceSpec> = {
  visits: {
    label: 'Link Clicks',
    proOnly: false,
    metrics: [
      { value: 'count', label: 'Total Clicks' },
      { value: 'unique_count', label: 'Unique Clicks' },
    ],
    dimensions: [
      { value: 'none', label: 'None (Single Value)' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'channel', label: 'Channel' },
      { value: 'country', label: 'Country' },
      { value: 'device', label: 'Device' },
      { value: 'os', label: 'OS' },
      { value: 'referrer', label: 'Referrer' },
      { value: 'touch_point', label: 'Touch Point' },
      { value: 'utm_source', label: 'UTM Source' },
      { value: 'utm_medium', label: 'UTM Medium' },
      { value: 'utm_campaign', label: 'UTM Campaign' },
    ],
    filterFields: [
      { value: 'channel', label: 'Channel', ops: ['=', '!='] },
      { value: 'country', label: 'Country', ops: ['=', '!=', 'contains'] },
      { value: 'device', label: 'Device', ops: ['=', '!='] },
      { value: 'os', label: 'OS', ops: ['=', '!='] },
      { value: 'referrer', label: 'Referrer', ops: ['=', '!=', 'contains'] },
      { value: 'touch_point', label: 'Touch Point', ops: ['=', '!='] },
      { value: 'utm_source', label: 'UTM Source', ops: ['=', '!=', 'contains'] },
      { value: 'utm_medium', label: 'UTM Medium', ops: ['=', '!=', 'contains'] },
      { value: 'utm_campaign', label: 'UTM Campaign', ops: ['=', '!=', 'contains'] },
    ],
    suggestedViz: {
      none: 'number', day: 'line', week: 'line', month: 'bar',
      channel: 'pie', country: 'table', device: 'pie',
      os: 'pie', referrer: 'bar', touch_point: 'table',
      utm_source: 'bar', utm_medium: 'pie', utm_campaign: 'table',
    },
  },
  pageviews: {
    label: 'Pageviews',
    proOnly: true,
    metrics: [
      { value: 'count', label: 'Total Pageviews' },
      { value: 'unique_visitors', label: 'Unique Visitors' },
      { value: 'sessions', label: 'Sessions' },
    ],
    dimensions: [
      { value: 'none', label: 'None (Single Value)' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'page_path', label: 'Page' },
      { value: 'referrer', label: 'Referrer' },
      { value: 'country', label: 'Country' },
      { value: 'device', label: 'Device' },
      { value: 'utm_source', label: 'UTM Source' },
      { value: 'utm_medium', label: 'UTM Medium' },
      { value: 'utm_campaign', label: 'UTM Campaign' },
    ],
    filterFields: [
      { value: 'page_path', label: 'Page', ops: ['=', '!=', 'contains'] },
      { value: 'referrer', label: 'Referrer', ops: ['=', '!=', 'contains'] },
      { value: 'country', label: 'Country', ops: ['=', '!=', 'contains'] },
      { value: 'device', label: 'Device', ops: ['=', '!='] },
      { value: 'utm_source', label: 'UTM Source', ops: ['=', '!=', 'contains'] },
      { value: 'utm_medium', label: 'UTM Medium', ops: ['=', '!=', 'contains'] },
      { value: 'utm_campaign', label: 'UTM Campaign', ops: ['=', '!=', 'contains'] },
    ],
    suggestedViz: {
      none: 'number', day: 'line', week: 'line', month: 'bar',
      page_path: 'table', referrer: 'bar', country: 'table',
      device: 'pie', utm_source: 'bar', utm_medium: 'pie', utm_campaign: 'table',
    },
  },
  events: {
    label: 'Events',
    proOnly: true,
    metrics: [
      { value: 'count', label: 'Event Count' },
      { value: 'unique_visitors', label: 'Unique Visitors' },
      { value: 'sessions', label: 'Sessions' },
    ],
    dimensions: [
      { value: 'none', label: 'None (Single Value)' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'event_name', label: 'Event Name' },
      { value: 'page_path', label: 'Page' },
      { value: 'country', label: 'Country' },
      { value: 'device', label: 'Device' },
      { value: 'referrer', label: 'Referrer' },
      { value: 'utm_source', label: 'UTM Source' },
      { value: 'utm_medium', label: 'UTM Medium' },
      { value: 'utm_campaign', label: 'UTM Campaign' },
    ],
    filterFields: [
      { value: 'event_name', label: 'Event Name', ops: ['=', '!=', 'contains'] },
      { value: 'event_category', label: 'Event Category', ops: ['=', '!='] },
      { value: 'page_path', label: 'Page', ops: ['=', '!=', 'contains'] },
      { value: 'country', label: 'Country', ops: ['=', '!=', 'contains'] },
      { value: 'device', label: 'Device', ops: ['=', '!='] },
      { value: 'referrer', label: 'Referrer', ops: ['=', '!=', 'contains'] },
      { value: 'utm_source', label: 'UTM Source', ops: ['=', '!=', 'contains'] },
      { value: 'utm_medium', label: 'UTM Medium', ops: ['=', '!=', 'contains'] },
      { value: 'utm_campaign', label: 'UTM Campaign', ops: ['=', '!=', 'contains'] },
    ],
    suggestedViz: {
      none: 'number', day: 'line', week: 'line', month: 'bar',
      event_name: 'bar', page_path: 'table', country: 'table',
      device: 'pie', referrer: 'bar', utm_source: 'bar',
      utm_medium: 'pie', utm_campaign: 'table',
    },
  },
  interactions: {
    label: 'Interactions',
    proOnly: true,
    metrics: [
      { value: 'count', label: 'Interaction Count' },
      { value: 'unique_visitors', label: 'Unique Visitors' },
      { value: 'unique_sessions', label: 'Unique Sessions' },
    ],
    dimensions: [
      { value: 'none', label: 'None (Single Value)' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'interaction_type', label: 'Interaction Type' },
      { value: 'page_path', label: 'Page Path' },
      { value: 'device_type', label: 'Device' },
      { value: 'country', label: 'Country' },
      { value: 'element_tag', label: 'Element Type' },
    ],
    filterFields: [
      { value: 'interaction_type', label: 'Interaction Type', ops: ['=', '!='] },
      { value: 'page_path', label: 'Page Path', ops: ['=', '!=', 'contains'] },
      { value: 'device_type', label: 'Device', ops: ['=', '!='] },
      { value: 'country', label: 'Country', ops: ['=', '!=', 'contains'] },
      { value: 'element_tag', label: 'Element Type', ops: ['=', '!='] },
    ],
    suggestedViz: {
      none: 'number', day: 'line', week: 'line', month: 'bar',
      interaction_type: 'pie', page_path: 'table', device_type: 'pie',
      country: 'table', element_tag: 'bar',
    },
  },
  conversions: {
    label: 'Conversions',
    proOnly: true,
    metrics: [
      { value: 'count', label: 'Total Events' },
      { value: 'lead_count', label: 'Leads' },
      { value: 'sale_count', label: 'Sales' },
      { value: 'revenue', label: 'Revenue' },
    ],
    dimensions: [
      { value: 'none', label: 'None (Single Value)' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'event_type', label: 'Event Type' },
      { value: 'event_name', label: 'Event Name' },
      { value: 'touch_point', label: 'Touch Point' },
      { value: 'referrer', label: 'Referrer' },
      { value: 'utm_source', label: 'UTM Source' },
      { value: 'utm_medium', label: 'UTM Medium' },
      { value: 'utm_campaign', label: 'UTM Campaign' },
    ],
    filterFields: [
      { value: 'event_type', label: 'Event Type', ops: ['=', '!='] },
      { value: 'event_name', label: 'Event Name', ops: ['=', '!=', 'contains'] },
      { value: 'touch_point_id', label: 'Touch Point', ops: ['=', '!='] },
      { value: 'referrer', label: 'Referrer', ops: ['=', '!=', 'contains'] },
    ],
    suggestedViz: {
      none: 'number', day: 'line', week: 'line', month: 'bar',
      event_type: 'pie', event_name: 'bar', touch_point: 'table',
      referrer: 'bar', utm_source: 'bar', utm_medium: 'pie', utm_campaign: 'table',
    },
  },
}

// Sources a user may pick from. Lookups by key still resolve every source, so a widget
// saved before a flag was switched on keeps its config instead of crashing the renderer.
export const AVAILABLE_DATA_SOURCES: DataSource[] = (
  Object.keys(DATA_SOURCE_CONFIG) as DataSource[]
).filter((source) => {
  if (source === 'visits') return true
  if (source === 'conversions') return !disabledFeatures.ATTRIBUTION
  return !disabledFeatures.BEHAVIOR_ANALYTICS
})
