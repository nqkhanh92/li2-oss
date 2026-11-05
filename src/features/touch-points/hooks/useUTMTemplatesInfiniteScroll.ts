'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { SearchFilterPagination } from '@/shared/types'
import { UTMTemplate } from '@/app/api/organizations/[org_id]/utm-templates/route'
import { UTMTemplateListItem } from '@/core/types/utm-template.type'

interface UseUTMTemplatesInfiniteScrollParams {
  org_id: string
  search: string
  sorting: SearchFilterPagination['sorting']
  filters?: Record<string, any>
}

interface InfiniteScrollResponse<T> {
  data: T[]
  rowCount: number
}

const PAGE_SIZE = 10 // Load 10 items per page

/**
 * Infinite scroll hook for UTM templates using TanStack Query
 */
export const useUTMTemplatesInfiniteScroll = ({
  org_id,
  search,
  sorting,
  filters,
}: UseUTMTemplatesInfiniteScrollParams) => {
  return useInfiniteQuery<InfiniteScrollResponse<UTMTemplateListItem>>({
    queryKey: ['organizations', org_id, 'utm-templates-infinite', { search, sorting, filters }],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await axiosApiInstance.get<InfiniteScrollResponse<UTMTemplateListItem>>(
        `/organizations/${org_id}/utm-templates`,
        {
          params: {
            search,
            sorting,
            filters,
            // Pagination must be nested under 'pagination' key for queryBuilder to work
            pagination: {
              pageIndex: pageParam,
              pageSize: PAGE_SIZE,
            },
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
  })
}
