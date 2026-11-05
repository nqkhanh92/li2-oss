'use client'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse, PaginationResponse, SearchFilterPagination } from '@/shared/types'
import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Slug } from '@/app/api/organizations/[org_id]/touch-points/[touch_point_id]/short-link/route'
import { z } from 'zod'
import { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import {
  ConversionSummary,
  TouchPointDetail,
  TouchPointInList,
  TouchPointWithCampaign,
} from '@/core/types/touch-point.type'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'
import { AxiosError } from 'axios'
import { notFound, redirect } from 'next/navigation'
import Forbidden from '@/app/forbidden/page'

export const useGetTouchPoints = (
  org_id: string,
  params: SearchFilterPagination,
  options?: {
    editableOnly?: boolean
    excludeCollectionId?: string
  }
) => {
  const queryParams = {
    ...params,
    ...(options?.editableOnly !== undefined && { editableOnly: options.editableOnly }),
    ...(options?.excludeCollectionId && { excludeCollectionId: options.excludeCollectionId }),
  }

  return useQuery<PaginationResponse<TouchPointInList>>({
    queryKey: ['organizations', org_id, 'touch-points', queryParams],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<TouchPointInList>>(
        `/organizations/${org_id}/touch-points`,
        { params: queryParams }
      )
      return data
    },
  })
}

/**
 * Số link thường của tổ chức, cho phần quota trên header danh sách gộp.
 *
 * Khoá cache CỐ Ý không chứa bộ lọc: con số này là tồn kho, không phải số kết quả tìm kiếm — xem
 * `touchPointService.countLinks`. Nhờ vậy gõ vào ô tìm kiếm không làm nó nhấp nháy.
 */
export const useGetLinkCount = (org_id: string) => {
  return useQuery<{ link_count: number }>({
    queryKey: ['organizations', org_id, 'touch-points', 'link-count'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<{ link_count: number }>>(
        `/organizations/${org_id}/touch-points/link-count`
      )
      return data.data
    },
  })
}

export const useGetTouchPointsQRCode = (org_id: string, params: SearchFilterPagination) => {
  return useQuery<PaginationResponse<TouchPointInList>>({
    queryKey: ['organizations', org_id, 'touch-points-qr-code', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<TouchPointInList>>(
        `/organizations/${org_id}/touch-points/qr-code`,
        { params }
      )
      return data
    },
  })
}

export const useGetTouchPointsNotInTag = (
  org_id: string,
  tag_id: string,
  params: SearchFilterPagination
) => {
  return useQuery<PaginationResponse<TouchPointInList>>({
    queryKey: ['organizations', org_id, 'touch-points', tag_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<TouchPointInList>>(
        `/organizations/${org_id}/tags/${tag_id}/touch-points`,
        { params }
      )
      return data
    },
  })
}

export const useShowTouchPoint = (org_id: string, touch_point_id: string) => {
  return useSuspenseQuery({
    queryKey: ['organizations', org_id, 'touch-points', touch_point_id],
    queryFn: async () => {
      try {
        const { data } = await axiosApiInstance.get<
          APIResponse<
            z.infer<typeof touchPointUpdateSchema> &
              TouchPointDetail & {
                canEdit: boolean
                visits: [{ count: number }]
                conversion_summary?: ConversionSummary
              }
          >
        >(`/organizations/${org_id}/touch-points/${touch_point_id}`)
        return data.data
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 403) {
          redirect('/forbidden')
        }
        throw error
      }
    },
  })
}

export const useGetTouchPointSlugs = (org_id: string, touch_point_id: string) => {
  return useQuery<TouchPointDetail & { slugs: Slug[] }>({
    queryKey: ['organizations', org_id, 'touch-points', touch_point_id, 'slugs'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<TouchPointDetail & { slugs: Slug[] }>(
        `/organizations/${org_id}/touch-points/${touch_point_id}/short-link`
      )
      return data
    },
  })
}

export const useGetTouchPointDropdown = (
  org_id: string,
  options?: { deepLinkOnly?: boolean }
) => {
  const deepLinkOnly = options?.deepLinkOnly === true
  return useQuery<DropdownData<'touch_points'>>({
    queryKey: ['organizations', org_id, 'touch-points', 'dropdown', { deepLinkOnly }],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<DropdownData<'touch_points'>>(
        `/organizations/${org_id}/dropdowns/touch_points`,
        deepLinkOnly ? { params: { deep_link_only: 'true' } } : undefined
      )
      return data
    },
    refetchOnWindowFocus: false,
    enabled: !!org_id,
  })
}

export const useGetTouchPointsWithCampaign = (org_id: string) => {
  return useQuery({
    queryKey: ['organizations', org_id, 'touch-points', 'with-campaign'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<TouchPointWithCampaign[]>>(
        `/organizations/${org_id}/touch-points/with-campaign`
      )
      return data.data
    },
  })
}
