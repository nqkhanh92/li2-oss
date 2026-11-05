/**
 * Asynq task type constants
 * These must match the task types defined in li2-worker
 */

export const TASK_AUDIT_LOG_CREATE = 'task:audit_log:create'
export const TASK_NOTIFICATION_CREATE = 'task:notification:send'
export const TASK_FUNNEL_RETROACTIVE = 'task:funnel:retroactive'
export const TASK_EVENT_RULE_RETROACTIVE = 'task:event_rule:retroactive'
// NOT WIRED UP YET: no producer enqueues this and no handler consumes it. Planned for WP5 of
// docs/artifact-scan-clamav-spec.md (periodic re-check of short link destination URLs). Kept so the
// task name stays reserved and agreed with li2-worker — do not read its presence as working code.
export const TASK_SAFE_BROWSING_RESCAN = 'task:safe_browsing:rescan'
export const TASK_LARK_NOTIFY = 'task:lark:notify'

/**
 * Queue names and priorities
 */
export const QUEUE_NAMES = {
  CRITICAL: 'critical',
  DEFAULT: 'default',
  AUDIT_LOGS: 'audit_logs',
  NOTIFICATIONS: 'notifications',
  EMAIL: 'email',
  LOW: 'low',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]
