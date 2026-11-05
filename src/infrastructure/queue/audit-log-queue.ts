// import 'server-only'
import { logger } from '@/infrastructure/logging/logger'
import type { OrgAuditLog } from '@/core/services/org-audit-log.service'
import { enqueueTask } from './asynq-client'
import { TASK_AUDIT_LOG_CREATE, QUEUE_NAMES } from './constants'

const log = logger.child({
  module: 'AuditLogQueue',
})
/**
 * Enqueues an audit log event to be processed asynchronously by li2-worker
 *
 * This function is fire-and-forget - it never throws errors and never blocks
 * the caller. If enqueueing fails, the error is logged but the main operation
 * continues successfully.
 *
 * The worker (li2-worker) will:
 * - Process the event and insert into logs.org_audit_logs table
 * - Retry up to 3 times with fixed intervals (1min, 5min, 15min)
 * - Move to logs.failed_audit_logs if all retries fail
 *
 * @param event - Audit log event data
 */
export function enqueueAuditLog(event: OrgAuditLog): void {
  // Set created_at to capture event time (not processing time)
  const eventWithTimestamp = {
    ...event,
    created_at: event.created_at || new Date().toISOString(),
  }

  // Fire-and-forget: don't await, don't throw
  enqueueTask(TASK_AUDIT_LOG_CREATE, eventWithTimestamp, {
    queue: QUEUE_NAMES.AUDIT_LOGS,
    maxRetry: 3,
    timeout: 30,
  }).catch((error) => {
    // This catch is extra safety - enqueueTask already catches errors
    log.error(
      { error, event: eventWithTimestamp },
      'Critical: Failed to enqueue audit log task'
    )
  })
}

/**
 * Enqueues multiple audit log events in bulk
 *
 * Each event will have its created_at timestamp set if not already provided,
 * ensuring accurate event timing even if queue processing is delayed.
 *
 * @param events - Array of audit log events
 */
export function enqueueBulkAuditLogs(events: OrgAuditLog[]): void {
  events.forEach((event) => enqueueAuditLog(event))
}
