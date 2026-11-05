import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { PaginationResponse, SearchFilterPagination } from '@/shared/types'
import { Integration } from '@/app/api/organizations/[org_id]/integrations/route'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'
import { IntegrationType } from '../../constants'

export const useShowIntegration = (org_id: string, integrationId: string | undefined) => {
  return useQuery<Integration>({
    queryKey: ['organizations', org_id, 'integrations', integrationId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<Integration>(
        `/organizations/${org_id}/integrations/${integrationId}`
      )
      return data
    },
    enabled: !!integrationId,
  })
}

export const useGetIntegrations = (org_id: string, params: SearchFilterPagination) => {
  return useQuery<PaginationResponse<Integration>>({
    queryKey: ['organizations', org_id, 'integrations', params],
    queryFn: async () => {
      console.log('Get integrations')
      console.log({ params })
      const { data } = await axiosApiInstance.get<PaginationResponse<Integration>>(
        `/organizations/${org_id}/integrations`,
        { params }
      )
      return data
    },
  })
}

export const useGetIntegrationDropdowns = (org_id: string, type?: IntegrationType) => {
  return useQuery<DropdownData<'integrations'>>({
    queryKey: ['organizations', org_id, 'dropdown', 'integrations'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<DropdownData<'integrations'>>(
        `/organizations/${org_id}/dropdowns/integrations`
      )
      if (data) {
        return type ? data.filter((integration) => integration.type === type) : data
      }
      return []
    },
  })
}
