'use client'

import * as React from 'react'
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'

type ChannelDailyData = {
  date: string
  totalVisits: number
  totalUniqueVisits: number
}

type Props = {
  data: ChannelDailyData[]
  isLoading?: boolean
  dateRange?: any
}

export function ChannelDailyLineChart({ data, isLoading = false, dateRange }: Props) {
  const { t } = useTranslation('analytic')

  // Transform data for line chart
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return []

    // Sort by date
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // If we have date range and insufficient data, add placeholder dates
    if (dateRange?.from && dateRange?.to) {
      const startDate = dayjs(dateRange.from)
      const endDate = dayjs(dateRange.to)
      const totalDays = endDate.diff(startDate, 'day') + 1

      // If we have less than 70% of the expected dates, add placeholders
      if (sortedData.length < totalDays * 0.7) {
        const dataMap = new Map(sortedData.map((item) => [item.date, item]))
        const result = []

        for (let i = 0; i < totalDays; i++) {
          const currentDate = startDate.add(i, 'day').format('YYYY-MM-DD')
          result.push(
            dataMap.get(currentDate) || {
              date: currentDate,
              totalVisits: 0,
              totalUniqueVisits: 0,
            }
          )
        }

        return result
      }
    }

    return sortedData
  }, [data, dateRange])

  // Chart config for the two lines
  const chartConfig: ChartConfig = {
    totalVisits: {
      label: 'Total Visits',
      color: 'var(--chart-1)',
    },
    totalUniqueVisits: {
      label: 'Unique Visits',
      color: 'var(--chart-2)',
    },
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('MMM DD')
  }

  if (isLoading) {
    return (
      <div className="h-full w-full">
        <Skeleton className="h-full" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <EmptySection size="lg" title="NO DATA" description="" />
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 12,
          right: 12,
          top: 20,
          bottom: 80,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
          domain={[0, 'dataMax']}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent />}
          labelFormatter={formatDate}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
            fontSize: '12px',
          }}
        />
        <Line
          dataKey="totalVisits"
          type="monotone"
          stroke="var(--color-totalVisits)"
          strokeWidth={2}
          dot={false}
          name="Total Visits"
        />
        <Line
          dataKey="totalUniqueVisits"
          type="monotone"
          stroke="var(--color-totalUniqueVisits)"
          strokeWidth={2}
          dot={false}
          name="Unique Visits"
        />
      </LineChart>
    </ChartContainer>
  )
}
