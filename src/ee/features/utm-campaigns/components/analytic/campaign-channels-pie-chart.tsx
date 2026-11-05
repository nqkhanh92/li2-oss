'use client'

import * as React from 'react'
import { Label, Pie, PieChart, Cell, Sector } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useTranslation } from 'react-i18next'
import { useGetCampaignChannelDropdown } from '../../hooks'

type ChannelData = {
  id: string | null
  visits: number
}

type Props = {
  data: ChannelData[]
  orgId: string
}

export function CampaignChannelsPieChart({ data, orgId }: Props) {
  const { t } = useTranslation(['dashboard', 'analytic'])
  const { data: channelDropdown } = useGetCampaignChannelDropdown(orgId)

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  // Get channel name from dropdown
  const getChannelName = (channelId: string | null) => {
    if (!channelId) return 'Unknown'
    const channel = channelDropdown?.find((ch) => ch.id === channelId)
    return channel?.name || channelId
  }

  const getChannelColor = (channelId: string | null) => {
    if (!channelId) return null
    const channel = channelDropdown?.find((ch) => ch.id === channelId)
    return channel?.color || null
  }

  // Calculate total
  const totalVisits = React.useMemo(() => {
    return data.reduce((sum, channel) => sum + channel.visits, 0)
  }, [data])

  // Transform data for chart
  const visitsChartData = React.useMemo(() => {
    const transformedData =
      data
        ?.sort((a, b) => b.visits - a.visits)
        ?.map((item, index) => ({
          label: getChannelName(item.id),
          value: item.visits,
          fill: getChannelColor(item.id) ?? `var(--chart-${index + 1})`,
          percentage: totalVisits > 0 ? ((item.visits / totalVisits) * 100).toFixed(1) : '0',
        })) || []

    if (transformedData.length > 6) {
      const othersData = transformedData.slice(5)
      const othersTotal = othersData.reduce((acc, curr) => acc + curr.value, 0)
      const othersPercentage =
        totalVisits > 0 ? ((othersTotal / totalVisits) * 100).toFixed(1) : '0'

      return transformedData.slice(0, 5).concat({
        label: 'Others',
        value: othersTotal,
        fill: 'var(--chart-6)',
        percentage: othersPercentage,
      })
    }
    return transformedData
  }, [data, channelDropdown, totalVisits])

  // Chart config
  const visitsChartConfig = React.useMemo(() => {
    return visitsChartData?.reduce((acc, item, index) => {
      acc[item.label] = {
        label: item.label,
        color: item.fill,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [visitsChartData]) satisfies ChartConfig

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    )
  }

  return (
    <ChartContainer config={visitsChartConfig} className="h-full w-full">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0]
              const chartData = visitsChartData?.find((item) => item.label === data.name)
              return (
                <div className="bg-background border rounded-md shadow-lg p-2">
                  <div className="font-medium">{data.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.value.toLocaleString()} ({chartData?.percentage || '0'}%)
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Pie
          data={visitsChartData}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="50%"
          strokeWidth={5}
          activeShape={renderActiveShape}
          onMouseEnter={(data, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
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
                      {totalVisits.toLocaleString()}
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
          content={<ChartLegendContent />}
        />
      </PieChart>
    </ChartContainer>
  )
}
