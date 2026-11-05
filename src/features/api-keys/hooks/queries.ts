'use client'

import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'
import { ApiKey } from '@/shared/types/api-key'

export const useGetApiKeys = (orgId: string) => {
  return useQuery({
    queryKey: ['organizations', orgId, 'api-keys'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<ApiKey[]>>(
        `/organizations/${orgId}/api-keys`
      )
      return data.data
    },
  })
}

export const useGetApiKey = (orgId: string, keyId: string | undefined) => {
  return useQuery({
    queryKey: ['organizations', orgId, 'api-keys', keyId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<ApiKey>>(
        `/organizations/${orgId}/api-keys/${keyId}`
      )
      return data.data
    },
    enabled: !!keyId,
  })
}
