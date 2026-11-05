// import {
//   CampDataStatistics,
//   DataStatistics,
//   GroupDataStatistics,
//   LocationDetailStat,
//   LocationStat,
//   OSStat,
//   PlatformStat,
//   ReferrerStat,
//   TypeStat,
// } from "@/app/api/dashboard/route";
// import {
//   ChartConfig,
//   ChartContainer,
//   ChartLegend,
//   ChartLegendContent,
// } from "../../ui/chart";
// import { Label, Pie, PieChart, Sector } from "recharts";
// import { PieSectorDataItem } from "recharts/types/polar/Pie";
// import { useMemo, useState } from "react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../ui/select";
// import { Skeleton } from "../../ui/skeleton";
// import { EmptySection } from "../../customize/empty-section";

// type DataCategory =
//   | "os"
//   | "platform"
//   | "type"
//   | "country"
//   | "city"
//   | "referrer";

// type DashboardChartPieProps = {
//   // data?: DataStatistics["analyze_visit"]["pie_chart"];
//   data?: CampDataStatistics;
//   isLoading: boolean;
//   label: string;
//   isLocationChart?: boolean;
// };

// export const DashboardChartPie = ({
//   data,
//   isLoading,
//   label,
//   isLocationChart = false,
// }: DashboardChartPieProps) => {
//   const availableCategories: DataCategory[] = useMemo(() => {
//     if (!data) return [];

//     // if (isLocationChart) {
//     //   const hasCountry = Array.isArray(data.location) && data.location.length > 0;
//     //   const hasCity =
//     //     hasCountry &&
//     //     Array.isArray(data.location?.[0]?.location) &&
//     //     data.location[0].location.length > 0;
//     //   return [
//     //     ...(hasCountry ? ["country"] : []),
//     //     ...(hasCity ? ["city"] : []),
//     //   ] as DataCategory[];
//     // }

//     return (["os", "platform", "type", "referrer"] as DataCategory[]).filter(
//       (key) => Array.isArray(data?.[key])
//     );
//   }, [data, isLocationChart]);

//   const [selectedCategory, setSelectedCategory] = useState<DataCategory>(() =>
//     Array.isArray(data?.os) ? "os" : availableCategories[0]
//   );
//   const validCategory = availableCategories.includes(selectedCategory)
//     ? selectedCategory
//     : availableCategories[0] ?? "os";

//   const chartData = useMemo(() => {
//     if (!data) return [];

//     // if (validCategory === "city") {
//     //   const cityItems =
//     //     (data.location ?? []).flatMap((loc) =>
//     //       (loc.location ?? []).map((cityItem) => ({
//     //         label: cityItem.city || "Unknown",
//     //         value: cityItem.count ?? 0,
//     //       }))
//     //     );

//     //   // Combine same labels
//     //   const merged = cityItems.reduce((acc, item) => {
//     //     const existing = acc.find((el) => el.label === item.label);
//     //     if (existing) {
//     //       existing.value += item.value;
//     //     } else {
//     //       acc.push({ ...item });
//     //     }
//     //     return acc;
//     //   }, [] as { label: string; value: number }[]);

//     //   return merged.map((item, index) => ({
//     //     ...item,
//     //     fill: `hsl(var(--chart-${index + 1}))`,
//     //   }));
//     // }

//     // if (validCategory === "country") {
//     //   const countryItems =
//     //     (data.location ?? []).map((loc) => ({
//     //       label: loc.country || "Unknown",
//     //       value: (loc.location ?? []).reduce((sum, cityItem) => sum + (cityItem.count ?? 0), 0),
//     //     }));

//     //   const merged = countryItems.reduce((acc, item) => {
//     //     const existing = acc.find((el) => el.label === item.label);
//     //     if (existing) {
//     //       existing.value += item.value;
//     //     } else {
//     //       acc.push({ ...item });
//     //     }
//     //     return acc;
//     //   }, [] as { label: string; value: number }[]);

//     //   return merged.map((item, index) => ({
//     //     ...item,
//     //     fill: `hsl(var(--chart-${index + 1}))`,
//     //   }));
//     // }

