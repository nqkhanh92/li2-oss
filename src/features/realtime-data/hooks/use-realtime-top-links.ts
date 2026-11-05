import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { RealtimeTopLinkData } from '@/core/types/analytics/advanced.type'

export const useRealtimeTopLinks = (
  orgId: string,
  lastHours: number = 1,
  limit: number = 5
) => {
  return useQuery<RealtimeTopLinkData[]>({
    queryKey: ['realtime-top-links', orgId, lastHours, limit],
    queryFn: async () => {
      const response = await axiosApiInstance.get<{ data: RealtimeTopLinkData[] }>(
        `/organizations/${orgId}/analytics/realtime/top-links`,
        { params: { p_last_hours: lastHours, p_limit: limit } }
      )
      return response.data.data
    },
    refetchInterval: 10_000,
  })
}
