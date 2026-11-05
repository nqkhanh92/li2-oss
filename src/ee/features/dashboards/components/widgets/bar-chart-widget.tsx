'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import type { WidgetDataResult } from '../../types'
import { WIDGET_TOOLTIP_STYLE, WIDGET_EMPTY_CLASS, CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_COLOR } from './shared'

export function BarChartWidget({ data }: { data: WidgetDataResult }) {
  if (data.rows.length === 0) {
    return <div className={WIDGET_EMPTY_CLASS}>—</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
          axisLine={false}
          tickLine={false}
          width={100}
          tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 16)}...` : v}
        />
        <Tooltip contentStyle={WIDGET_TOOLTIP_STYLE} />
        <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
