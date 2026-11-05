/**
 * Prettify snake_case enum labels from RPC responses.
 * Only transforms lowercase snake_case values (e.g. "rage_click" → "Rage Click").
 * Leaves paths, domains, dates, and mixed-case strings untouched.
 */
export function formatLabel(label: string): string {
  if (/^[a-z][a-z0-9_]*$/.test(label)) {
    return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return label
}

export const CHART_GRID_COLOR = 'hsl(30 10% 90%)'
export const CHART_AXIS_COLOR = 'hsl(25 5% 55%)'
const CHART_BG_COLOR = 'hsl(30 20% 99%)'

export const WIDGET_TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 10,
  border: `1px solid ${CHART_GRID_COLOR}`,
  backgroundColor: CHART_BG_COLOR,
  boxShadow: '0 4px 12px -2px rgb(120 90 50 / 0.08)',
} as const

export const WIDGET_EMPTY_CLASS =
  'flex h-full items-center justify-center text-sm text-stone-400'

/** Warm, approachable chart palette — coral, amber, teal, sky, violet, rose, cyan, orange */
export const CHART_COLORS = [
  '#f97066', // coral-400
  '#fbbf24', // amber-400
  '#34d399', // emerald-400
  '#60a5fa', // blue-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#22d3ee', // cyan-400
  '#fb923c', // orange-400
] as const
