'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import type { WidgetDataResult } from '../../types'
import { WIDGET_TOOLTIP_STYLE, WIDGET_EMPTY_CLASS, CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_COLOR } from './shared'

const AREA_ACTIVE_DOT = { r: 4, strokeWidth: 0, fill: CHART_COLORS[0] } as const

export function LineChartWidget({ data }: { data: WidgetDataResult }) {
  if (data.rows.length === 0) {
    return <div className={WIDGET_EMPTY_CLASS}>—</div>
  }

  // Sort by label for time-series data
  const sorted = [...data.rows].sort((a, b) => a.label.localeCompare(b.label))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sorted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="widgetFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.15} />
            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
              const [y, m, d] = v.split('-').map(Number)
              return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', timeZone: 'UTC',
              })
            }
            return v
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip contentStyle={WIDGET_TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          fill="url(#widgetFill)"
          dot={false}
          activeDot={AREA_ACTIVE_DOT}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
