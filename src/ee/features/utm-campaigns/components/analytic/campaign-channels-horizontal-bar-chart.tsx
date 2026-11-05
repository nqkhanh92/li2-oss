'use client'

import * as React from 'react'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
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

export function CampaignChannelsHorizontalBarChart({ data, orgId }: Props) {
  const { t } = useTranslation(['dashboard', 'analytic'])
  const { data: channelDropdown } = useGetCampaignChannelDropdown(orgId)

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

  // Calculate totals
  const totalVisits = React.useMemo(() => {
    return data.reduce((sum, channel) => sum + channel.visits, 0)
  }, [data])

  // Transform data for visits chart
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

  // Chart config for visits
  const visitsChartConfig = React.useMemo(() => {
    return visitsChartData?.reduce((acc, item, index) => {
      acc[item.label] = {
        label: item.label,
        color: item.fill,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [visitsChartData]) satisfies ChartConfig

  const formatTooltipValue = (value: number, name: string) => {
    return [value.toLocaleString(), name]
  }

  return (
    <ChartContainer config={visitsChartConfig} className="h-full w-full">
      <BarChart
        data={visitsChartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
        barSize={60}
      >
        <CartesianGrid horizontal={true} vertical={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
          domain={[0, 'dataMax']}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
          width={70}
          tickFormatter={(value) =>
            visitsChartConfig[value as keyof typeof visitsChartConfig]?.label
          }
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0]
              const chartData = visitsChartData?.find((item) => item.label === data.payload.label)
              return (
                <div className="bg-background border rounded-md shadow-lg p-2">
                  <div className="font-medium">{data.payload.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.value.toLocaleString()} ({chartData?.percentage || '0'}%)
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          {visitsChartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