//     const items = (
//       (data?.[validCategory] as (
//         | PlatformStat
//         | OSStat
//         | TypeStat
//         | ReferrerStat
//       )[]) ?? []
//     ).map((item) => {
//       const label =
//         validCategory === "os"
//           ? (item as OSStat).os || "Unknown"
//           : validCategory === "platform"
//           ? (item as PlatformStat).platform || "Unknown"
//           : validCategory === "type"
//           ? (item as TypeStat).type || "Unknown"
//           : (item as ReferrerStat).ref || "Unknown";

//       return {
//         label,
//         value: item.count ?? 0,
//       };
//     });

//     const mergedItems = items.reduce((acc, item) => {
//       const existing = acc.find((i) => i.label === item.label);
//       if (existing) {
//         existing.value += item.value;
//       } else {
//         acc.push({ ...item });
//       }
//       return acc;
//     }, [] as { label: string; value: number }[]);

//     return mergedItems.map((item, index) => ({
//       ...item,
//       fill: `hsl(var(--chart-${index + 1}))`,
//     }));
//   }, [data, validCategory]);

//   const chartConfig: ChartConfig = useMemo(() => {
//     return chartData.reduce((acc, item) => {
//       acc[item.label] = {
//         label: item.label,
//         color: item.fill,
//       };
//       return acc;
//     }, {} as Record<string, { label: string; color: string }>);
//   }, [chartData]);

//   const [activeIndex, setActiveIndex] = useState<number>();
//   const total = useMemo(() => {
//     return chartData.reduce((acc, item) => acc + item.value, 0);
//   }, [chartData]);
//   return (
//     <div>
//       <div className="flex justify-end">
//         <Select
//           value={
//             availableCategories.includes(selectedCategory)
//               ? selectedCategory
//               : availableCategories[0] ?? "os"
//           }
//           onValueChange={(value: DataCategory) => {
//             setSelectedCategory(value);
//           }}
//         >
//           <SelectTrigger className="w-[200px]">
//             <SelectValue placeholder="Select Category" />
//           </SelectTrigger>
//           <SelectContent>
//             {availableCategories.map((category) => (
//               <SelectItem key={category} value={category}>
//                 {category.charAt(0).toUpperCase() + category.slice(1)}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>

//       {isLoading ? (
//         <Skeleton className="w-full h-64 my-4" />
//       ) : (
//         <div>
//           {chartData.length === 0 ? (
//             <EmptySection />
//           ) : (
//             <ChartContainer
//               config={chartConfig}
//               className="mx-auto aspect-square w-full max-w-[300px]"
//             >
//               <PieChart>
//                 <Pie
//                   data={chartData}
//                   dataKey="value"
//                   nameKey="label"
//                   onMouseEnter={(_, index) => setActiveIndex(index)}
//                   onMouseLeave={() => setActiveIndex(undefined)}
//                   innerRadius={60}
//                   strokeWidth={5}
//                   activeIndex={activeIndex}
//                   activeShape={({
//                     outerRadius = 0,
//                     ...props
//                   }: PieSectorDataItem) => (
//                     <g>
//                       <Sector {...props} outerRadius={outerRadius + 10} />
//                       <Sector
//                         {...props}
//                         outerRadius={outerRadius + 25}
//                         innerRadius={outerRadius + 12}
//                       />
//                     </g>
//                   )}
//                 >
//                   <Label
//                     content={({ viewBox }) => {
//                       if (viewBox && "cx" in viewBox && "cy" in viewBox) {
//                         return (
//                           <text
//                             x={viewBox.cx}
//                             y={viewBox.cy}
//                             textAnchor="middle"
//                             dominantBaseline="middle"
//                           >
//                             <tspan
//                               x={viewBox.cx}
//                               y={viewBox.cy}
//                               className="fill-foreground text-3xl font-bold"
//                             >
//                               {activeIndex !== undefined
//                                 ? chartData[activeIndex].value
//                                 : total}
//                             </tspan>
//                             <tspan
//                               x={viewBox.cx}
//                               y={(viewBox.cy || 0) + 24}
//                               className="fill-muted-foreground"
//                             >
//                               {activeIndex !== undefined
//                                 ? chartData[activeIndex].label
//                                 : label}
//                             </tspan>
//                           </text>
//                         );
//                       }
//                       return null;
//                     }}
//                   />
//                 </Pie>
//                 <ChartLegend
//                   content={<ChartLegendContent nameKey="label" />}
//                   className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
//                 />
//               </PieChart>
//             </ChartContainer>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };
