import { useQuery } from '@tanstack/react-query'
import { Organization } from '@/app/api/organizations/route'
import { axiosApiInstance } from '@/shared/lib/axios'
import { RolePermission } from '@/shared/types/role-permission'
import { APIResponse } from '@/shared/types'

export const useShowOrganization = (orgId: string) => {
  return useQuery<Organization>({
    queryKey: ['organizations', orgId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<Organization>(`/organizations/${orgId}`)
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export const useGetOrganizations = (options?: { enabled?: boolean }) => {
  const { enabled = true } = options ?? {}
  return useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<Organization[]>>(`/organizations`)
      return data.data
    },
    refetchOnWindowFocus: false,
    enabled,
  })
}
export const useGetOrgPermissions = (orgId: string) => {
  return useQuery<RolePermission[]>({
    queryKey: ['org-permissions', orgId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<RolePermission[]>(
        `/organizations/${orgId}/permissions`
      )
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
