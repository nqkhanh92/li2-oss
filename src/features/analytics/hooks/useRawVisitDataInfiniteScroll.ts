'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { RawVisitDataParams, RawVisitData } from './queries'

const PAGE_SIZE = 15 // Load 50 items per page

interface InfiniteScrollResponse<T> {
  data: T[]
  rowCount: number
}

/**
 * Infinite scroll hook for raw visit data using TanStack Query
 *
 * This hook fetches raw visit data with pagination support, following the same pattern
 * as useUTMTemplatesInfiniteScroll.
 */
export const useRawVisitDataInfiniteScroll = (org_id: string, params: RawVisitDataParams) => {
  return useInfiniteQuery<InfiniteScrollResponse<RawVisitData>>({
    queryKey: ['raw-visit-data-infinite', org_id, params],
    queryFn: async ({ pageParam = 0 }) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const { data } = await axiosApiInstance.get<InfiniteScrollResponse<RawVisitData>>(
        `/organizations/${org_id}/analytics/raw-visits`,
        {
          params: {
            tag_ids: params.tag_ids,
            tp_ids: params.tp_ids,
            collection_ids: params.collection_ids,
            date_range: params.date_range,
            exclude_bot: params.exclude_bot,
            utm_sources: params.utm_sources,
            utm_mediums: params.utm_mediums,
            utm_campaigns: params.utm_campaigns,
            interaction_types: params.interaction_types,
            // Pagination must be nested under 'pagination' key for queryBuilder to work
            pagination: {
              pageIndex: pageParam,
              pageSize: PAGE_SIZE,
            },
          },
          headers: {
            'x-timezone': timezone,
          },
        }
      )
      return data
    },
    getNextPageParam: (lastPage, _, lastPageParam) => {
      const currentPage = typeof lastPageParam === 'number' ? lastPageParam : 0
      const nextPage = currentPage + 1
      const totalPages = Math.ceil(lastPage.rowCount / PAGE_SIZE)

      // Return undefined if we've reached the last page
      return nextPage < totalPages ? nextPage : undefined
    },
    initialPageParam: 0,
    enabled: !!org_id,
  })
}
