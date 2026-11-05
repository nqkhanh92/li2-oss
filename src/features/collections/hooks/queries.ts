import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { PaginationResponse } from '@/shared/types'
import {
  CollectionWithStats,
  CollectionMemberWithProfile,
  GetCollectionsQueryParams,
} from '@/shared/types/collection.types'
import { TouchPointDetail } from '@/core/types/touch-point.type'

/**
 * Get all collections in an organization
 */
export const useGetCollections = (org_id: string, params?: GetCollectionsQueryParams) => {
  return useQuery<PaginationResponse<CollectionWithStats>>({
    queryKey: ['organizations', org_id, 'collections', params],
    queryFn: async () => {
      console.log({ params })
      const { data } = await axiosApiInstance.get<PaginationResponse<CollectionWithStats>>(
        `/organizations/${org_id}/collections`,
        { params }
      )
      return data
    },
  })
}

/**
 * Get a single collection by ID with stats
 */
export const useGetCollection = (org_id: string, collection_id: string, enabled = true) => {
  return useQuery<{ data: CollectionWithStats }>({
    queryKey: ['organizations', org_id, 'collections', collection_id],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: CollectionWithStats }>(
        `/organizations/${org_id}/collections/${collection_id}`
      )
      return data
    },
    enabled: enabled && !!collection_id,
  })
}

/**
 * Get all touch-points in a collection
 */
export const useGetCollectionTouchPoints = (
  org_id: string,
  collection_id: string,
  params?: any,
  enabled = true
) => {
  return useQuery<PaginationResponse<TouchPointDetail>>({
    queryKey: ['organizations', org_id, 'collections', collection_id, 'touch-points', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<TouchPointDetail>>(
        `/organizations/${org_id}/collections/${collection_id}/touch-points`,
        { params }
      )
      return data
    },
    enabled: enabled && !!collection_id,
  })
}

/**
 * Get all members of a collection
 */
export const useGetCollectionMembers = (org_id: string, collection_id: string, enabled = true) => {
  return useQuery<{ data: CollectionMemberWithProfile[] }>({
    queryKey: ['organizations', org_id, 'collections', collection_id, 'members'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: CollectionMemberWithProfile[] }>(
        `/organizations/${org_id}/collections/${collection_id}/members`
      )
      return data
    },
    enabled: enabled && !!collection_id,
  })
}

/**
 * Get collections dropdown data (for select inputs)
 */
export const useGetCollectionsDropdown = (
  org_id: string,
  includeStats: boolean | { enabled?: boolean } = false
) => {
  // Support both boolean and options object
  const isBoolean = typeof includeStats === 'boolean'
  const stats = isBoolean ? includeStats : false
  const enabled = isBoolean ? true : includeStats.enabled ?? true

  return useQuery<{
    data: Array<{
      id: string
      name: string
      color?: string | null
      touch_points_count?: number
      updated_at?: string | null
    }>
  }>({
    queryKey: ['organizations', org_id, 'collections', 'dropdown', stats],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<CollectionWithStats>>(
        `/organizations/${org_id}/collections`,
        {
          params: { limit: 100, sort_by: 'name', sort_order: 'asc' },
        }
      )

      // Transform to dropdown format
      return {
        data: data.data.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          ...(stats && {
            touch_points_count: c.touch_points_count,
            updated_at: c.updated_at,
          }),
        })),
      }
    },
    refetchOnWindowFocus: false,
    enabled: enabled && !!org_id,
  })
}
