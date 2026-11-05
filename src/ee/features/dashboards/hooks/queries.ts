import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { DashboardWithWidgets, DashboardMember, WidgetConfig, FormulaConfig, WidgetDataResult, BatchWidgetResult } from '../types'
import type { OrgMember } from '@/core/types/org-member.type'

export function useGetDashboards(orgId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', orgId, 'dashboards'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(`/organizations/${orgId}/dashboards`)
      return data.data as DashboardWithWidgets[]
    },
    enabled: !!orgId,
  })
}

export function useGetDashboard(orgId: string | undefined, dashboardId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', orgId, 'dashboards', dashboardId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/dashboards/${dashboardId}`
      )
      return data.data as DashboardWithWidgets
    },
    enabled: !!orgId && !!dashboardId,
  })
}

export function useGetWidgetData(
  orgId: string | undefined,
  dashboardId: string | undefined,
  widgetId: string | undefined,
  dateRange: { date_from: string; date_to: string }
) {
  return useQuery({
    queryKey: [
      'organizations', orgId, 'dashboards', dashboardId,
      'widgets', widgetId, 'data', dateRange,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        date_from: dateRange.date_from,
        date_to: dateRange.date_to,
      })
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/dashboards/${dashboardId}/widgets/${widgetId}/data?${params}`
      )
      return data.data as WidgetDataResult
    },
    enabled: !!orgId && !!dashboardId && !!widgetId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useBatchWidgetData(
  orgId: string | undefined,
  dashboardId: string | undefined,
  dateRange: { date_from: string; date_to: string },
) {
  return useQuery({
    queryKey: [
      'organizations', orgId, 'dashboards', dashboardId,
      'widgets', 'batch', dateRange,
    ],
    queryFn: async ({ signal }) => {
      const { data } = await axiosApiInstance.post(
        `/organizations/${orgId}/dashboards/${dashboardId}/widgets/data/batch`,
        dateRange,
        { signal },
      )
      return data.data as Record<string, BatchWidgetResult>
    },
    enabled: !!orgId && !!dashboardId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGetOrgMembersForDashboard(orgId: string | undefined, dashboardId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', orgId, 'dashboards', dashboardId, 'org-members'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/dashboards/${dashboardId}/org-members`
      )
      return data.data as OrgMember[]
    },
    enabled: !!orgId && !!dashboardId,
  })
}

type PreviewInput =
  | { widget_type: 'standard'; config: WidgetConfig }
  | { widget_type: 'formula'; formula_config: FormulaConfig }

export function usePreviewWidgetData(
  orgId: string | undefined,
  dashboardId: string | undefined,
  input: PreviewInput | undefined,
  dateRange: { date_from: string; date_to: string },
) {
  return useQuery({
    queryKey: [
      'organizations', orgId, 'dashboards', dashboardId,
      'widgets', 'preview', input, dateRange,
    ],
    queryFn: async ({ signal }) => {
      let body: Record<string, unknown>
      if (!input) return null
      if (input.widget_type === 'formula') {
        body = { widget_type: 'formula', formula_config: input.formula_config, ...dateRange }
      } else {
        body = { widget_type: 'standard', config: input.config, ...dateRange }
      }
      const { data } = await axiosApiInstance.post(
        `/organizations/${orgId}/dashboards/${dashboardId}/widgets/data/preview`,
        body,
        { signal },
      )
      return data.data as WidgetDataResult | BatchWidgetResult
    },
    enabled: !!orgId && !!dashboardId && !!input,
    staleTime: 30 * 1000,
  })
}

export function useGetDashboardMembers(orgId: string | undefined, dashboardId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', orgId, 'dashboards', dashboardId, 'members'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get(
        `/organizations/${orgId}/dashboards/${dashboardId}/members`
      )
      return data.data as DashboardMember[]
    },
    enabled: !!orgId && !!dashboardId,
  })
}
