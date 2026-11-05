'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { WidgetDataResult } from '../../types'
import { WIDGET_TOOLTIP_STYLE, WIDGET_EMPTY_CLASS, CHART_COLORS, CHART_AXIS_COLOR } from './shared'

export function PieChartWidget({ data }: { data: WidgetDataResult }) {
  if (data.rows.length === 0) {
    return <div className={WIDGET_EMPTY_CLASS}>—</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data.rows}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="45%"
          innerRadius="40%"
          outerRadius="70%"
          strokeWidth={2}
          stroke={WIDGET_TOOLTIP_STYLE.backgroundColor}
        >
          {data.rows.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={WIDGET_TOOLTIP_STYLE} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: CHART_AXIS_COLOR }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
