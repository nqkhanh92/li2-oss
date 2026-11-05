import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { AnalyzeResponse, ApplyResponse, SmartSetupStatus } from '../types'

export const useAnalyzeWebsite = (orgId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { url: string; force?: boolean; locale: 'en' | 'vi' }) => {
      const { data } = await axiosApiInstance.post<{ data: AnalyzeResponse }>(
        `/organizations/${orgId}/smart-setup/analyze`,
        params
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'smart-setup', 'status'],
      })
    },
  })
}

export const useApplySmartSetup = (orgId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      cache_id: string
      selected_funnels: number[]
      selected_event_rules: number[]
    }) => {
      const { data } = await axiosApiInstance.post<{ data: ApplyResponse }>(
        `/organizations/${orgId}/smart-setup/apply`,
        params
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'smart-setup', 'status'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'funnels'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'event-rules'],
      })
    },
  })
}

export const useSmartSetupStatus = (orgId: string) => {
  return useQuery<SmartSetupStatus>({
    queryKey: ['organizations', orgId, 'smart-setup', 'status'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: SmartSetupStatus }>(
        `/organizations/${orgId}/smart-setup/status`
      )
      return data.data
    },
    enabled: !!orgId,
    staleTime: 60_000,
  })
}
