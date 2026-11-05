import 'server-only'
import { logger } from '@/infrastructure/logging/logger'
import { enqueueTask } from './asynq-client'
import { TASK_EVENT_RULE_RETROACTIVE, QUEUE_NAMES } from './constants'

const log = logger.child({
  module: 'EventRuleQueue',
})

interface EventRuleRetroactivePayload {
  rule_id: string
  organization_id: string
}

/**
 * Enqueues a retroactive event rule processing task.
 * Called after event rule creation to scan historical interactions.
 *
 * Fire-and-forget: errors are logged but don't throw.
 */
export function enqueueEventRuleRetroactiveTask(
  ruleId: string,
  organizationId: string
): void {
  const payload: EventRuleRetroactivePayload = {
    rule_id: ruleId,
    organization_id: organizationId,
  }

  enqueueTask(TASK_EVENT_RULE_RETROACTIVE, payload, {
    queue: QUEUE_NAMES.DEFAULT,
    maxRetry: 2,
    timeout: 300, // 5 minutes (30-day scan can take time)
  }).catch((error) => {
    log.error(
      { error, ruleId, organizationId },
      'Failed to enqueue event rule retroactive task'
    )
  })
}
