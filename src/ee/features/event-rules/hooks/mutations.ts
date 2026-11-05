import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { CreateEventRuleInput, UpdateEventRuleInput } from '@/shared/schemas/event-rules'

export const useCreateEventRule = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateEventRuleInput) => {
      const response = await axiosApiInstance.post(`/organizations/${orgId}/event-rules`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'event-rules'] })
    },
  })
}

export const useUpdateEventRule = (orgId: string, ruleId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateEventRuleInput) => {
      const response = await axiosApiInstance.put(
        `/organizations/${orgId}/event-rules/${ruleId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'event-rules'] })
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'event-rules', ruleId],
      })
    },
  })
}

export const useDeleteEventRule = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ruleId: string) => {
      return await axiosApiInstance.delete(`/organizations/${orgId}/event-rules/${ruleId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'event-rules'] })
    },
  })
}

export const useToggleEventRule = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const response = await axiosApiInstance.put(
        `/organizations/${orgId}/event-rules/${ruleId}`,
        { is_active: isActive }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'event-rules'] })
    },
  })
}
