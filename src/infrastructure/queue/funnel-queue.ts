import 'server-only'
import { logger } from '@/infrastructure/logging/logger'
import { enqueueTask } from './asynq-client'
import { TASK_FUNNEL_RETROACTIVE, QUEUE_NAMES } from './constants'

const log = logger.child({
  module: 'FunnelQueue',
})

interface FunnelRetroactivePayload {
  funnel_id: string
  organization_id: string
}

/**
 * Enqueues a retroactive funnel computation task.
 * Called after funnel create/update to compute historical metrics.
 *
 * Fire-and-forget: errors are logged but don't throw.
 * This matches li2-be's EnqueueFunnelRetroactiveTask behavior.
 */
export function enqueueFunnelRetroactiveTask(
  funnelId: string,
  organizationId: string
): void {
  const payload: FunnelRetroactivePayload = {
    funnel_id: funnelId,
    organization_id: organizationId,
  }

  // Fire-and-forget: don't await, don't throw
  enqueueTask(TASK_FUNNEL_RETROACTIVE, payload, {
    queue: QUEUE_NAMES.DEFAULT,
    maxRetry: 2, // Match li2-be's maxRetry: 2
    timeout: 300, // 5 minutes (90-day computation can take time)
  }).catch((error) => {
    log.error(
      { error, funnelId, organizationId },
      'Failed to enqueue funnel retroactive task'
    )
  })
}
