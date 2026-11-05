import { useSuspenseQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import {
  AdvancedAnalyticQueryParams,
  AdvancedAnalyticReturnTypes,
  AdvancedAnalyticTypes
} from '@/core/types/analytics/advanced.type'

export const useAdvancedAnalytics = <T extends AdvancedAnalyticTypes>(
  orgId: string,
  type: T,
  params: AdvancedAnalyticQueryParams
) => {
  return useSuspenseQuery<AdvancedAnalyticReturnTypes<T>>({
    queryKey: ['advanced-analytics', orgId, type, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<AdvancedAnalyticReturnTypes<T>>(
        `/organizations/${orgId}/analytics/advanced/${type}`,
        {
          params: params,
        }
      )
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

/**
 * Hook for fetching advanced analytics filtered to a specific space
 * Used in space analytics page for advanced analytics tabs
 *
 * @param orgId - Organization ID
 * @param spaceId - Space (collection) ID
 * @param type - Type of advanced analytics to fetch
 * @param params - Query parameters (period_days, tag_ids, touchpoint_ids)
 * @returns Query result with advanced analytics data scoped to the space
 */
export const useGetSpaceAdvancedAnalytics = <T extends AdvancedAnalyticTypes>(
  orgId: string,
  spaceId: string,
  type: T,
  params: Omit<AdvancedAnalyticQueryParams, 'collection_ids'>
) => {
  return useSuspenseQuery<AdvancedAnalyticReturnTypes<T>>({
    queryKey: ['space-advanced-analytics', orgId, spaceId, type, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<AdvancedAnalyticReturnTypes<T>>(
        `/organizations/${orgId}/spaces/${spaceId}/analytics/advanced/${type}`,
        {
          params: params,
        }
      )
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}