'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { channelSchema } from '@/shared/schemas/utm-campaigns'
import { z } from 'zod'
import { axiosApiInstance } from '@/shared/lib/axios'

export const useCreateCampaignChannel = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: z.infer<typeof channelSchema>) => {
      return axiosApiInstance.post(`/organizations/${orgId}/campaign-channels`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['campaign-channels', orgId],
      })
      queryClient.invalidateQueries({
        queryKey: ['campaign-channels-dropdown', orgId],
      })
    },
  })
}

export const useUpdateCampaignChannel = (orgId: string, channelId: string | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: z.infer<typeof channelSchema>) => {
      if (!channelId) {
        throw new Error('Channel ID is required')
      }
      return axiosApiInstance.patch(`/organizations/${orgId}/campaign-channels/${channelId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['campaign-channels', orgId],
      })
      queryClient.invalidateQueries({
        queryKey: ['campaign-channel', orgId, channelId],
      })
      queryClient.invalidateQueries({
        queryKey: ['campaign-channels-dropdown', orgId],
      })
    },
  })
}

export const useDeleteCampaignChannel = (orgId: string, channelId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      axiosApiInstance.delete(`/organizations/${orgId}/campaign-channels/${channelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['campaign-channels', orgId],
      })
      queryClient.invalidateQueries({
        queryKey: ['campaign-channel', orgId, channelId],
      })
      queryClient.invalidateQueries({
        queryKey: ['campaign-channels-dropdown', orgId],
      })
    },
  })
}

export const useDeleteManyCampaignChannels = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      axiosApiInstance.delete(`/organizations/${orgId}/campaign-channels`, { data: { ids } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['campaign-channels', orgId],
      })
      queryClient.invalidateQueries({
        queryKey: ['campaign-channels-dropdown', orgId],
      })
    },
  })
}
