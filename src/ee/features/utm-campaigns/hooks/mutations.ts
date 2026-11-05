'use client'

import { useMutation } from '@tanstack/react-query'
import { createUtmCampaignSchema, updateUtmCampaignSchema } from '@/shared/schemas/utm-campaigns'
import { z } from 'zod'
import { axiosApiInstance } from '@/shared/lib/axios'
import { useQueryClient } from '@tanstack/react-query'
import { APIResponse } from '@/shared/types'
import { UTMCampaign } from '@/core/types/utm-campaign.type'

export const useCreateUtmCampaign = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_data: z.infer<typeof createUtmCampaignSchema>) => {
      const { data } = await axiosApiInstance.post<APIResponse<UTMCampaign>>(
        `/organizations/${orgId}/utm-campaigns`,
        _data
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['utm-campaigns', orgId],
      })
    },
  })
}

export const useUpdateUtmCampaign = (orgId: string, campaignId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: z.infer<typeof updateUtmCampaignSchema>) => {
      return axiosApiInstance.patch(`/organizations/${orgId}/utm-campaigns/${campaignId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['utm-campaigns', orgId],
      })
      queryClient.invalidateQueries({
        queryKey: ['utm-campaign', orgId, campaignId],
      })
    },
  })
}

export const useDeleteUtmCampaign = (orgId: string, campaignId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      axiosApiInstance.delete(`/organizations/${orgId}/utm-campaigns/${campaignId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['utm-campaigns', orgId],
      })
      queryClient.removeQueries({
        queryKey: ['utm-campaign', orgId, campaignId],
      })
    },
  })
}

export const useDeleteManyUtmCampaigns = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (campaignIds: string[]) =>
      axiosApiInstance.delete(`/organizations/${orgId}/utm-campaigns`, { data: { campaignIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['utm-campaigns', orgId],
      })
    },
  })
}
