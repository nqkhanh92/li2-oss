import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosApiInstance } from "@/shared/lib/axios";
import {
  createIntegrationSchema,
  updateIntegrationSchema,
} from "@/shared/schemas/integrations";
import { z } from "zod";
import errorMap from "zod/locales/en.js";
import { APIResponse, PaginationResponse } from "@/shared/types";
import { Integration } from "@/app/api/organizations/[org_id]/integrations/route";
import { queryClient } from "@/shared/lib/react-query";

export const useCreateIntegration = (org_id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof createIntegrationSchema>) => {
      return await axiosApiInstance.post<APIResponse<Integration>>(
        `/organizations/${org_id}/integrations`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "integrations"],
      });
    },
  });
};
export const useVerifyIntegration = (org_id: string) => {
  return useMutation({
    mutationFn: async (data: {
      type: string
      config: z.infer<typeof createIntegrationSchema>['config']
    }) => {
      return await axiosApiInstance.post(`/organizations/${org_id}/integrations/verify`, data)
    },
    onSettled: () => {},
    onError: (error: any) => {},
    onSuccess: () => {},
  })
};
export const useBulkDeleteIntegration = (org_id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const data = await axiosApiInstance.delete(
        `/organizations/${org_id}/integrations`,
        { data: { ids } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "integrations"],
      });
    },
  });
};

export const useDeleteIntegration = (
  org_id: string,
  integration_id: string
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const data = await axiosApiInstance.delete(
        `/organizations/${org_id}/integrations/${integration_id}`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "integrations"],
      });
    },
  });
};

export const useUpdateIntegration = (org_id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      integration_id,
      data,
    }: {
      integration_id: string;
      data: z.infer<typeof updateIntegrationSchema>;
    }) => {
      const res = await axiosApiInstance.patch(
        `/organizations/${org_id}/integrations/${integration_id}`,
        data
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "integrations"],
      });
    },
  });
};

export const useUpdateTpInIntegration = (
  org_id: string,
  integration_id: string
) => {
  return useMutation<
    PaginationResponse<Integration>,
    Error,
    { touch_point_ids: string[] }
  >({
    mutationFn: async (payload) => {
      const { data } = await axiosApiInstance.post<
        PaginationResponse<Integration>
      >(
        `/organizations/${org_id}/integrations/${integration_id}/touch-points`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations", org_id, "touch-points"],
      });
    },
  });
};