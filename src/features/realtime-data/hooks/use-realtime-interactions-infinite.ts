import { useInfiniteQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { RealtimeTouchpoint } from '../components/columns'

interface UseRealtimeInteractionsInfiniteParams {
  p_last_hours: number
  p_organization_id: string
  pageSize?: number
}

interface RealtimeInteractionsResponse {
  data: RealtimeTouchpoint[]
  rowCount: number
}

/**
 * Hook for infinite scrolling realtime interactions
 * Fetches interactions in paginated batches to avoid performance issues
 *
 * Usage:
 * ```tsx
 * const {
 *   data,
 *   isLoading,
 *   isFetchingNextPage,
 *   hasNextPage,
 *   fetchNextPage
 * } = useRealtimeInteractionsInfinite({
 *   p_last_hours: 24,
 *   p_organization_id: orgId,
 *   pageSize: 10,
 * })
 * ```
 */
export const useRealtimeInteractionsInfinite = ({
  p_last_hours,
  p_organization_id,
  pageSize = 10,
}: UseRealtimeInteractionsInfiniteParams) => {
  return useInfiniteQuery<RealtimeInteractionsResponse>({
    queryKey: [
      'realtime-interactions-infinite',
      p_organization_id,
      p_last_hours,
      pageSize,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await axiosApiInstance.get<RealtimeInteractionsResponse>(
        `/organizations/${p_organization_id}/analytics/realtime/realtime-touchpoint-v4`,
        {
          params: {
            p_last_hours,
            p_organization_id,
            p_limit: pageSize,
            p_offset: pageParam,
            // p_timezone,
          },
        }
      )
      // Axios wraps response in .data property
      return response.data
    },
    getNextPageParam: (lastPage, allPages) => {
      // lastPage has structure: { data: [...], rowCount: number }
      const currentPageData = lastPage.data || []
      const totalFetched = allPages.reduce((acc, page) => acc + (page.data?.length || 0), 0)

      // Return next offset if we haven't fetched all data yet
      if (totalFetched < lastPage.rowCount && currentPageData.length > 0) {
        return totalFetched
      }
      return undefined
    },
    initialPageParam: 0,
    refetchInterval: 10_000,
  })
}
