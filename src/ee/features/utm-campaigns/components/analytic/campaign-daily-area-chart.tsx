'use client'

import * as React from 'react'
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useTranslation } from 'react-i18next'
import { useGetCampaignChannelDropdown } from '../../hooks'
import { DateRange } from 'react-day-picker'
import dayjs from '@/shared/lib/dayjs'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartTooltipContent,
  ChartLegendContent,
  ChartConfig,
} from '@/shared/components/ui/chart'

type ChannelDailyData = {
  date: string
  channelId: string
  totalVisits: number
  totalUniqueVisits: number
}

type Props = {
  data: ChannelDailyData[]
  orgId: string
  isLoading?: boolean
  dateRange?: DateRange
}

export function CampaignDailyAreaChart({ data, orgId, isLoading = false, dateRange }: Props) {
  const { t } = useTranslation(['dashboard', 'analytic'])
  const { data: channelDropdown } = useGetCampaignChannelDropdown(orgId)

  // Get channel name from dropdown
  const getChannelName = (channelId: string) => {
    const channel = channelDropdown?.find((ch) => ch.id === channelId)
    return channel?.name || channelId
  }

  // Get channel color from dropdown
  const getChannelColor = (channelId: string) => {
    const channel = channelDropdown?.find((ch) => ch.id === channelId)
    return channel?.color || null
  }

  // Get all unique channels for chart config
  const allChannels = React.useMemo(() => {
    const channels = new Set<string>()
    data?.forEach((item) => {
      channels.add(getChannelName(item.channelId))
    })
    return Array.from(channels)
  }, [data, channelDropdown])

  // Transform data for stacked bar chart - total visits
  const totalVisitsChartData = React.useMemo(() => {
    if (!data || data.length === 0) return []

    // Group by date and aggregate channel data
    const groupedByDate = data.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { date: item.date }
        // Initialize all channels to 0 for this date
        allChannels.forEach((channel) => {
          acc[item.date][channel] = 0
        })
      }
      const channelName = getChannelName(item.channelId)
      acc[item.date][channelName] = item.totalVisits
      return acc
    }, {} as Record<string, any>)

    // If we have date range and insufficient data, add placeholder dates
    if (dateRange?.from && dateRange?.to) {
      const startDate = dayjs(dateRange.from)
      const endDate = dayjs(dateRange.to)
      const totalDays = endDate.diff(startDate, 'day') + 1

      // If we have less than 70% of the expected dates, add placeholders
      const existingDates = Object.keys(groupedByDate)
      if (existingDates.length < totalDays * 0.7) {
        for (let i = 0; i < totalDays; i++) {
          const currentDate = startDate.add(i, 'day').format('YYYY-MM-DD')
          if (!groupedByDate[currentDate]) {
            groupedByDate[currentDate] = { date: currentDate }
            // Initialize all channels to 0 for this date
            allChannels.forEach((channel) => {
              groupedByDate[currentDate][channel] = 0
            })
          }
        }
      }
    }

    // Sort by date
    return Object.values(groupedByDate).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [data, channelDropdown, dateRange, allChannels])

  // Transform data for stacked bar chart - unique visits
  const uniqueVisitsChartData = React.useMemo(() => {
    if (!data || data.length === 0) return []

    // Group by date and aggregate channel data
    const groupedByDate = data.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { date: item.date }
        // Initialize all channels to 0 for this date
        allChannels.forEach((channel) => {
          acc[item.date][channel] = 0
        })
      }
      const channelName = getChannelName(item.channelId)
      acc[item.date][channelName] = item.totalUniqueVisits
      return acc
    }, {} as Record<string, any>)

    // If we have date range and insufficient data, add placeholder dates
    if (dateRange?.from && dateRange?.to) {
      const startDate = dayjs(dateRange.from)
      const endDate = dayjs(dateRange.to)
      const totalDays = endDate.diff(startDate, 'day') + 1

      // If we have less than 70% of the expected dates, add placeholders
      const existingDates = Object.keys(groupedByDate)
      if (existingDates.length < totalDays * 0.7) {
        for (let i = 0; i < totalDays; i++) {
          const currentDate = startDate.add(i, 'day').format('YYYY-MM-DD')
          if (!groupedByDate[currentDate]) {
            groupedByDate[currentDate] = { date: currentDate }
            // Initialize all channels to 0 for this date
            allChannels.forEach((channel) => {
              groupedByDate[currentDate][channel] = 0
            })
          }
        }
      }
    }

    // Sort by date
    return Object.values(groupedByDate).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [data, channelDropdown, dateRange, allChannels])

  // Chart config for total visits
  const totalVisitsChartConfig = React.useMemo(() => {
    return allChannels.reduce((acc, channelName, index) => {
      const channelId = channelDropdown?.find((ch) => ch.name === channelName)?.id || ''
      const color = getChannelColor(channelId) || '#8884d8'
      acc[channelName] = {
        label: channelName,
        color: color,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [allChannels, channelDropdown]) satisfies ChartConfig

  // Chart config for unique visits
  const uniqueVisitsChartConfig = React.useMemo(() => {
    return allChannels.reduce((acc, channelName, index) => {
      const channelId = channelDropdown?.find((ch) => ch.name === channelName)?.id || ''
      const color = getChannelColor(channelId) || '#8884d8'
      acc[channelName] = {
        label: channelName,
        color: color,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [allChannels, channelDropdown]) satisfies ChartConfig

  // Debug log
  console.log('Chart Data Debug:', {
    hasData: !!data && data.length > 0,
    totalVisitsData: totalVisitsChartData,
    uniqueVisitsData: uniqueVisitsChartData,
    channels: allChannels,
  })

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center border border-red-500 p-4">
        <div className="text-center">
          <p className="font-bold text-red-500">NO DATA TO DISPLAY</p>
          <p className="text-sm">Data structure: {JSON.stringify(data?.slice(0, 1))}</p>
        </div>
      </div>
    )
  }

  const formatDate = (date: string) => dayjs(date).format('MMM D')

  return (
    <Tabs defaultValue="total" className="w-full h-full flex flex-col">
      <TabsList className="bg-transparent border-none outline-hidden gap-2 p-0 mb-4">
        <TabsTrigger
          value="total"
          className="px-3 py-1.5 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:shadow-none"
        >
          {t('dashboard:performance_overview.total')}
        </TabsTrigger>
        <TabsTrigger
          value="unique"
          className="px-3 py-1.5 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:shadow-none"
        >
          {t('dashboard:performance_overview.unique')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="total" className="flex-1 mt-0">
        <ChartContainer config={totalVisitsChartConfig} className="h-full w-full">
          <AreaChart
            accessibilityLayer
            data={totalVisitsChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <defs>
              {allChannels.map((channelName) => {
                const channelId = channelDropdown?.find((ch) => ch.name === channelName)?.id || ''
                const color = getChannelColor(channelId) || '#8884d8'
                return (
                  <linearGradient
                    key={channelName}
                    id={`fill-${channelName.toLowerCase().replace(/\s+/g, '')}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                )
              })}
            </defs>
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
              tickMargin={10}
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
              content={<ChartTooltipContent labelFormatter={formatDate} indicator="dot" />}
            />
            {allChannels.map((channelName) => {
              const channelId = channelDropdown?.find((ch) => ch.name === channelName)?.id || ''
              const color = getChannelColor(channelId) || '#8884d8'
              return (
                <Area
                  key={channelName}
                  dataKey={channelName}
                  type="bump"
                  fill={`url(#fill-${channelName.toLowerCase().replace(/\s+/g, '')})`}
                  stroke={color}
                />
              )
            })}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </TabsContent>

      <TabsContent value="unique" className="flex-1 mt-0">
        <ChartContainer config={uniqueVisitsChartConfig} className="h-full w-full">
          <AreaChart
            accessibilityLayer
            data={uniqueVisitsChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <defs>
              {allChannels.map((channelName) => {
                const channelId = channelDropdown?.find((ch) => ch.name === channelName)?.id || ''
                const color = getChannelColor(channelId) || '#8884d8'
                return (
                  <linearGradient
                    key={channelName}
                    id={`fill-${channelName.toLowerCase().replace(/\s+/g, '')}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                )
              })}
            </defs>
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
              tickMargin={10}
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
              content={<ChartTooltipContent labelFormatter={formatDate} indicator="dot" />}
            />
            {allChannels.map((channelName) => {
              const channelId = channelDropdown?.find((ch) => ch.name === channelName)?.id || ''
              const color = getChannelColor(channelId) || '#8884d8'
              return (
                <Area
                  key={channelName}
                  dataKey={channelName}
                  type="bump"
                  fill={`url(#fill-${channelName.toLowerCase().replace(/\s+/g, '')})`}
                  stroke={color}
                />
              )
            })}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </TabsContent>
    </Tabs>
  )
}
