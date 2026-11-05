import { NextRequest } from 'next/server'
import { notificationService } from '@/core/services/notification.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the current user
 */
export const GET = withAuth(async (request: NextRequest, { context }) => {
  const searchParams = request.nextUrl.searchParams
  const organizationId = searchParams.get('organizationId')

  const count = await notificationService.getUnreadCount(
    context.userId,
    organizationId || undefined
  )

  return APIResponse.ok({ data: { count } })
})
