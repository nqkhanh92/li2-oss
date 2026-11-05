import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { FormsOverviewRow, FormsDailyRow } from '@/core/repositories/forms-analytics.repository'

export type FormsDateParams = {
  date_from: string
  date_to: string
  hostname?: string | null
}

export type FormsDailyParams = FormsDateParams & {
  form_id?: string | null
  form_name?: string | null
  page_path?: string | null
}

export const useGetFormsOverview = (
  orgId: string,
  params: FormsDateParams,
  options?: Partial<Parameters<typeof useQuery<FormsOverviewRow[]>>[0]>
) => {
  return useQuery<FormsOverviewRow[]>({
    queryKey: ['forms-overview', orgId, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/analytics/forms/overview`,
        { params }
      )
      return data.data ?? []
    },
    enabled: !!orgId,
    ...options,
  })
}

export const useGetFormsDaily = (
  orgId: string,
  params: FormsDailyParams,
  options?: Partial<Parameters<typeof useQuery<FormsDailyRow[]>>[0]>
) => {
  return useQuery<FormsDailyRow[]>({
    queryKey: ['forms-daily', orgId, params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/analytics/forms/daily`,
        { params }
      )
      return data.data ?? []
    },
    enabled: !!orgId,
    ...options,
  })
}
