import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { HeatmapClicksResponse, TopInteractionPage, DeviceType, RageClickElement, ScrollHeatmapResponse, ScrollDepthMilestone } from '../types'

export const useGetHeatmapClicks = (
  orgId: string,
  pagePath: string | null,
  from: string,
  to: string,
  deviceType?: DeviceType,
  hostname?: string,
  targetWidth?: number,
  tpId?: string | null,
  targetHeight?: number
) => {
  return useQuery<HeatmapClicksResponse>({
    queryKey: ['organizations', orgId, 'heatmap', 'clicks', pagePath, from, to, deviceType, hostname, targetWidth, tpId, targetHeight ?? null],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/heatmap/clicks`, {
        params: { page_path: pagePath, from, to, device_type: deviceType, hostname, target_width: targetWidth, tp_id: tpId ?? undefined, target_height: targetHeight },
      })
      return data.data
    },
    enabled: !!orgId && !!pagePath && !!from && !!to,
  })
}

export const useGetRageClicks = (
  orgId: string,
  pagePath: string | null,
  from: string,
  to: string,
  deviceType?: DeviceType,
  hostname?: string,
  tpId?: string | null
) => {
  return useQuery<RageClickElement[]>({
    queryKey: ['organizations', orgId, 'heatmap', 'rage-clicks', pagePath, from, to, deviceType, hostname, tpId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/heatmap/rage-clicks`, {
        params: { page_path: pagePath, from, to, device_type: deviceType, hostname, tp_id: tpId ?? undefined },
      })
      return data.data
    },
    enabled: !!orgId && !!pagePath && !!from && !!to,
  })
}

export const useGetScrollHeatmap = (
  orgId: string,
  pagePath: string | null,
  from: string,
  to: string,
  deviceType?: DeviceType,
  hostname?: string,
) => {
  return useQuery<ScrollHeatmapResponse>({
    queryKey: ['organizations', orgId, 'heatmap', 'scroll', pagePath, from, to, deviceType, hostname],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/heatmap/scroll`, {
        params: { page_path: pagePath, from, to, device_type: deviceType, hostname },
      })
      const resp = data.data as { total_sessions: number; milestones: Omit<ScrollDepthMilestone, 'pct_of_total'>[] }
      const total = resp.total_sessions || 1
      return {
        total_sessions: resp.total_sessions,
        milestones: resp.milestones.map((m) => ({
          ...m,
          pct_of_total: Math.round((m.sessions_reached / total) * 100),
        })),
      }
    },
    enabled: !!orgId && (!!pagePath || !!hostname) && !!from && !!to,
  })
}

export const useGetTopPages = (orgId: string, from: string, to: string, tpId?: string | null) => {
  return useQuery<TopInteractionPage[]>({
    queryKey: ['organizations', orgId, 'heatmap', 'pages', from, to, tpId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/heatmap/pages`, {
        params: { from, to, tp_id: tpId ?? undefined },
      })
      return data.data
    },
    enabled: !!orgId && !!from && !!to,
  })
}
