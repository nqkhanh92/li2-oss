import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { CreateDashboardInput, UpdateDashboardInput, UpdateLayoutInput } from '@/shared/schemas/dashboards'
import type { WidgetConfig, FormulaConfig, DateOverride } from '../types'
import type { UpdateAccessInput, AddMemberInput } from '@/shared/schemas/dashboard-members'

export function useCreateDashboard(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateDashboardInput) => {
      const { data } = await axiosApiInstance.post(`/organizations/${orgId}/dashboards`, input)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards'] })
    },
  })
}

export function useUpdateDashboard(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateDashboardInput) => {
      const { data } = await axiosApiInstance.put(
        `/organizations/${orgId}/dashboards/${dashboardId}`, input
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards'] })
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards', dashboardId] })
    },
  })
}

export function useDeleteDashboard(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dashboardId: string) => {
      await axiosApiInstance.delete(`/organizations/${orgId}/dashboards/${dashboardId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards'] })
    },
  })
}

export function useUpdateLayout(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateLayoutInput) => {
      const { data } = await axiosApiInstance.put(
        `/organizations/${orgId}/dashboards/${dashboardId}/layout`, input
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards', dashboardId] })
    },
  })
}

export function useAddWidget(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      widget_type: 'standard' | 'formula'
      config: WidgetConfig
      formula_config?: FormulaConfig | null
      position: { x: number; y: number; w: number; h: number }
      date_override?: DateOverride | null
    }) => {
      const { data } = await axiosApiInstance.post(
        `/organizations/${orgId}/dashboards/${dashboardId}/widgets`, input
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards', dashboardId] })
    },
  })
}

export function useUpdateWidget(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ widgetId, input }: {
      widgetId: string
      input: {
        name?: string
        config?: WidgetConfig
        position?: { x: number; y: number; w: number; h: number }
        date_override?: DateOverride | null
      }
    }) => {
      const { data } = await axiosApiInstance.put(
        `/organizations/${orgId}/dashboards/${dashboardId}/widgets/${widgetId}`,
        input,
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards', dashboardId] })
    },
  })
}

export function useDeleteWidget(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (widgetId: string) => {
      await axiosApiInstance.delete(
        `/organizations/${orgId}/dashboards/${dashboardId}/widgets/${widgetId}`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards', dashboardId] })
    },
  })
}

// ── Phase 2c: Sharing mutations ──

export function useUpdateAccess(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateAccessInput) => {
      const { data } = await axiosApiInstance.put(
        `/organizations/${orgId}/dashboards/${dashboardId}/access`, input
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards', dashboardId] })
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards'] })
    },
  })
}

export function useAddDashboardMember(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddMemberInput) => {
      const { data } = await axiosApiInstance.post(
        `/organizations/${orgId}/dashboards/${dashboardId}/members`, input
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'dashboards', dashboardId, 'members'],
      })
    },
  })
}

export function useUpdateDashboardMemberRole(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'viewer' | 'editor' }) => {
      const { data } = await axiosApiInstance.patch(
        `/organizations/${orgId}/dashboards/${dashboardId}/members/${memberId}`,
        { role }
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'dashboards', dashboardId, 'members'],
      })
    },
  })
}

export function useRemoveDashboardMember(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      await axiosApiInstance.delete(
        `/organizations/${orgId}/dashboards/${dashboardId}/members/${memberId}`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'dashboards', dashboardId, 'members'],
      })
    },
  })
}

export function useTransferOwnership(orgId: string, dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { newOwnerId: string; losesAccess?: boolean }) => {
      const { data } = await axiosApiInstance.post(
        `/organizations/${orgId}/dashboards/${dashboardId}/transfer`,
        { new_owner_id: input.newOwnerId }
      )
      return data.data
    },
    onSuccess: (_data, input) => {
      // When the previous owner loses access, scope the invalidation exactly to
      // the list key — the default prefix match would cascade into still-mounted
      // detail queries, each refetching and 403-ing before navigation completes.
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'dashboards'],
        exact: input.losesAccess === true,
      })
    },
  })
}

export function useTogglePin(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dashboardId: string) => {
      const { data } = await axiosApiInstance.post(
        `/organizations/${orgId}/dashboards/${dashboardId}/pin`
      )
      return data.data as { pinned: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards'] })
    },
  })
}

export function useDuplicateDashboard(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dashboardId: string) => {
      const { data } = await axiosApiInstance.post(
        `/organizations/${orgId}/dashboards/${dashboardId}/duplicate`
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'dashboards'] })
    },
  })
}
