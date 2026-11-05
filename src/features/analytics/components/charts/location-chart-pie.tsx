// import { TouchPointAnalytics } from "@/app/api/organizations/[org_id]/campaigns/[id]/touch-points/[touch_point_id]/analytics/route";
import { EmptySection } from '@/shared/components/customize/empty-section'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { useMemo, useState } from 'react'

import { Pie, PieChart, Sector, Label } from 'recharts'
import { PieSectorDataItem } from 'recharts/types/polar/Pie'
type TouchPointAnalytics = any
type Props = {
  data?: TouchPointAnalytics['by_location']
  isLoading: boolean
  label: string
}

export const AnalyticChartPieByLocation = ({ data, isLoading, label }: Props) => {
  const [activeIndex, setActiveIndex] = useState<number>()
  const chartData = useMemo(() => {
    return []
    // data?.map((item, index) => ({
    //   label: item.country,
    //   value: item.cities.map((city) => city.count).reduce((a, b) => a + b, 0),
    //   fill: `hsl(var(--chart-${index + 1}))`,
    // })) || []
  }, [data])
  const chartConfig: ChartConfig = useMemo(() => {
    return (
      chartData?.reduce((acc, item, index) => {
        // acc[item.label] = {
        //   label: item.label,
        //   color: `hsl(var(--chart-${index + 1}))`,
        // };
        return acc
      }, {} as Record<string, { label: string; color: string }>) || {}
    )
  }, [data])
  // const total = useMemo(() => {
  //   return chartData?.reduce((acc, item) => acc + item.value, 0) || 0;
  // }, [chartData]);
  // const citiesData = useMemo(() => {
  //   const maxCity = 5;
  //   if (activeIndex !== undefined) {
  //     const selectedCountry = chartData[activeIndex];
  //     const countryData = data?.find(
  //       (item) => item.country === selectedCountry.label
  //     );
  //     if (
  //       countryData?.cities?.length &&
  //       countryData?.cities?.length > maxCity
  //     ) {
  //       return countryData?.cities
  //         .sort((a, b) => b.count - a.count)
  //         .slice(0, maxCity)
  //         .concat({
  //           city: "Others",
  //           count: countryData?.cities
  //             .sort((a, b) => b.count - a.count)
  //             .slice(maxCity)
  //             .reduce((a, b) => a + b.count, 0),
  //         })
  //         .map((item) => ({
  //           name: item.city,
  //           value: item.count,
  //         }));
  //     }
  //     return (
  //       countryData?.cities.map((city) => ({
  //         name: city.city,
  //         value: city.count,
  //       })) || []
  //     );
  //   }
  // }, [chartData, activeIndex]);
  return (
    <div>
      {chartData?.length === 0 ? (
        <EmptySection />
      ) : (
        <ChartContainer
          // id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ul className="bg-background px-4 py-2 rounded-sm">
                  {/* {citiesData?.map((city) => (
                    <li key={city.name}>
                      {city.name}: {city.value}
                    </li>
                  ))} */}
                </ul>
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              innerRadius={60}
              strokeWidth={5}
              // activeIndex={activeIndex}
              // activeShape={({
              //   outerRadius = 0,
              //   ...props
              // }: PieSectorDataItem) => (
              //   <g>
              //     <Sector {...props} outerRadius={outerRadius + 10} />
              //     <Sector
              //       {...props}
              //       outerRadius={outerRadius + 25}
              //       innerRadius={outerRadius + 12}
              //     />
              //   </g>
              // )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {/* {activeIndex !== undefined
                            ? chartData[activeIndex].value
                            : total} */}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {/* {activeIndex !== undefined
                            ? chartData[activeIndex].label
                            : label} */}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="label" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          </PieChart>
        </ChartContainer>
      )}
    </div>
  )
}
