import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse, PaginationResponse, SearchFilterPagination } from '@/shared/types'
import { StaticQrItem } from '@/features/touch-points/components/static-qr/static-qr.types'

export const useGetStaticQrs = (
  org_id: string,
  params?: SearchFilterPagination & {
    pagination?: { pageIndex: number; pageSize: number }
    search?: string
    sorting?: Array<{ id: string; desc: boolean }>
    filters?: Record<string, any>
  }
) => {
  return useQuery<PaginationResponse<StaticQrItem>>({
    queryKey: ['organizations', org_id, 'static-qr', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<StaticQrItem>>(
        `/organizations/${org_id}/static-qr`,
        { params }
      )
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export const useGetStaticQr = (org_id: string, staticQrId: string) => {
  return useQuery<StaticQrItem>({
    queryKey: ['organizations', org_id, 'static-qr', staticQrId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<StaticQrItem>>(
        `/organizations/${org_id}/static-qr/${staticQrId}`
      )
      return data.data
    },
    enabled: !!staticQrId,
  })
}
