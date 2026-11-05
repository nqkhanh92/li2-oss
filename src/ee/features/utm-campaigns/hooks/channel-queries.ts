'use client'

import { useQuery } from '@tanstack/react-query'
import { SearchFilterPagination } from '@/shared/types'
import { axiosApiInstance } from '@/shared/lib/axios'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'

export const useGetCampaignChannels = (orgId: string, queryParams?: SearchFilterPagination) => {
  return useQuery({
    queryKey: ['campaign-channels', orgId, queryParams],
    queryFn: () => {
      return axiosApiInstance.get(`/organizations/${orgId}/campaign-channels`, {
        params: queryParams,
      })
    },
    enabled: !!orgId,
  })
}

export const useShowCampaignChannel = (orgId: string, channelId: string) => {
  return useQuery({
    queryKey: ['campaign-channel', orgId, channelId],
    queryFn: () => {
      return axiosApiInstance.get(`/organizations/${orgId}/campaign-channels/${channelId}`)
    },
    enabled: !!orgId && !!channelId,
  })
}

export const useGetCampaignChannelDropdown = (orgId: string) => {
  return useQuery({
    queryKey: ['campaign-channels-dropdown', orgId],
    queryFn: async () => {
      const response = await axiosApiInstance.get<DropdownData<'campaign_channels'>>(
        `/organizations/${orgId}/dropdowns/campaign_channels`,
        {
          params: { limit: 1000 },
        }
      )
      return response.data
    },
    enabled: !!orgId,
  })
}
