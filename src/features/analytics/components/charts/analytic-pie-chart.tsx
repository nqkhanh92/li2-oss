'use client'

import * as React from 'react'
import { TrendingUp } from 'lucide-react'
import { Label, Pie, PieChart, ResponsiveContainer } from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { useTranslation } from 'react-i18next'
export function AnalyticPieChart({
  data,
  title,
  totalVisits,
}: {
  data: { name: string; count: number }[]
  title: string
  totalVisits?: number
}) {
  const totalNumbers = React.useMemo(() => {
    if (totalVisits) return totalVisits
    return data?.reduce((acc, curr) => acc + curr.count, 0)
  }, [data, totalVisits])
  const chartData = React.useMemo(() => {
    const transformedData =
      data
        ?.sort((a, b) => b.count - a.count)
        ?.map((item, index) => ({
          label: item.name,
          value: item.count,
          fill: `var(--chart-${index + 1})`,
        })) || []
    if (transformedData.length > 6) {
      return transformedData.slice(0, 5).concat({
        label: 'Others',
        value: transformedData.slice(5).reduce((acc, curr) => acc + curr.value, 0),
        fill: 'var(--chart-6)',
      })
    }
    return transformedData
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
  const { t } = useTranslation('dashboard')
  return (
    <ChartContainer config={chartConfig} className="h-[calc(100%-1rem)] w-full">
      <ResponsiveContainer>
        <PieChart responsive>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="50%"
            strokeWidth={5}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 24}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {totalNumbers.toLocaleString()}
                      </tspan>
                      <tspan x={viewBox.cx} y={viewBox.cy || 0} className="fill-muted-foreground">
                        {t('dashboard:performance_overview.total')}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
          <ChartLegend
            wrapperStyle={{ width: '100%' }}
            className="flex flex-wrap gap-2 max-h-[calc(2*24px+8px)] overflow-hidden justify-around"
            content={<ChartLegendContent nameKey="label" />}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
