'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { OnboardingStateInput } from '@/shared/schemas/onboarding-state'
import { parseOnboardingState } from '../types/types'

export const ONBOARDING_STATE_KEY = (org_id: string) => [
  'organizations',
  org_id,
  'onboarding-state',
]

export const useGetOnboardingState = (org_id: string) => {
  return useQuery({
    queryKey: ONBOARDING_STATE_KEY(org_id),
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: unknown }>(
        `/organizations/${org_id}/onboarding-state`
      )
      return parseOnboardingState(data.data)
    },
    refetchOnWindowFocus: false,
  })
}

export const useUpdateOnboardingState = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: OnboardingStateInput) => {
      return await axiosApiInstance.patch(`/organizations/${org_id}/onboarding-state`, patch)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATE_KEY(org_id) })
    },
    onSettled: () => {},
    onError: () => {},
  })
}
