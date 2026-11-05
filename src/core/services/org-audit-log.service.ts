import { supabaseService } from '@/infrastructure/database/supabase'
import { logger } from '@/infrastructure/logging/logger'
import { Database } from '@/shared/types/database.types'
import { getObjectDiff } from '../../shared/lib/utils'
import { enqueueAuditLog, enqueueBulkAuditLogs } from '@/infrastructure/queue/audit-log-queue'
import dayjs from 'dayjs'
import { ActionType, ModuleType } from '../types/org-audit-log.type'

type TargetTableType = keyof Database['public']['Tables']

type ChangeType = {
  old: any
  new: any
}
type ChangesType = Record<string, ChangeType>
type MetadataType = Record<string, any>

export interface OrgAuditLog {
  organization_id: string
  user_id?: string | null
  module: ModuleType
  action: ActionType
  target_id?: string | null
  target_name?: string | null
  target_table?: TargetTableType | null
  target_extra?: Record<string, any> | null
  changes?: ChangesType | null
  metadata?: MetadataType | null
  created_at?: string
}

export interface AuditLogFilters {
  module?: ModuleType | ModuleType[]
  action?: ActionType | ActionType[]
  user_id?: string
  target_id?: string
  start_date?: string
  end_date?: string
  retention_days?: number
  limit?: number
  page?: number
  search?: string
}

export interface ExportOptions extends AuditLogFilters {
  format: 'csv' | 'json'
}

const log = logger.child({ service: 'OrgAuditLogService' })
export class OrgAuditLogService {
  constructor() {}
  async getDestinationHistory(
    orgId: string,
    tpId: string,
    start_time?: string,
    end_time?: string,
    timezone?: string
  ) {
    const { data: history, error: history_error } = await supabaseService
      .schema('logs')
      .rpc('get_destination_history_v2', {
        p_org_id: orgId,
        p_tp_id: tpId,
        p_start_time: start_time,
        p_end_time: end_time,
        p_timezone: timezone,
      })
    if (history_error) {
      throw history_error
    }
    return history
  }

  /**
   * Generates changes diff and logs event asynchronously
   * This method is non-blocking and fire-and-forget
   */
  generateChangesAndLogEvent(
    event: Omit<OrgAuditLog, 'changes'>,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    options?: {
      changeKeys: string[]
    }
  ): void {
    let changes = getObjectDiff(oldData, newData)
    if (options?.changeKeys) {
      changes = Object.fromEntries(
        Object.entries(changes).filter(([key]) => options.changeKeys.includes(key))
      )
    }
    this.logEvent({ ...event, changes })
  }

  /**
   * Enqueues multiple audit log events asynchronously
   * This method is non-blocking and fire-and-forget
   *
   * Each event is enqueued to Redis queue for processing by li2-worker
   */
  bulkLogEvent(events: OrgAuditLog[]): void {
    enqueueBulkAuditLogs(events)
  }

  /**
   * Enqueues an audit log event to be processed asynchronously by li2-worker
   * This method is non-blocking and fire-and-forget - it never throws errors
   *
   * The event is enqueued to Redis queue where li2-worker will:
   * - Process it and insert into logs.org_audit_logs table
   * - Retry up to 3 times with fixed intervals (1min, 5min, 15min)
   * - Move to logs.failed_audit_logs if all retries fail
   *
   * @param event - Audit log event data
   */
  logEvent(event: OrgAuditLog): void {
    enqueueAuditLog(event)
  }

