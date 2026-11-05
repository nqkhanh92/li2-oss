import { axiosApiInstance } from "@/shared/lib/axios";
import { PaginationResponse, SearchFilterPagination } from "@/shared/types";
import { useQuery } from "@tanstack/react-query";
import { Campaign } from "@/app/api/organizations/[org_id]/campaigns/route";
import { useEffect, useState } from "react";
import { getCampaignDropdown } from "@/app/actions/campaigns";

export const useGetCampaigns = (
  org_id: string,
  params: SearchFilterPagination
) => {
  return useQuery<PaginationResponse<Campaign>>({
    queryKey: ["organizations", org_id, "campaigns", params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<Campaign>>(
        `/organizations/${org_id}/campaigns`,
        { params }
      );
      return data;
    },
  });
};

export const useShowCampaign = (org_id: string, campaignId: string) => {
  return useQuery<Campaign>({
    queryKey: ["organizations", org_id, "campaigns", campaignId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<Campaign>(
        `/organizations/${org_id}/campaigns/${campaignId}`
      );
      return data;
    },
  });
};

export const useGetCampaignDropdown = (org_id: string) => {
  return useQuery({
    queryKey: ["organizations", org_id, "campaigns", "dropdown"],
    queryFn: async () => {
      const data = await getCampaignDropdown(org_id);
      return data;
    },
  });
};
