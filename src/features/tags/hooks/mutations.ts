import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { createTagSchema, updateTagSchema } from '@/shared/schemas/tags'
import { z } from 'zod'
import { GetTagObject, Tag } from '@/app/api/organizations/[org_id]/tags/route'
import { APIResponse, PaginationResponse } from '@/shared/types'

export const useCreateTag = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof createTagSchema>) => {
      return await axiosApiInstance.post<APIResponse<Tag>>(`/organizations/${org_id}/tags`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags', 'dropdown'],
      })
    },
  })
}

export const useBulkDeleteTag = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const data = await axiosApiInstance.delete(`/organizations/${org_id}/tags`, { data: { ids } })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags'],
      })
    },
  })
}

export const useBulkDeleteTouchPointFromTag = (org_id: string, tag_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const data = await axiosApiInstance.delete(
        `/organizations/${org_id}/tags/${tag_id}/touch-points`,
        { data: { ids } }
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags', 'dropdown'],
      })
    },
  })
}

export const useDeleteTag = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await axiosApiInstance.delete(`/organizations/${org_id}/tags/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags'],
      })
      queryClient.removeQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags', 'dropdown'],
      })
    },
  })
}

export const useUpdateTag = (org_id: string, tagId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof updateTagSchema>) => {
      return axiosApiInstance.patch(`/organizations/${org_id}/tags/${tagId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags', 'dropdown'],
      })
    },
  })
}

export const useUpdateTpInTag = (org_id: string, tag_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ touch_point_ids }: { touch_point_ids: string[] }) => {
      return axiosApiInstance.post<PaginationResponse<GetTagObject>>(
        `/organizations/${org_id}/tags/${tag_id}/touch-points`,
        { touch_point_ids }
      )
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'tags', 'dropdown'],
      })
      for (const id of vars.touch_point_ids) {
        queryClient.removeQueries({
          queryKey: ['organizations', org_id, 'touch-points', id],
          exact: true,
        })
      }
    },
  })
}
