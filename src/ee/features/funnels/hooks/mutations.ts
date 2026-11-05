import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { CreateFunnelInput, UpdateFunnelInput } from '@/shared/schemas/funnels'

export const useCreateFunnel = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateFunnelInput) => {
      const response = await axiosApiInstance.post(
        `/organizations/${orgId}/funnels`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'funnels'] })
    },
  })
}

export const useUpdateFunnel = (orgId: string, funnelId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateFunnelInput) => {
      const response = await axiosApiInstance.put(
        `/organizations/${orgId}/funnels/${funnelId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'funnels'] })
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'funnels', funnelId],
      })
    },
  })
}

export const useDeleteFunnel = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (funnelId: string) => {
      return await axiosApiInstance.delete(`/organizations/${orgId}/funnels/${funnelId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'funnels'] })
    },
  })
}
