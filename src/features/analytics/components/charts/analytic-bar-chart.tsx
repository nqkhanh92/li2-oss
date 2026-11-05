'use client'

import { TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, XAxis } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import React from 'react'
const chartData = [
  { label: 'chrome', value: 187, fill: 'var(--color-chrome)' },
  { label: 'safari', value: 200, fill: 'var(--color-safari)' },
  { label: 'firefox', value: 275, fill: 'var(--color-firefox)' },
  { label: 'edge', value: 173, fill: 'var(--color-edge)' },
  { label: 'other', value: 90, fill: 'var(--color-other)' },
]

const chartConfig = {
  value: {
    label: 'Visitors',
  },
  chrome: {
    label: 'Chrome',
    color: 'var(--chart-1)',
  },
  safari: {
    label: 'Safari',
    color: 'var(--chart-2)',
  },
  firefox: {
    label: 'Firefox',
    color: 'var(--chart-3)',
  },
  edge: {
    label: 'Edge',
    color: 'var(--chart-4)',
  },
  other: {
    label: 'Other',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig

export function AnalyticBarChart({
  data,
  title,
}: {
  data: { name: string; count: number }[]
  title: string
}) {
  const chartData = React.useMemo(() => {
    return (
      data?.map((item, index) => ({
        label: item.name,
        value: item.count,
        fill: `url(#gradient-${index})`,
      })) || []
    )
  }, [data])

  const chartConfig = React.useMemo(() => {
    return chartData?.reduce((acc, item, index) => {
      acc[item.label] = {
        label: item.label,
        color: `var(--chart-${index + 1})`,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [chartData]) satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer>
        <BarChart accessibilityLayer data={chartData} responsive>
          <defs>
            {chartData.map((item, index) => (
              <linearGradient key={item.label} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--chart-${index + 1})`} stopOpacity={1} />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label}
          />
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const data = payload[0]
              const index = chartData.findIndex((item) => item.label === data.payload.label)
              const chartColor = `var(--chart-${index + 1})`
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{
                        background: `linear-gradient(180deg, ${chartColor} 0%, #FFF 100%)`,
                      }}
                    />
                    <div className="flex gap-1">
                      <span className="text-xs font-medium">{data.payload.label}</span>
                      <span className="text-xs text-muted-foreground">{data.value}</span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Bar
            dataKey="value"
            strokeWidth={2}
            radius={8}
            activeBar={({ ...props }) => {
              return (
                <Rectangle
                  {...props}
                  fillOpacity={0.8}
                  stroke="#000E29"
                  strokeDasharray={4}
                  strokeDashoffset={4}
                />
              )
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
