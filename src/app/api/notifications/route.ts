import { NextRequest } from 'next/server'
import { notificationService } from '@/core/services/notification.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'

/**
 * GET /api/notifications
 * Get user notifications with pagination and filters
 */
export const GET = withAuth(async (request: NextRequest, { context }) => {
  const searchParams = request.nextUrl.searchParams
  const read = searchParams.get('read')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const organizationId = searchParams.get('organizationId')

  const result = await notificationService.getNotifications({
    userId: context.userId,
    read: read === 'true' ? true : read === 'false' ? false : undefined,
    type: type || undefined,
    limit,
    offset,
    organizationId: organizationId || undefined,
  })

  return APIResponse.ok({ data: result })
})
