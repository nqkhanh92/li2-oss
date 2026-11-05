'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'
import { ApiKeyWithSecret, CreateApiKeyRequest, UpdateApiKeyRequest } from '@/shared/types/api-key'

export const useCreateApiKey = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateApiKeyRequest) => {
      const response = await axiosApiInstance.post<APIResponse<ApiKeyWithSecret>>(
        `/organizations/${orgId}/api-keys`,
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'api-keys'],
      })
    },
  })
}

export const useUpdateApiKey = (orgId: string, keyId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateApiKeyRequest) => {
      return axiosApiInstance.patch(`/organizations/${orgId}/api-keys/${keyId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'api-keys'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'api-keys', keyId],
      })
    },
  })
}

export const useUpdateApiKeyStatus = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ keyId, isActive }: { keyId: string; isActive: boolean }) => {
      return axiosApiInstance.patch(`/organizations/${orgId}/api-keys/${keyId}`, {
        is_active: isActive,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'api-keys'],
      })
    },
  })
}

export const useDeleteApiKey = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (keyId: string) => {
      return axiosApiInstance.delete(`/organizations/${orgId}/api-keys/${keyId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'api-keys'],
      })
    },
  })
}

export const useRegenerateApiKey = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await axiosApiInstance.post<APIResponse<ApiKeyWithSecret>>(
        `/organizations/${orgId}/api-keys/${keyId}/regenerate`
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'api-keys'],
      })
    },
  })
}
