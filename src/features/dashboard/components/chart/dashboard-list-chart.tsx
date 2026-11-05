// import {
//   CampaignAnalytic,
//   CampDataStatistics,
//   DataStatistics,
// } from "@/app/api/dashboard/route";
// import { DashboardChartBar } from "./dashboard-chart-bar";
// import { DashboardChartPie } from "./dashboard-chart-pie";
// import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
// import { MapChart } from "@/components/customize/map-chart";
// import { DashboardChartBarTotal } from "./dashboard-chart-bar-total";

// type ChartType =
//   | "bar"
//   | "pie"
//   | "location pie"
//   | "location maps"
//   | "referrer bar";

// export type Chart = {
//   type: ChartType;
//   isLoading: boolean;
//   title: string;
//   description?: React.ReactNode | string;
//   label: string;
// };
// export type ListChart = Chart[];

// export type DashboardListChartProps = {
//   charts: ListChart;
//   // data?: DataStatistics["analyze_visit"];
//   data?: CampaignAnalytic[];
//   data_statistics?: CampDataStatistics;
// };
// export const DashboardListChart = ({
//   charts,
//   data,
//   data_statistics,
// }: DashboardListChartProps) => {
//   return (
//     <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
//       {/* {charts.map((chart, index) => (
//         <Card key={index}>
//           <CardHeader>
//             <CardTitle>{chart.title}</CardTitle>
//           </CardHeader>
//           <CardContent>
//             {chart.type === "bar" ? (
//               <DashboardChartBar
//                 data={data}
//                 label={chart.label}
//                 isLoading={chart.isLoading}
//               />
//             ) : chart.type === "pie" ? (
//               <DashboardChartPie
//                 data={data_statistics}
//                 label={chart.label}
//                 isLoading={chart.isLoading}
//               />
//             ) : // ) : chart.type === "location pie" ? (
//             //   <DashboardChartPie
//             //     data={data_statistics}
//             //     label={chart.label}
//             //     isLoading={chart.isLoading}
//             //     isLocationChart={true}
//             //   />
//             chart.type === "referrer bar" ? (
//               <DashboardChartBarTotal
//                 data={data_statistics?.referrer}
//                 keyField="ref"
//                 isLoading={false}
//                 label={chart.label}
//               />
//             ) : chart.type === "location maps" ? (
//               <MapChart
//                 className="w-full! max-h-[360px] border"
//                 data={data_statistics?.location}
//               />
//             ) : null}
//           </CardContent>
//         </Card>
//       ))} */}
//     </div>
//   );
// };
