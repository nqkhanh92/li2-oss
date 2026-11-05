import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { OrganizationAICredit } from '@/shared/types/plan-permission'

export const useGetOrganizationAICredits = (org_id: string) => {
  return useQuery({
    queryKey: ['organizations', org_id, 'credits'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<OrganizationAICredit>(
        `/organizations/${org_id}/credits`
      )
      return data
    },
    enabled: !!org_id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
