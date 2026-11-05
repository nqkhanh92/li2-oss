import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'
import {
  StaticQrItem,
  StaticQrPayload,
} from '@/features/touch-points/components/static-qr/static-qr.types'

interface CreateStaticQrInput {
  name: string
  payload: StaticQrPayload
  qr_customize_options?: any
}

interface UpdateStaticQrInput {
  name?: string
  payload?: StaticQrPayload
  qr_customize_options?: any
}

export const useCreateStaticQr = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateStaticQrInput) => {
      const response = await axiosApiInstance.post<APIResponse<StaticQrItem>>(
        `/organizations/${org_id}/static-qr`,
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'static-qr'],
      })
    },
  })
}

export const useUpdateStaticQr = (org_id: string, staticQrId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateStaticQrInput) => {
      const response = await axiosApiInstance.patch<APIResponse<StaticQrItem>>(
        `/organizations/${org_id}/static-qr/${staticQrId}`,
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'static-qr'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'static-qr', staticQrId],
      })
    },
  })
}

export const useDeleteStaticQr = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (staticQrId: string) => {
      return axiosApiInstance.delete(`/organizations/${org_id}/static-qr/${staticQrId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'static-qr'],
      })
    },
  })
}
export const useBulkDeleteStaticQr = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      return await axiosApiInstance.delete(`/organizations/${org_id}/static-qr`, { data: { ids } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'static-qr'],
      })
    },
  })
}
