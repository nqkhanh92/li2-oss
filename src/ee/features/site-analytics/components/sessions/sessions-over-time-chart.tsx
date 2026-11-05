'use client'

import { useMemo } from 'react'
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { SessionDayData } from '../../types'

const chartConfig = {
  sessions: {
    label: 'Sessions',
    color: 'var(--chart-1)',
  },
  visitors: {
    label: 'Visitors',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

interface SessionsOverTimeChartProps {
  data: SessionDayData[]
  isLoading: boolean
}

export function SessionsOverTimeChart({ data, isLoading }: SessionsOverTimeChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }))
  }, [data])

  if (isLoading) return <Skeleton className="h-[220px] w-full" />

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: -10, right: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={32} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Line
            dataKey="sessions"
            type="monotone"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey="visitors"
            type="monotone"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
