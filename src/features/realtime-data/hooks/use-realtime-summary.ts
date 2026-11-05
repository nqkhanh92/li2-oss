import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { RealtimeSummaryData } from '@/core/types/analytics/advanced.type'

// Hero summary cards are fixed-window metrics (5min / 1h / 24h) computed
// entirely inside get_realtime_summary — they intentionally do NOT respond to
// the page's time-window selector, so no p_last_hours is threaded here.
// `enabled` để nơi dùng lại khối này mà ẩn thẻ tổng (trang Analytics) không phải trả giá cho một
// request lặp mỗi 10 giây cho dữ liệu không ai nhìn.
export const useRealtimeSummary = (orgId: string, options?: { enabled?: boolean }) => {
  return useQuery<RealtimeSummaryData | null>({
    queryKey: ['realtime-summary', orgId],
    queryFn: async () => {
      const response = await axiosApiInstance.get<{ data: RealtimeSummaryData | null }>(
        `/organizations/${orgId}/analytics/realtime/summary`
      )
      return response.data.data
    },
    refetchInterval: 10_000,
    enabled: options?.enabled ?? true,
  })
}
