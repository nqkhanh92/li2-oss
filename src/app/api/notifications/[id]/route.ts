import { NextRequest } from 'next/server'
import { notificationService } from '@/core/services/notification.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export const DELETE = withAuth<{ id: string }>(
  async (request: NextRequest, { params, context }) => {
    await notificationService.deleteNotification(params.id, context.userId)

    return APIResponse.ok({
      message: 'Notification deleted successfully',
    })
  }
)
