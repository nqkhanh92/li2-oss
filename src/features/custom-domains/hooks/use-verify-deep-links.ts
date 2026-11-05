'use client'

import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { DeepLinkVerificationResult } from '@/ee/core/services/deep-link-verification.service'

export { type DeepLinkVerificationResult }

export function useVerifyDeepLinks(
  orgId: string,
  domainId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['organizations', orgId, 'custom-domains', domainId, 'verify-deep-links'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: DeepLinkVerificationResult }>(
        `/organizations/${orgId}/custom-domains/${domainId}/verify-deep-links`
      )
      return data.data
    },
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}
