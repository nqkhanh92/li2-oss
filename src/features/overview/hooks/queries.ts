import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { OverviewData } from '../types'

export const useGetOverviewData = (orgId: string | undefined) => {
  return useQuery<OverviewData>({
    queryKey: ['overview', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const { data } = await axiosApiInstance.get<OverviewData>(
        `/organizations/${orgId}/overview`,
        { params: { timezone } }
      )
      return data
    },
  })
}
