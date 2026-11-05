'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { PaginationResponse, SearchFilterPagination } from '@/shared/types'
import {
  CreateUTMTemplate,
  UpdateUTMTemplate,
} from '@/shared/schemas/utm-templates'
import { UTMTemplate } from '@/app/api/organizations/[org_id]/utm-templates/route'
import { APIResponse } from '@/infrastructure/response/ok/base'

/**
 * Query hook to fetch all UTM templates for an organization
 */
export const useGetUTMTemplates = (
  org_id: string,
  params: SearchFilterPagination
) => {
  return useQuery<PaginationResponse<UTMTemplate>>({
    queryKey: ['organizations', org_id, 'utm-templates', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<
        PaginationResponse<UTMTemplate>
      >(`/organizations/${org_id}/utm-templates`, { params })
      return data
    },
  })
}

/**
 * Query hook to fetch a single UTM template
 */
export const useGetUTMTemplate = (org_id: string, templateId: string) => {
  return useQuery<UTMTemplate>({
    queryKey: ['organizations', org_id, 'utm-templates', templateId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<UTMTemplate>(
        `/organizations/${org_id}/utm-templates/${templateId}`
      )
      return data
    },
  })
}

/**
 * Mutation hook to create a new UTM template
 */
export const useCreateUTMTemplate = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateUTMTemplate) => {
      return await axiosApiInstance.post<APIResponse<UTMTemplate>>(
        `/organizations/${org_id}/utm-templates`,
        data
      )
    },
    onSuccess: () => {
      // Invalidate both the regular and infinite scroll queries
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'utm-templates'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'utm-templates-infinite'],
      })
    },
  })
}

/**
 * Mutation hook to update an existing UTM template
 */
export const useUpdateUTMTemplate = (
  org_id: string,
  templateId: string
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateUTMTemplate) => {
      return axiosApiInstance.patch<APIResponse<UTMTemplate>>(
        `/organizations/${org_id}/utm-templates/${templateId}`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'utm-templates'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'utm-templates-infinite'],
      })
      queryClient.removeQueries({
        queryKey: ['organizations', org_id, 'utm-templates', templateId],
        exact: true,
      })
    },
  })
}

/**
 * Mutation hook to delete a single UTM template
 */
export const useDeleteUTMTemplate = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await axiosApiInstance.delete(
        `/organizations/${org_id}/utm-templates/${id}`
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'utm-templates'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'utm-templates-infinite'],
      })
    },
  })
}

/**
 * Mutation hook to bulk delete UTM templates
 */
export const useBulkDeleteUTMTemplates = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const data = await axiosApiInstance.delete(
        `/organizations/${org_id}/utm-templates`,
        { data: { ids } }
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'utm-templates'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'utm-templates-infinite'],
      })
    },
  })
}
