import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import {
  RealtimeAnalyticsReturnTypes,
  RealtimeAnalyticsTypes,
  RealtimeParams,
} from '@/core/types/analytics/advanced.type'

export const useRealtimeAnalytics = <T extends RealtimeAnalyticsTypes>(
  orgId: string,
  type: T,
  params: RealtimeParams
) => {
  return useQuery<RealtimeAnalyticsReturnTypes<T>>({
    queryKey: ['realtime-analytics', orgId, type, params],
    queryFn: async () => {
      const response = await axiosApiInstance.get<RealtimeAnalyticsReturnTypes<T>>(
        `/organizations/${orgId}/analytics/realtime/${type}`,
        {
          params: params,
        }
      )
      return response.data
    },
    // refetchOnWindowFocus: false,
    // refetchOnMount: false,
  })
}
