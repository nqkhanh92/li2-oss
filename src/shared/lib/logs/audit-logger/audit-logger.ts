import { Database } from '@/shared/types/database.types'
import { supabaseService } from '../../../../infrastructure/database/supabase'
import { createServiceClient } from '../../../../infrastructure/database/supabase/server'
import dayjs from 'dayjs'
import { logger } from '@/infrastructure/logging/logger'

type EventType =
  | 'PREMIUM_GRANT_ATTEMPT'
  | 'PREMIUM_GRANT_SUCCESS'
  | 'PREMIUM_GRANT_ERROR'
  | 'PREMIUM_GRANT_FAILED'
  | 'USER_REGISTRATION'
  | 'EMAIL_NOTIFICATION_SENT'
  | 'EMAIL_NOTIFICATION_REQUESTED'
  | 'AUTHENTICATION_ERROR'
export interface AuditEvent {
  eventType: EventType
  userId?: string
  timestamp?: Date
  requestId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  result?: 'SUCCESS' | 'FAILED' | 'ERROR'
  reason?: string
  counterBefore?: number
  counterAfter?: number
  userSequenceNumber?: number
  errorMessage?: string
  metadata?: Record<string, any>
}

export interface EventFilter {
  eventType?: EventType
  userId?: string
  startDate?: Date
  endDate?: Date
  result?: 'SUCCESS' | 'FAILED' | 'ERROR'
  limit?: number
  offset?: number
}
export interface AuditLoggerConfig {
  schema: 'logs'
  table: 'audit_logs'
}

type AuditLog = Database['logs']['Tables']['audit_logs']['Insert']
const log = logger.child({
  module: 'audit-logger',
})

export class AuditLogger<T extends AuditLoggerConfig> {
  protected config: T
  constructor(config: T) {
    this.config = config
  }
  async logEvent(module: string, event: AuditEvent): Promise<void> {
    const auditLog: AuditLog = {
      event_type: event.eventType,
      user_id: event.userId || null,
      timestamp: event.timestamp?.toISOString() || undefined,
      request_id: event.requestId || null,
      session_id: event.sessionId || null,
      ip_address: event.ipAddress || null,
      user_agent: event.userAgent || null,
      result: event.result || null,
      reason: event.reason || null,
      counter_before: event.counterBefore || null,
      counter_after: event.counterAfter || null,
      user_sequence_number: event.userSequenceNumber || null,
      metadata: event.metadata || null,
    }

    await supabaseService
      .schema('logs')
      .from('audit_logs')
      .insert(auditLog)
      .then(({ error }) => {
        if (error) {
          log.error({ error })
        }
      })
    return Promise.resolve()
  }
  logBatch(module: string, events: AuditEvent[]): Promise<void> {
    return Promise.resolve()
  }
  queryEvents(filter: EventFilter): Promise<AuditEvent[]> {
    return Promise.resolve([])
  }
}
