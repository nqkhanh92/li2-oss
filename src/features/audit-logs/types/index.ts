import { OrgAuditLog } from '@/core/services/org-audit-log.service'
import { SearchFilterPagination } from '@/shared/types'

// Frontend types for audit logs
export type AuditLog = OrgAuditLog & {
  id: string
  created_at: string
  profiles?: {
    id: string
    name?: string
    email?: string
    avatar?: string | null
  }
}

export type AuditLogFilters = {
  module?: string[]
  action?: string[]
  user_id?: string
  target_id?: string
  created_at?: {
    from?: number
    to?: number
  }
}

export type AuditLogQueryParams = SearchFilterPagination & {
  filters?: AuditLogFilters
}

export type ExportAuditLogsParams = {
  format: 'csv' | 'json'
  module?: string | string[]
  action?: string | string[]
  user_id?: string
  start_date?: string
  end_date?: string
}
