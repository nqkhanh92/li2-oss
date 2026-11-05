import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'

type SubdomainAvailabilityResponse = {
  available: boolean
}

export const useSubdomainAvailability = (
  org_id: string,
  subdomain: string,
  baseDomain: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['subdomain-availability', org_id, subdomain, baseDomain],
    queryFn: async () => {
      const { data } = await axiosApiInstance.post<APIResponse<SubdomainAvailabilityResponse>>(
        `/organizations/${org_id}/subdomains/check-availability`,
        {
          subdomain,
          baseDomain,
        }
      )
      return data.data
    },
    enabled: enabled && subdomain.length >= 3,
    staleTime: 0, // Always refetch to ensure latest availability
    retry: false,
  })
}
