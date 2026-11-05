// import { TouchPointAnalytics } from "@/app/api/organizations/[org_id]/campaigns/[id]/touch-points/[touch_point_id]/analytics/route";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'

type TouchPointAnalytics = any

type ComparisonData = {
  label: string
  data: TouchPointAnalytics['by_time']
  id: string
}[]
type Props = {
  data?: ComparisonData
  isLoading: boolean
  label: string
}
export const ComparisonLineChart = ({ data, isLoading, label }: Props) => {
  const [selectedRange, setSelectedRange] =
    useState<keyof TouchPointAnalytics['by_time']>('last_7_days')

  const xAxis = useMemo(() => {
    return Array.from(
      new Set(
        data
          ?.map((item) => item.data?.[selectedRange]?.dates)
          ?.filter(Boolean)
          ?.flat() || []
      )
    )
  }, [data, selectedRange])

  const chartConfig: ChartConfig = useMemo(() => {
    return (
      data?.reduce((acc, item, index) => {
        acc[item.id] = {
          label: item.label,
          color: `var(--chart-${index + 1})`,
        }
        return acc
      }, {} as ChartConfig) || {}
    )
  }, [data])

  const chartData = useMemo(() => {
    return xAxis.map((label) => {
      return data?.reduce(
        (acc, item) => {
          return {
            ...acc,
            [item.id]: item.data?.[selectedRange]?.counts?.[xAxis.indexOf(label)] ?? 0,
          }
        },
        { label } as Record<string, any>
      )
    })
  }, [data, selectedRange])
  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full h-[300px]">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value}
          />
          {data?.map((item, index) => (
            <Line
              key={item.id}
              dataKey={item.id}
              type="monotone"
              stroke={`var(--chart-${index + 1})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
