import { sampleTagColors } from '@/shared/constants/sample-data'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { NextRequest, NextResponse } from 'next/server'
import { validate } from 'uuid'
import { GetTouchPointObject } from '../route'
import { TouchPointVariants } from '@/features/touch-points/types'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { getSession } from '@/shared/lib/auth/session'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { touchPointService } from '@/core/services/touch-point.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getRequestPayload } from '@/shared/lib/server-utils'
const log = logger.child({ module: 'touch-points/[touch_point_id]' })

export const GET = withAuth<{ org_id: string; touch_point_id: string }>(
  async (request: NextRequest, { params, context }) => {
    await touchPointService.ensureCanViewTouchPoint(
      params.org_id,
      params.touch_point_id,
      context.userId
    )
    const touchPoint = await touchPointService.getTouchPointDetail(
      params.org_id,
      params.touch_point_id
    )

    const canEdit = await touchPointService.canEditTouchPoint(
      params.org_id,
      params.touch_point_id,
      context.userId
    )

    const [enriched] = await touchPointService.enrichWithConversionCounts([touchPoint as any])

    return APIResponse.ok({
      data: { ...enriched, canEdit },
    })
  }
)

export const PATCH = withAuth<{ org_id: string; touch_point_id: string }>(
  async (request: NextRequest, { params, context }) => {
    //**Check collection-based edit permission */
    await touchPointService.ensureCanEditTouchPoint(
      params.org_id,
      params.touch_point_id,
      context.userId
    )

    //**Get form data & validate form */
    const json = await getRequestPayload(request)
    const validatedData = touchPointUpdateSchema.parse(json)
    const userId = context.userId
    const data = await touchPointService.updateAndReturn(
      params.org_id,
      params.touch_point_id,
      validatedData,
      userId
    )
    return APIResponse.updated({
      data: data,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: {
          field: 'Links',
        },
      },
    })
  }
)
// export async function PATCH(
//   request: NextRequest,
//   { params }: { params: { org_id: string; touch_point_id: string } }
// ) {
//   try {
//     //**Get form data & validate form */
//     const formData = await request.formData()
//     const json = formToJSON(formData)
//     const validatedData = touchPointUpdateSchema.parse(json)
//     const session = await getSession()
//     const data = await touchPointService.updateTpAndGet(
//       params.org_id,
//       params.touch_point_id,
//       validatedData,
//       session!.sub
//     )
//     return APIResponse.updated({
//       data: data,
//       success: true,
//       i18nMessage: {
//         key: 'common:messages.success.updated_field',
//         params: {
//           field: 'Link',
//         },
//       },
//     })
//   } catch (error: any) {
//     if (error instanceof BaseError) {
//       return error.toResponse()
//     }
//     console.log({ error })
//     return new AppError(error.message).toResponse()
//   }
// }

export const DELETE = withAuth<{ org_id: string; touch_point_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      // Check collection-based delete permission
      await touchPointService.ensureCanDeleteTouchPoint(
        params.org_id,
        params.touch_point_id,
        context.userId
      )

      await touchPointService.deleteTpById(params.org_id, params.touch_point_id, context.userId)
      return APIResponse.deleted({
        success: true,
        i18nMessage: {
          key: 'common:messages.success.deleted',
          params: {
            field: 'Links',
          },
        },
      })
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
