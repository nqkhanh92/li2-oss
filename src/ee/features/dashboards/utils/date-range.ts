// Shared date range types and logic.
// Used by DateRangePicker (client), batch route (server), and DateOverride (types.ts).
// Do NOT add 'use client' here — this file is imported by API routes.

export type DatePreset = 'today' | 'last_7d' | 'last_30d' | 'last_90d' | 'custom'

export interface DateRangeConfig {
  preset: DatePreset
  from?: string // YYYY-MM-DD, only when preset === 'custom'
  to?: string   // YYYY-MM-DD, only when preset === 'custom'
}

export const DEFAULT_DATE_RANGE: DateRangeConfig = { preset: 'last_7d' }

export const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  last_7d: 'Last 7 days',
  last_30d: 'Last 30 days',
  last_90d: 'Last 90 days',
  custom: 'Custom',
}

export function resolveDateRange(config: DateRangeConfig): { date_from: string; date_to: string } {
  if (config.preset === 'custom' && config.from && config.to) {
    return {
      date_from: config.from + 'T00:00:00Z',
      date_to: config.to + 'T23:59:59.999Z',
    }
  }
  const to = new Date()
  const from = new Date()
  switch (config.preset) {
    case 'today':
      from.setHours(0, 0, 0, 0)
      break
    case 'last_7d':
      from.setDate(from.getDate() - 7)
      break
    case 'last_30d':
      from.setDate(from.getDate() - 30)
      break
    case 'last_90d':
      from.setDate(from.getDate() - 90)
      break
  }
  return { date_from: from.toISOString(), date_to: to.toISOString() }
}
