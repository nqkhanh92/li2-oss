'use client'

import { Cell, Label, Pie, PieChart } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/shared/components/ui/chart'
import { WidgetCard } from './widget-card'

// Shared donut for the deep-link breakdown widgets (currently the platform split).
// `labelFor` maps the raw enum key (ios, universal_link, …) to a friendly i18n label;
// the raw key stays in the tooltip for analysts. Empty slice → WidgetCard empty state.
export function DeepLinkPie({
  title,
  data,
  labelFor,
  emptyLabel,
}: {
  title: string
  data: Record<string, number>
  labelFor: (key: string) => string
  emptyLabel: string
}) {
  const entries = Object.entries(data || {})
  const total = entries.reduce((sum, [, v]) => sum + v, 0)

  const chartData = entries
    .map(([key, value], index) => ({
      key,
      label: labelFor(key),
      value,
      fill: `var(--chart-${(index % 6) + 1})`,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const config = chartData.reduce(
    (acc, item) => {
      acc[item.label] = { label: item.label, color: item.fill }
      return acc
    },
    {} as Record<string, { label: string; color: string }>
  ) satisfies ChartConfig

  return (
    <WidgetCard title={title} isEmpty={total === 0} emptyLabel={emptyLabel}>
      <ChartContainer config={config} className="h-full w-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const row = payload[0].payload as (typeof chartData)[number]
                return (
                  <div className="bg-background rounded-md border p-2 shadow-lg">
                    <div className="font-medium">{row.label}</div>
                    <div className="text-muted-foreground text-sm">
                      {row.value.toLocaleString()} ({row.percentage}%) · {row.key}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            strokeWidth={4}
          >
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy || 0}
                        className="fill-foreground text-2xl font-bold"
                      >
                        {total.toLocaleString()}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
          <ChartLegend
            content={<ChartLegendContent nameKey="label" />}
            className="flex flex-wrap justify-center gap-2"
          />
        </PieChart>
      </ChartContainer>
    </WidgetCard>
  )
}