  async getAuditLogs(
    orgId: string,
    filters: AuditLogFilters = {}
  ): Promise<{ data: any[]; count: number }> {
    const {
      module,
      action,
      user_id,
      target_id,
      start_date,
      end_date,
      retention_days,
      limit = 50,
      page = 1,
      search,
    } = filters

    const offset = (page - 1) * limit

    // Convert module and action to arrays if they're not already
    const moduleArray = module ? (Array.isArray(module) ? module : [module]) : undefined
    const actionArray = action ? (Array.isArray(action) ? action : [action]) : undefined

    // Use RPC to get audit logs with user information (cross-schema join)
    const { data, error } = await supabaseService.schema('logs').rpc('get_audit_logs_with_users', {
      p_org_id: orgId,
      p_module: moduleArray || undefined,
      p_action: actionArray || undefined,
      p_user_id: user_id || undefined,
      p_target_id: target_id || undefined,
      p_start_date: start_date || undefined,
      p_end_date: end_date || undefined,
      p_retention_days: retention_days || undefined,
      p_limit: limit,
      p_offset: offset,
      p_search: search || undefined,
    })

    if (error) {
      throw new Error(error.message)
    }

    // Get count using separate RPC
    const { data: countData, error: countError } = await supabaseService
      .schema('logs')
      .rpc('count_audit_logs', {
        p_org_id: orgId,
        p_module: moduleArray || undefined,
        p_action: actionArray || undefined,
        p_user_id: user_id || undefined,
        p_target_id: target_id || undefined,
        p_start_date: start_date || undefined,
        p_end_date: end_date || undefined,
        p_retention_days: retention_days || undefined,
        p_search: search || undefined,
      })

    if (countError) {
      throw new Error(countError.message)
    }

    // Transform data to match expected format with nested profiles object
    const transformedData = (data || []).map((log: any) => ({
      id: log.id,
      organization_id: log.organization_id,
      user_id: log.user_id,
      module: log.module,
      action: log.action,
      target_id: log.target_id,
      target_name: log.target_name,
      target_table: log.target_table,
      target_extra: log.target_extra,
      changes: log.changes,
      metadata: log.metadata,
      created_at: log.created_at,
      profiles: log.user_id
        ? {
            id: log.user_id,
            name: log.user_name,
            email: log.user_email,
          }
        : null,
    }))

    return { data: transformedData, count: countData || 0 }
  }

  async getAuditLogById(logId: string, orgId: string): Promise<any | null> {
    const { data, error } = await supabaseService
      .schema('logs')
      .from('org_audit_logs')
      .select(
        `
        *,
        profiles!user_id (
          id,
          name,
          email,
          avatar
        )
      `
      )
      .eq('id', logId)
      .eq('organization_id', orgId)
      .single()

    if (error) {
      return null
    }

    return data
  }

  async getResourceAuditTrail(
    orgId: string,
    resourceId: string,
    options: { retention_days?: number } = {}
  ): Promise<any[]> {
    let query = supabaseService
      .schema('logs')
      .from('org_audit_logs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('target_id', resourceId)

    // Apply retention filtering
    if (options.retention_days) {
      const cutoffDate = dayjs().subtract(options.retention_days, 'days').toISOString()
      query = query.gte('created_at', cutoffDate)
    }

    // Order chronologically (oldest first)
    query = query.order('created_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  async exportAuditLogs(orgId: string, options: ExportOptions): Promise<string> {
    const { format, ...filters } = options

    // Fetch all logs without pagination for export
    const query = await this.getAuditLogs(orgId, {
      ...filters,
      limit: 10000, // Max limit for export
      page: 1,
    })

    const logs = query.data

    if (format === 'csv') {
      if (logs.length === 0) {
        return ''
      }

      // CSV headers
      const headers = [
        'id',
        'organization_id',
        'user_id',
        'module',
        'action',
        'target_id',
        'target_name',
        'target_table',
        'created_at',
      ]

      // CSV rows
      const rows = logs.map((log) => {
        return [
          log.id,
          log.organization_id,
          log.user_id || '',
          log.module,
          log.action,
          log.target_id || '',
          log.target_name || '',
          log.target_table || '',
          log.created_at,
        ]
          .map((value) => `"${value}"`)
          .join(',')
      })

      return [headers.join(','), ...rows].join('\n')
    } else if (format === 'json') {
      return JSON.stringify(logs)
    }

    throw new Error(`Unsupported export format: ${format}`)
  }
}

export const orgAuditLogService = globalThis._orgAuditLogService ?? new OrgAuditLogService()

if (process.env.NODE_ENV !== 'production') globalThis._orgAuditLogService = orgAuditLogService
