'use client'

import { TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import React from 'react'

export function DashboardBarChart({ data }: { data: { name: string; count: number }[] }) {
  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      label: item.name,
      value: item.count,
      fill: `var(--chart-1)`,
    }))
  }, [data])
  const chartConfig = React.useMemo(() => {
    return chartData.reduce((acc, item) => {
      acc[item.label] = {
        label: item.label,
        color: `var(--chart-1)`,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [chartData]) satisfies ChartConfig
  return (
    <ChartContainer config={chartConfig} className="h-[calc(100%-2rem)] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          tickMargin={8}
          axisLine={false}
          minTickGap={32}
          tickFormatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="label" />} />
        <Bar
          dataKey="value"
          strokeWidth={2}
          radius={8}
          activeBar={({ ...props }) => {
            return (
              <Rectangle
                {...props}
                fillOpacity={0.8}
                stroke={props.payload.fill}
                strokeDasharray={4}
                strokeDashoffset={4}
              />
            )
          }}
        />
      </BarChart>
    </ChartContainer>
  )
}
