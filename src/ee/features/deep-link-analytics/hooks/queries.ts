import { DeepLinkAnalyticsDataType } from '@/app/api/organizations/[org_id]/deep-link-analytics/route'
import { DeepLinkRanking, DeepLinkRankingGroupBy } from '@/ee/features/deep-link-analytics/types'
import { axiosApiInstance } from '@/shared/lib/axios'
import { useQuery } from '@tanstack/react-query'

// Client filter shape — a subset of AnalyticByTag's AnalyticFiltersParams, with
// date_range optional so v1 can render the all-time funnel without a date picker.
// Keeping the same param names means the page can later drive both surfaces off the
// shared analytics filter state with zero rework (README Key Decision 1).
export type DeepLinkAnalyticsQueryParams = {
  date_range?: { from?: Date | string; to?: Date | string }
  tp_ids?: string[]
  tag_ids?: string[]
  collection_ids?: string[]
  exclude_bot?: boolean
  utm_source_values?: string[]
  utm_medium_values?: string[]
  utm_campaign_values?: string[]
}

export const useDeepLinkOverview = (
  org_id: string,
  params: DeepLinkAnalyticsQueryParams = {}
) => {
  return useQuery<DeepLinkAnalyticsDataType>({
    queryKey: ['deep-link-analytics', org_id, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: DeepLinkAnalyticsDataType }>(
        `/organizations/${org_id}/deep-link-analytics`,
        { params }
      )
      return data.data
    },
    enabled: !!org_id,
    staleTime: 5 * 60 * 1000,
  })
}

// Per-link ranking (Phase 7). One groupBy per card-tab; the card sorts + paginates the
// returned rows client-side, so this just fetches the ordered set for the active dimension.
export const useDeepLinkRanking = (
  org_id: string,
  groupBy: DeepLinkRankingGroupBy,
  params: DeepLinkAnalyticsQueryParams = {}
) => {
  return useQuery<DeepLinkRanking>({
    queryKey: ['deep-link-ranking', org_id, groupBy, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: DeepLinkRanking }>(
        `/organizations/${org_id}/deep-link-analytics/ranking`,
        { params: { group_by: groupBy, ...params } }
      )
      return data.data
    },
    enabled: !!org_id,
    staleTime: 5 * 60 * 1000,
  })
}
