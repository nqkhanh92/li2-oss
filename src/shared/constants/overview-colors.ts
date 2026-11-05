/**
 * Chart line colors for data visualization (Recharts SVG strokes).
 * UI chrome should use design system tokens (text-primary, bg-muted, etc.) directly.
 */
export const OVERVIEW_CHART_COLORS = {
  clicks: '#7c3aed',     // violet-600
  pageviews: '#0284c7',  // sky-600
  conversions: '#16a34a', // green-600
} as const

/** Quota bar status colors (plan footer). */
export const QUOTA_STATUS_COLORS = {
  ok: '#16a34a',      // green-600
  warning: '#d97706', // amber-600
  danger: '#dc2626',  // red-600
} as const
