'use client'
import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { OrgMember } from '@/core/types/org-member.type'

export const useGetOrgMembers = (org_id: string) => {
  return useQuery<OrgMember[]>({
    queryKey: ['organizations', org_id, 'members'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: OrgMember[] }>(
        `/organizations/${org_id}/members`
      )
      return data.data
    },
    enabled: !!org_id,
  })
}
