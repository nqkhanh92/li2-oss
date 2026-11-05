// import {
//   OSStat,
//   PlatformStat,
//   ReferrerStat,
//   TypeStat,
// } from "@/app/api/dashboard/route";
import { useMemo } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../../../../shared/components/ui/chart'
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis, Cell } from 'recharts'
import { Skeleton } from '../../../../shared/components/ui/skeleton'
import { EmptySection } from '../../../../shared/components/customize/empty-section'

type DashboardChartBarTotalProps = {
  // data?: PlatformStat[] | OSStat[] | TypeStat[] | ReferrerStat[];
  // keyField: string;
  // isLoading?: boolean;
  // label?: string;
}

export const DashboardChartBarTotal = ({}: // data,
// keyField,
// isLoading,
DashboardChartBarTotalProps) => {
  // const chartData = useMemo(() => {
  //   if (!data || data.length === 0) return [];
  //   const countMap = new Map<string, number>();
  //   data.forEach((entry: any) => {
  //     const value = entry[keyField] ?? "Unknown";
  //     countMap.set(value, (countMap.get(value) || 0) + entry.count);
  //   });
  //   return Array.from(countMap.entries()).map(([name, total], index) => ({
  //     name,
  //     total,
  //     fill: `hsl(var(--chart-${(index % 6) + 1}))`,
  //   }));
  // }, [data, keyField]);
  // return (
  //   <div>
  //     {isLoading ? (
  //       <Skeleton className="w-full h-64 my-4" />
  //     ) : (
  //       <div className="my-4">
  //         {chartData.length === 0 ? (
  //           <EmptySection />
  //         ) : (
  //           <ChartContainer config={{}} className="max-h-[360px] w-full">
  //             <BarChart data={chartData}>
  //               <CartesianGrid vertical={false} />
  //               <XAxis dataKey="name" tickLine={false} tickMargin={10} />
  //               <YAxis />
  //               <Legend
  //                 payload={chartData.map((entry) => ({
  //                   value: entry.name,
  //                   type: "square",
  //                   color: entry.fill,
  //                   id: entry.name,
  //                 }))}
  //               />
  //               <ChartTooltip content={<ChartTooltipContent />} />
  //               <Bar dataKey="total" name="Total">
  //                 {chartData.map((entry, index) => (
  //                   <Cell key={`cell-${index}`} fill={entry.fill} />
  //                 ))}
  //               </Bar>
  //             </BarChart>
  //           </ChartContainer>
  //         )}
  //       </div>
  //     )}
  //   </div>
  // );
}
