import { NextRequest } from 'next/server'
import { touchPointService } from '@/core/services/touch-point.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

/**
 * GET /api/organizations/[org_id]/touch-points/[touch_point_id]/permissions
 * Check user's permissions for a specific touch-point
 */
export const GET = withAuth<{ org_id: string; touch_point_id: string }>(
  async (request: NextRequest, { params, context }) => {
    const [canView, canEdit, canDelete] = await Promise.all([
      touchPointService.canViewTouchPoint(params.org_id, params.touch_point_id, context.userId),
      touchPointService.canEditTouchPoint(params.org_id, params.touch_point_id, context.userId),
      touchPointService.canDeleteTouchPoint(params.org_id, params.touch_point_id, context.userId),
    ])

    return APIResponse.ok({
      canView,
      canEdit,
      canDelete,
    })
  }
)
