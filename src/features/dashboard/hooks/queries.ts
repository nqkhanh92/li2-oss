import { DashboardDataType } from "@/app/api/organizations/[org_id]/dashboard/route";
import { axiosApiInstance } from "@/shared/lib/axios";
import { useQuery } from "@tanstack/react-query";

export const useGetDashboardData = (org_id: string) => {
  return useQuery<DashboardDataType>({
    queryKey: ["dashboard", org_id],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<DashboardDataType>(
        `/organizations/${org_id}/dashboard`
      );
      return data;
    },
  });
};
