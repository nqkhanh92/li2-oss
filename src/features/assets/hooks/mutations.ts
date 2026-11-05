import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosApiInstance } from "@/shared/lib/axios";
import { z } from "zod";
import { assetFormSchema } from "@/shared/schemas/assets";

export const useCreateAsset = (org_id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof assetFormSchema>) => {
      return axiosApiInstance.post(`/organizations/${org_id}/assets`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "assets"],
      });
    },
  });
};

export const useUpdateAsset = (org_id: string, asset_id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof assetFormSchema>) => {
      return axiosApiInstance.patch(
        `/organizations/${org_id}/assets/${asset_id}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "assets"],
      });
    },
  });
};
