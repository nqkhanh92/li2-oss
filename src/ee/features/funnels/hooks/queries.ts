import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import qs from 'qs'
import {
  FunnelListItem,
  FunnelReportResult,
  FunnelWithSteps,
  StepVisitorsResponse,
  SessionWithPageviews,
} from '../types'
import type { PaginationState, SortingState } from '@/shared/hooks/use-filters'

type FunnelsParams = {
  search?: string
  pagination?: PaginationState
  sorting?: SortingState
}

export const useGetFunnels = (orgId: string, params?: FunnelsParams) => {
  return useQuery<{ data: FunnelListItem[]; rowCount: number }>({
    queryKey: ['organizations', orgId, 'funnels', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/funnels`, {
        params,
        paramsSerializer: (p) => qs.stringify(p, { encodeValuesOnly: true }),
      })
      return data
    },
    enabled: !!orgId,
  })
}

export const useGetFunnel = (orgId: string, funnelId: string) => {
  return useQuery<{ data: FunnelWithSteps }>({
    queryKey: ['organizations', orgId, 'funnels', funnelId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/funnels/${funnelId}`
      )
      return data
    },
    enabled: !!orgId && !!funnelId,
  })
}

export const useGetFunnelReport = (
  orgId: string,
  funnelId: string,
  from: string,
  to: string,
  options?: { refetchInterval?: number | false }
) => {
  return useQuery<{ data: FunnelReportResult }>({
    queryKey: ['organizations', orgId, 'funnels', funnelId, 'report', from, to],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/funnels/${funnelId}/report`,
        { params: { from, to } }
      )
      return data
    },
    enabled: !!orgId && !!funnelId && !!from && !!to,
    refetchInterval: options?.refetchInterval,
  })
}

export const useGetStepVisitors = (
  orgId: string,
  funnelId: string,
  stepPosition: number,
  params: { from: string; to: string; filter: string; page: number; limit: number }
) => {
  return useQuery<{ data: StepVisitorsResponse }>({
    queryKey: [
      'organizations',
      orgId,
      'funnels',
      funnelId,
      'steps',
      stepPosition,
      'visitors',
      params,
    ],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/funnels/${funnelId}/steps/${stepPosition}/visitors`,
        { params }
      )
      return data
    },
    enabled: !!orgId && !!funnelId && stepPosition > 0 && !!params.from && !!params.to,
  })
}

export const useGetSessionPageviews = (orgId: string, sessionId: string) => {
  return useQuery<{ data: SessionWithPageviews }>({
    queryKey: ['organizations', orgId, 'sessions', sessionId, 'pageviews'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/sessions/${sessionId}/pageviews`
      )
      return data
    },
    enabled: !!orgId && !!sessionId,
  })
}
