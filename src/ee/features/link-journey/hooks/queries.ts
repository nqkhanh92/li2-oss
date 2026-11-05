import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type {
  LinkJourneyTouchPoint,
  TrafficSummary,
  PageFlowItem,
  BehavioralHighlights,
  ConversionSummary,
} from '../types'

export function useLinkJourneyTouchPoints(orgId: string) {
  return useQuery<LinkJourneyTouchPoint[]>({
    queryKey: ['link-journey', 'touch-points', orgId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/link-journey/touch-points`)
      return data.data
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLinkJourneyTraffic(orgId: string, tpId: string, from: string, to: string) {
  return useQuery<TrafficSummary>({
    queryKey: ['link-journey', 'traffic', orgId, tpId, from, to],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/link-journey/traffic`, {
        params: { tp_id: tpId, from, to },
      })
      return data.data
    },
    enabled: !!orgId && !!tpId && !!from && !!to,
  })
}

export function useLinkJourneyPageFlow(orgId: string, tpId: string, from: string, to: string) {
  return useQuery<PageFlowItem[]>({
    queryKey: ['link-journey', 'page-flow', orgId, tpId, from, to],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/link-journey/page-flow`, {
        params: { tp_id: tpId, from, to },
      })
      return data.data
    },
    enabled: !!orgId && !!tpId && !!from && !!to,
  })
}

export function useLinkJourneyBehavioral(orgId: string, tpId: string, from: string, to: string) {
  return useQuery<BehavioralHighlights>({
    queryKey: ['link-journey', 'behavioral', orgId, tpId, from, to],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/link-journey/behavioral`,
        { params: { tp_id: tpId, from, to } }
      )
      return data.data
    },
    enabled: !!orgId && !!tpId && !!from && !!to,
  })
}

export function useLinkJourneyConversions(orgId: string, tpId: string, from: string, to: string) {
  return useQuery<ConversionSummary>({
    queryKey: ['link-journey', 'conversions', orgId, tpId, from, to],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/link-journey/conversions`,
        { params: { tp_id: tpId, from, to } }
      )
      return data.data
    },
    enabled: !!orgId && !!tpId && !!from && !!to,
  })
}
