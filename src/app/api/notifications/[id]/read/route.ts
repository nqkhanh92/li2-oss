import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/core/services/notification.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'

/**
 * PATCH /api/notifications/[id]/read
 * Mark a notification as read
 */
export const PATCH = withAuth<{ id: string }>(async (request: NextRequest, { params, context }) => {
  const notification = await notificationService.markAsRead(params.id, context.userId)

  return NextResponse.json(notification)
})
