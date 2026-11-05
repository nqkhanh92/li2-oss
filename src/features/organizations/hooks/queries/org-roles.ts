'use client'
import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { OrgRole } from '@/app/api/organizations/[org_id]/roles/route'
import { APIResponse } from '@/shared/types'

export const useGetOrgRoles = (org_id: string) => {
  return useQuery<OrgRole[]>({
    queryKey: ['organizations', org_id, 'roles'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<OrgRole[]>>(
        `/organizations/${org_id}/roles`
      )
      return data?.data
    },
    enabled: !!org_id,
  })
}
