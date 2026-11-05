import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { z } from 'zod'
import {
  touchPointUpdateSchema,
  advancedTouchPointUpdateSchema,
  updateShortLinkSchema,
  generateSlugSchema,
  touchPointFormCreateWithAdvanceSchema,
} from '@/shared/schemas/touch-points'
import { revalidatePath } from '@/app/actions/revalidate-path'
import {
  createTouchpointImportTasksSchema,
  mappingColumnsSchema,
} from '@/shared/schemas/touch-points/touchpoint_import_tasks'
import { APIResponse, SearchFilterPagination } from '@/shared/types'
import { TouchPoint, TouchPointDetail, TouchPointExportType } from '@/core/types/touch-point.type'
import { CancelToken, toFormData } from 'axios'
import { ExportType } from '../utils/export-strategies'
import { FORCE_QR_ENABLED } from '@/features/touch-points/constants'

export const useBulkDeleteTouchPoint = (org_id: string, options?: { noToast?: boolean }) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const data = await axiosApiInstance.delete(`/organizations/${org_id}/touch-points`, {
        data: { ids },
      })
      return data
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points-qr-code'],
      })
      await revalidatePath(`/org/${org_id}/touch-points/create`)
    },
    ...(options?.noToast ? { onSettled: () => {} } : {}),
  })
}
export const useDeleteTouchPoint = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await axiosApiInstance.delete(`/organizations/${org_id}/touch-points/${id}`)
      return data
    },
    onSuccess: async () => {
      queryClient.removeQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
      await revalidatePath(`/org/${org_id}/touch-points/create`)
    },
  })
}
export const useBulkCreateTouchPoint = (orgId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (destinations: string[]) => {
      const { data } = await axiosApiInstance.post<APIResponse<TouchPoint[]>>(
        `/organizations/${orgId}/touch-points/bulk`,
        { destinations }
      )
      return data.data
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'touch-points'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'touch-points-qr-code'],
      })
      await revalidatePath(`/org/${orgId}/touch-points/create`)
    },
  })
}

export const useCreateTouchPoint = (
  org_id: string,
  options?: { shouldRevalidatePath?: boolean; noToast?: boolean }
) => {
  const { shouldRevalidatePath = true, noToast = false } = options || {}
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof touchPointFormCreateWithAdvanceSchema>) => {
      const payload = FORCE_QR_ENABLED
        ? {
            ...data,
            variants_content: {
              ...data.variants_content,
              QR: { enabled: true, ...data.variants_content?.QR },
            },
          }
        : data
      const formData = toFormData(payload)
      const response = await axiosApiInstance.post<
        APIResponse<
          Pick<
            TouchPoint,
            'id' | 'short_url' | 'qr_customize_options' | 'privacy_security' | 'variants_content'
          >
        >
      >(`/organizations/${org_id}/touch-points`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.data
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points-qr-code'],
      })
      if (shouldRevalidatePath) {
        await revalidatePath(`/org/${org_id}/touch-points/create`)
      }
    },
    ...(options?.noToast ? { onSettled: () => {} } : {}),
  })
}

export const useUpdateTouchPoint = (org_id: string, touch_point_id: string, silent?: boolean) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['organizations', org_id, 'touch-points', touch_point_id],
    mutationFn: async ({
      data,
      options,
    }: {
      data: z.infer<typeof touchPointUpdateSchema>
      options?: { multipart?: boolean; cancelToken?: CancelToken }
    }) => {
      const uploadImage = async (file: File, type: 'qr_logo' | 'meta_tag_image') => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type)
        const { data: res } = await axiosApiInstance.post<{ data: { url: string } }>(
          `/organizations/${org_id}/touch-points/${touch_point_id}/upload-image`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        return res.data.url
      }

      const payload = { ...data }

      if (payload.qr_logo_image instanceof File) {
        payload.qr_logo_image = await uploadImage(payload.qr_logo_image, 'qr_logo')
      }
      if (payload.meta_tags?.image instanceof File) {
        payload.meta_tags = {
          ...payload.meta_tags,
          image: await uploadImage(payload.meta_tags.image, 'meta_tag_image'),
        }
      }

      return axiosApiInstance.patch(
        `/organizations/${org_id}/touch-points/${touch_point_id}`,
        payload,
        { cancelToken: options?.cancelToken }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points-qr-code'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
    },
    ...(silent ? { onSettled: () => {} } : {}),
  })
}
export const useUploadTouchPointImage = (org_id: string, touch_point_id: string) => {
  return useMutation({
    mutationFn: async ({
      file,
      type,
    }: {
      file: File
      type: 'qr_logo' | 'meta_tag_image'
    }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const { data } = await axiosApiInstance.post<{ data: { url: string } }>(
        `/organizations/${org_id}/touch-points/${touch_point_id}/upload-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return data.data.url
    },
  })
}

export const useUpdateAdvancedTouchPoint = (org_id: string, touch_point_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof advancedTouchPointUpdateSchema>) => {
      return axiosApiInstance.patch(
        `/organizations/${org_id}/touch-points/${touch_point_id}/advanced`,
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
    },
  })
}
export const useUpdateTouchPointShortLink = (org_id: string, touch_point_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof updateShortLinkSchema>) => {
      return axiosApiInstance.patch(
        `/organizations/${org_id}/touch-points/${touch_point_id}/short-link`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
    },
  })
}

export const useGenerateSlug = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['organizations', org_id, 'slugs', 'ai-generate'],
    mutationFn: async (_data: z.infer<typeof generateSlugSchema>) => {
      const { data } = await axiosApiInstance.post(
        `/organizations/${org_id}/slugs/ai-generate`,
        _data
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'credits'],
      })
    },
  })
}

export const useImportTouchPointTask = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof createTouchpointImportTasksSchema>) => {
      return axiosApiInstance.post(`/organizations/${org_id}/touch-points/import`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
    // onSuccess: () => {
    //   queryClient.invalidateQueries({
    //     queryKey: ['organizations', org_id, 'touch-points'],
    //   })
    // },
  })
}

export const useExportTouchPoints = (org_id: string, searchFilters?: SearchFilterPagination) => {
  return useMutation({
    mutationFn: async ({
      fields,
      type,
      ...extra
    }: {
      fields: string[]
      type: ExportType
      [key: string]: any
    }) => {
      return axiosApiInstance.post<{ data: TouchPointDetail[] }>(
        `/organizations/${org_id}/touch-points/export`,
        {
          ...extra,
          fields,
          type,
          searchFilters,
        }
      )
    },
  })
}

export const useAutoMappingImport = (org_id: string) => {
  return useMutation({
    mutationFn: async ({
      notMappedHeaders,
      notMappedColumns,
    }: {
      notMappedHeaders: string[]
      notMappedColumns: string[]
    }) => {
      const { data } = await axiosApiInstance.post<
        APIResponse<z.infer<typeof mappingColumnsSchema>>
      >(`/organizations/${org_id}/touch-points/import/auto-mapping`, {
        notMappedHeaders,
        notMappedColumns,
      })
      return data.data
    },
    onSettled: () => {},
    onError: () => {},
  })
}
