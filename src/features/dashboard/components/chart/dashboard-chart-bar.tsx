// import { CampaignAnalytic, CampDataStatistics, DataStatistics, OSStat, PlatformStat, ReferrerStat, TypeStat } from "@/app/api/dashboard/route";
// import { useMemo, useState } from "react";
// import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../../ui/chart";
// import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../ui/select";
// import { Skeleton } from "../../ui/skeleton";
// import { EmptySection } from "../../customize/empty-section";

// type DashboardChartBarProps = {
//   data?: CampaignAnalytic[];
//   data_overview?: CampDataStatistics;
//   isLoading: boolean;
//   isShowData?: boolean;
//   label: string;
// };

// type DataCategory = "os" | "platform" | "type" | "referrer";

// export const DashboardChartBar = ({
//   data,
//   isLoading,
//   isShowData = false,
//   label,
// }: DashboardChartBarProps) => {
//   const [selectedCategory, setSelectedCategory] = useState<DataCategory>("os");
//   const { chartData, keys } = useMemo(() => {
//     if (!data || data.length === 0) return { chartData: [], keys: [] };

//     const keysSet = new Set<string>();
//     const result = data.map((entry) => {
//       const row: CampaignAnalytic = {
//         ...entry,
//         date: new Date(entry.date).toLocaleDateString(),
//       };
//       entry[selectedCategory as keyof typeof entry]?.forEach((item: PlatformStat | OSStat | TypeStat | ReferrerStat) => {
//         let key = "Unknown";
//         if ("platform" in item && selectedCategory === "platform") {
//           key = item.platform;
//         } else if ("os" in item && selectedCategory === "os") {
//           key = item.os;
//         } else if ("type" in item && selectedCategory === "type") {
//           key = item.type;
//         }
//         row[key] = item.count;
//         keysSet.add(key);
//       });
//       return row;
//     });
//     return {
//       chartData: result,
//       keys: Array.from(keysSet),
//     };
//   }, [data, selectedCategory]);
//   const hasTypeData = chartData.some((item) => item.type && item.type.length > 0);
//   return (
//     <div>
//       <div className="flex justify-end">
//         <Select
//           value={selectedCategory}
//           onValueChange={(value: DataCategory) => {
//             setSelectedCategory(value);
//           }}
//         >
//           <SelectTrigger className="w-[200px]">
//             <SelectValue placeholder="Select Category" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="os">OS</SelectItem>
//             <SelectItem value="platform">Platform</SelectItem>
//             {hasTypeData && (
//               <SelectItem value="type">Type</SelectItem>
//             )}
//           </SelectContent>
//         </Select>
//       </div>

//       {isLoading ? (
//         <Skeleton className="w-full h-64 my-4" />
//       ) : (
//         <div className="my-4">
//           {chartData?.length === 0 ? (
//             <EmptySection />
//           ) : (
//             <ChartContainer config={{}} className="max-h-[360px] w-full">
//               <BarChart data={chartData} className="">
//                 <CartesianGrid vertical={false} />
//                 <XAxis dataKey="date" tickLine={false} tickMargin={10} />
//                 <YAxis />
//                 <Legend />
//                 <ChartTooltip content={<ChartTooltipContent />} />
//                 {keys.map((key, index) => (
//                   <Bar
//                     key={key}
//                     dataKey={key}
//                     fill={`hsl(var(--chart-${(index % 6) + 1}))`}
//                   />
//                 ))}
//               </BarChart>
//             </ChartContainer>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };
