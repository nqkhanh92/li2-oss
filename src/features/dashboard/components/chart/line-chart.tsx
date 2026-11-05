// import { TouchPointAnalytics } from "@/app/api/organizations/[org_id]/campaigns/[id]/touch-points/[touch_point_id]/analytics/route";
import { EmptySection } from '@/shared/components/customize/empty-section'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis } from 'recharts'
type TouchPointAnalytics = any

type Props = {
  data?: TouchPointAnalytics['by_time']
  isLoading: boolean
  label: string
}
export const AnalyticLineChart = ({ data, isLoading, label }: Props) => {
  const [selectedRange, setSelectedRange] =
    useState<keyof TouchPointAnalytics['by_time']>('last_7_days')
  const chartData = useMemo(() => {
    const currentData = data?.[selectedRange]
    // return (
    //   currentData?.dates?.map((label, index) => ({
    //     label,
    //     value: currentData?.counts?.[index],
    //   })) || []
    // );
    return []
  }, [data, selectedRange])
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Select
          // value={selectedRange}
          onValueChange={(value: any) => {
            setSelectedRange(value)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_7_days">Last 7 days</SelectItem>
            <SelectItem value="last_30_days">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <Skeleton className="w-full h-64 my-4" />
      ) : (
        <div>
          {chartData?.length === 0 ? (
            <EmptySection />
          ) : (
            <ChartContainer
              // id={id}
              config={{}}
              className="mx-auto aspect-square w-full h-[300px]"
            >
              <LineChart
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={true} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickSize={12}
                  tickFormatter={(value) => value}
                  minTickGap={32}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      hideLabel
                      formatter={(value) => `${label}: ${value}`}
                    />
                  }
                />
                <Line
                  dataKey="value"
                  type="linear"
                  fill="var(--chart-1)"
                  fillOpacity={0.4}
                  stroke="var(--chart-1)"
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      )}
    </div>
  )
}
