import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosApiInstance } from "@/shared/lib/axios";
import { z } from "zod";
import { campaignFormSchema } from "@/shared/schemas/campaigns";

export const useBulkDeleteCampaign = (org_id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const data = await axiosApiInstance.delete(
        `/organizations/${org_id}/campaigns`,
        { data: { ids } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "campaigns"],
      });
    },
  });
};
export const useDeleteCampaign = (org_id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const data = await axiosApiInstance.delete(
        `/organizations/${org_id}/campaigns/${campaignId}`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "campaigns"],
      });
    },
  });
};
export const useCreateCampaign = (org_id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof campaignFormSchema>) => {
      const { data: campaign } = await axiosApiInstance.post<{
        data: { id: string };
      }>(`/organizations/${org_id}/campaigns`, data);
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "campaigns"],
      });
    },
  });
};

export const useUpdateCampaign = (org_id: string, campaignId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof campaignFormSchema>) => {
      return axiosApiInstance.patch(
        `/organizations/${org_id}/campaigns/${campaignId}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "campaigns", campaignId],
      });
    },
  });
};
