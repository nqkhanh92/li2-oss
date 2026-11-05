import { NextRequest } from 'next/server'
import { getSession } from '@/shared/lib/auth/session'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { touchPointService } from '@/core/services/touch-point.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { z } from 'zod'

const bulkPermissionsSchema = z.object({
  touchPointIds: z.array(z.string().uuid()),
})

/**
 * POST /api/organizations/[org_id]/touch-points/permissions/bulk
 * Check user's permissions for multiple touch-points at once
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { org_id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      throw new UnauthorizedError()
    }

    const body = await request.json()
    const { touchPointIds } = bulkPermissionsSchema.parse(body)

    // Check permissions for each touch-point in parallel
    const permissions = await Promise.all(
      touchPointIds.map(async (touchPointId) => {
        const [canView, canEdit, canDelete] = await Promise.all([
          touchPointService.canViewTouchPoint(params.org_id, touchPointId, session.sub),
          touchPointService.canEditTouchPoint(params.org_id, touchPointId, session.sub),
          touchPointService.canDeleteTouchPoint(params.org_id, touchPointId, session.sub),
        ])

        return {
          touchPointId,
          canView,
          canEdit,
          canDelete,
        }
      })
    )

    return APIResponse.ok({
      permissions,
    })
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error.message).toResponse()
  }
}
