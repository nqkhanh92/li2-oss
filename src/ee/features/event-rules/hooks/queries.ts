import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { EventRule } from '../types'

export const useGetEventRules = (orgId: string) => {
  return useQuery<{ data: EventRule[] }>({
    queryKey: ['organizations', orgId, 'event-rules'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/event-rules`)
      return data
    },
    enabled: !!orgId,
  })
}

export const useGetEventRule = (orgId: string, ruleId: string) => {
  return useQuery<{ data: EventRule }>({
    queryKey: ['organizations', orgId, 'event-rules', ruleId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/event-rules/${ruleId}`)
      return data
    },
    enabled: !!orgId && !!ruleId,
  })
}

export const useGetEventNames = (orgId: string) => {
  return useQuery<{ data: string[] }>({
    queryKey: ['organizations', orgId, 'event-rules', 'names'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/event-rules/names`)
      return data
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 min — event names don't change often
  })
}
