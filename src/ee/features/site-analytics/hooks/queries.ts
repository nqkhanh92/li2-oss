import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { SitePage, SitePageSession, SessionAnalytics } from '../types'

export interface PageSnapshot {
  session_id: string
  started_at: string
  page_url: string
  chunk_url: string
  device_type: string | null
  viewport_width: number | null
}

export const useGetSitePages = (orgId: string, from: string, to: string) => {
  return useQuery<SitePage[]>({
    queryKey: ['organizations', orgId, 'site-analytics', 'pages', from, to],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/site-analytics/pages`,
        { params: { from, to } },
      )
      return data.data
    },
    enabled: !!orgId && !!from && !!to,
  })
}

export const useGetSitePageSessions = (orgId: string, from: string, to: string) => {
  return useQuery<SitePageSession[]>({
    queryKey: ['organizations', orgId, 'site-analytics', 'sessions', from, to],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/site-analytics/sessions`,
        { params: { from, to } },
      )
      return data.data
    },
    enabled: !!orgId && !!from && !!to,
  })
}

export const useGetPageSnapshot = (
  orgId: string,
  hostname: string | null,
  pagePath: string | null,
  deviceType?: string,
  targetViewportWidth?: number,
) => {
  return useQuery<{ snapshots: PageSnapshot[] }>({
    queryKey: ['organizations', orgId, 'site-analytics', 'page-snapshot', hostname, pagePath, deviceType ?? null, targetViewportWidth ?? null],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/site-analytics/page-snapshot`,
        { params: { hostname, page_path: pagePath, device_type: deviceType, target_viewport_width: targetViewportWidth } },
      )
      return data.data
    },
    enabled: !!orgId && !!hostname && !!pagePath,
    staleTime: 5 * 60 * 1000,
  })
}

export const useGetSessionAnalytics = (
  orgId: string,
  from: string,
  to: string,
  hostname: string | null,
  page_path: string | null,
) => {
  return useQuery<SessionAnalytics>({
    queryKey: ['organizations', orgId, 'site-analytics', 'session-analytics', from, to, hostname, page_path],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/site-analytics/session-analytics`,
        { params: { from, to, hostname: hostname ?? undefined, page_path: page_path ?? undefined } },
      )
      return data.data
    },
    enabled: !!orgId && !!from && !!to && !!hostname,
  })
}
