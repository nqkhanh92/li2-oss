'use client'

import * as React from 'react'
import { Label, Pie, PieChart, ResponsiveContainer, Sector } from 'recharts'
import { ChartConfig, ChartContainer } from '@/shared/components/ui/chart'
import { cn } from '@/shared/lib/utils'

//@ts-ignore
import Animate from 'react-smooth'

const CHART_COLORS = [
  '#F36600', // Orange
  '#F7B713', // Yellow
  '#437EF7', // Blue
  '#11A5A5', // Dark cyan
  '#4125B9', // Purple
  '#B2D6DE', // Cyan
]

interface AnalyticDonutChartProps {
  data: { name: string; count: number }[]
  title: string
  totalVisits?: number
}

export function AnalyticDonutChart({ data, title, totalVisits }: AnalyticDonutChartProps) {
  const totalNumbers = React.useMemo(() => {
    if (totalVisits) return totalVisits
    return data?.reduce((acc, curr) => acc + curr.count, 0)
  }, [data, totalVisits])

  const listData = React.useMemo(() => {
    return (
      data
        ?.sort((a, b) => b.count - a.count)
        ?.map((item, index) => ({
          label: item.name,
          value: item.count,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        })) || []
    )
  }, [data])

  const chartData = React.useMemo(() => {
    if (listData.length > 6) {
      return listData.slice(0, 5).concat({
        label: 'Others',
        value: listData.slice(5).reduce((acc, curr) => acc + curr.value, 0),
        fill: CHART_COLORS[5],
      })
    }
    return listData
  }, [listData])

  const chartConfig = React.useMemo(() => {
    return chartData?.reduce(
      (acc, item) => {
        acc[item.label] = {
          label: item.label,
          color: item.fill,
        }
        return acc
      },
      {} as Record<string, { label: string; color: string }>
    )
  }, [chartData]) satisfies ChartConfig

  const maxBarWidth = React.useMemo(() => {
    if (listData.length === 0) return 0
    return Math.max(...listData.map((item) => item.value))
  }, [listData])

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  return (
    <div className="flex gap-2 md:gap-6 h-full w-full">
      <div
        className="shrink-0 relative overflow-visible"
        style={{ width: '190px', height: '190px' }}
      >
        <ChartContainer config={chartConfig} className="h-full w-full overflow-visible">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="90%"
                strokeWidth={0}
                shape={(props) => {
                  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
                  const isActive = activeIndex === props.index
                  return (
                    <Animate
                      duration={200}
                      from={{ radius: outerRadius }}
                      isActive={isActive}
                      to={{ radius: isActive ? outerRadius + 10 : outerRadius }}
                    >
                      {({ radius }: { radius: number }) => (
                        <Sector
                          cx={cx}
                          cy={cy}
                          onMouseEnter={() => setActiveIndex(props.index)}
                          onMouseLeave={() => setActiveIndex(null)}
                          innerRadius={innerRadius}
                          outerRadius={radius}
                          startAngle={startAngle}
                          endAngle={endAngle}
                          fill={fill}
                        />
                      )}
                    </Animate>
                  )
                }}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy || 0}
                            className="fill-[#000D27] text-[23px] font-bold"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            {totalNumbers.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 12}
                            className="fill-[#64748B] text-[9px]"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            Visitors
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="flex-1 flex flex-col min-w-[140px] overflow-y-auto gap-2 pr-1">
        {listData.map((item, index) => {
          const percentage = totalNumbers > 0 ? (item.value / totalNumbers) * 100 : 0
          const barWidth = maxBarWidth > 0 ? (item.value / maxBarWidth) * 100 : 0

          const chartIndex = listData.length > 6 && index >= 5 ? 5 : index

          return (
            <div
              key={index}
              className="relative h-7 min-h-7 cursor-pointer"
              onMouseEnter={() => {
                setActiveIndex(chartIndex)
              }}
              onMouseLeave={() => {
                setActiveIndex(null)
              }}
            >
              <div
                className={cn(
                  'absolute h-7 rounded left-0 top-0 transition-all duration-300 ease-out',
                  activeIndex === chartIndex ? 'opacity-20' : 'opacity-10'
                )}
                style={{
                  backgroundColor: item.fill,
                  width: `${barWidth}%`,
                }}
              />
              <div className="absolute flex items-center left-0 top-0 w-full h-7">
                <div className="flex flex-1 gap-3 items-center pl-3 pr-0 py-1 min-w-0">
                  <div
                    className="shrink-0 w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <div className="flex flex-1 gap-1.5 items-center min-w-0">
                    <p className="flex-1 text-[#334155] text-xs leading-4 font-normal overflow-ellipsis overflow-hidden whitespace-nowrap min-w-0">
                      {item.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end px-4 py-1 shrink-0">
                  <p className="text-[#334155] text-sm leading-5 font-normal flex gap-1">
                    {item.value}{' '}
                    <span
                      className="inline-block
                        max-w-0
                        overflow-hidden
                        whitespace-nowrap
                        origin-left
                        group-hover/chart:max-w-[100px]
                        transition-all
                        duration-500"
                    >
                      ({percentage.toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
