import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { PaginationResponse } from '@/shared/types'
import { AuditLog, AuditLogQueryParams } from '../types'
import { usePlanFeatures } from '@/features/touch-points/hooks'

/**
 * Get all audit logs in an organization with filtering and pagination
 */
export const useGetAuditLogs = (org_id: string, params?: AuditLogQueryParams) => {
  const { enableAuditLogs } = usePlanFeatures()
  return useQuery<PaginationResponse<AuditLog>>({
    queryKey: ['organizations', org_id, 'audit-logs', params],
    queryFn: async () => {
      // Transform nested params to flat structure for API
      const flatParams: Record<string, any> = {
        page: params?.pagination?.pageIndex ? params.pagination.pageIndex + 1 : 1,
        limit: params?.pagination?.pageSize || 20,
        search: params?.search,
      }

      // Add filter params - pass full arrays to support multiple selections
      if (
        params?.filters?.module &&
        Array.isArray(params.filters.module) &&
        params.filters.module.length > 0
      ) {
        flatParams.module = params.filters.module
      }
      if (
        params?.filters?.action &&
        Array.isArray(params.filters.action) &&
        params.filters.action.length > 0
      ) {
        flatParams.action = params.filters.action
      }
      if (params?.filters?.user_id) {
        flatParams.user_id = params.filters.user_id
      }
      if (params?.filters?.target_id) {
        flatParams.target_id = params.filters.target_id
      }
      if (params?.filters?.created_at?.from) {
        flatParams.start_date = new Date(params.filters.created_at.from).toISOString()
      }
      if (params?.filters?.created_at?.to) {
        flatParams.end_date = new Date(params.filters.created_at.to).toISOString()
      }

      const { data } = await axiosApiInstance.get<PaginationResponse<AuditLog>>(
        `/organizations/${org_id}/audit-logs`,
        { params: flatParams }
      )
      return data
    },
    enabled: !!org_id && !!enableAuditLogs,
  })
}

/**
 * Get a single audit log by ID
 */
export const useGetAuditLogById = (org_id: string, log_id: string, enabled = true) => {
  return useQuery<{ data: AuditLog }>({
    queryKey: ['organizations', org_id, 'audit-logs', log_id],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: AuditLog }>(
        `/organizations/${org_id}/audit-logs/${log_id}`
      )
      return data
    },
    enabled: enabled && !!log_id && !!org_id,
  })
}
