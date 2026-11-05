'use client'
import { useQuery } from '@tanstack/react-query'
import { APIResponse, PaginationResponse, SearchFilterPagination } from '@/shared/types'
import { axiosApiInstance } from '@/shared/lib/axios'
import {
  UTMCampaign,
  UtmCampaignAnalytics,
  UTMCampaignDetail,
} from '@/core/types/utm-campaign.type'

export const useGetUtmCampaigns = (orgId: string, queryParams: SearchFilterPagination) => {
  return useQuery({
    queryKey: ['utm-campaigns', orgId, queryParams],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<UTMCampaign>>(
        `/organizations/${orgId}/utm-campaigns`,
        { params: queryParams }
      )
      return data
    },
  })
}

export const useShowUtmCampaign = (
  orgId: string,
  campaignId: string | undefined | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['utm-campaign', orgId, campaignId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<UTMCampaignDetail>>(
        `/organizations/${orgId}/utm-campaigns/${campaignId}`
      )
      return data.data
    },
    enabled: options?.enabled ?? true,
  })
}

export const useGetUtmCampaignAnalytics = (
  orgId: string,
  campaignId?: string,
  params?: {
    startTime: Date | string | undefined
    endTime: Date | string | undefined
    excludeBot: boolean | undefined
  }
) => {
  return useQuery({
    queryKey: ['utm-campaign-analytics', orgId, campaignId, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<UtmCampaignAnalytics>>(
        `/organizations/${orgId}/utm-campaigns/${campaignId}/analytics`,
        { params }
      )
      return data.data
    },
    enabled: !!campaignId && !!params?.endTime && !!params.startTime,
  })
}

export const useGetCampaignChannelAnalytics = (
  orgId: string,
  campaignId?: string,
  channelId?: string,
  params?: {
    startTime: Date | string | undefined
    endTime: Date | string | undefined
    excludeBot: boolean | undefined
  }
) => {
  return useQuery({
    queryKey: ['utm-campaign-channel-analytics', orgId, campaignId, channelId, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<UtmCampaignAnalytics>>(
        `/organizations/${orgId}/utm-campaigns/${campaignId}/analytics`,
        { params: { channelIds: [channelId], ...params } }
      )
      return data.data
    },
    enabled: !!campaignId && !!channelId,
  })
}
