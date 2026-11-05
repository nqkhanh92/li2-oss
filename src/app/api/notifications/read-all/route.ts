import { NextRequest } from 'next/server'
import { notificationService } from '@/core/services/notification.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
export const PATCH = withAuth(async (request: NextRequest, { context }) => {
  const searchParams = request.nextUrl.searchParams
  const organizationId = searchParams.get('organizationId')

  const notifications = await notificationService.markAllAsRead(
    context.userId,
    organizationId || undefined
  )

  return APIResponse.ok({
    data: notifications,
    message: 'All notifications marked as read',
  })
})
