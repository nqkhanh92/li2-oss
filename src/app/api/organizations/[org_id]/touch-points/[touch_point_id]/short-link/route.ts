import { NextRequest, NextResponse } from 'next/server'
import { updateShortLinkSchema } from '@/shared/schemas/touch-points'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { Tables } from '@/shared/types/database.types'
import { logger } from '@/infrastructure/logging/logger'
import { slugService } from '@/core/services/slug.service'
import { touchPointService } from '@/core/services/touch-point.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

export type Slug = Tables<'slugs'>
const log = logger.child({ module: 'touch-point-short-link' })
export const GET = withAuth<{ org_id: string; touch_point_id: string }>(
  async (request: NextRequest, { params, context }) => {
    /* Check permission - use touch point service to check collection-based permissions */
    await touchPointService.ensureCanViewTouchPoint(
      params.org_id,
      params.touch_point_id,
      context.userId
    )

    // If permission check passes, get the slugs without scope filtering
    const tp = await slugService.getTpSlugs(params.org_id, params.touch_point_id)
    return NextResponse.json(tp)
  }
)

export const PATCH = withAuth<{ org_id: string; touch_point_id: string }>(
  async (request: NextRequest, { params, context }) => {
    /* Check permission - use touch point service to check collection-based permissions */
    await touchPointService.ensureCanEditTouchPoint(
      params.org_id,
      params.touch_point_id,
      context.userId
    )

    const body = await request.json()
    /* Get form data & validate form */
    const validatedData = updateShortLinkSchema.parse(body)

    if (validatedData.slug) {
      await touchPointService.updateTpSlug(
        params.org_id,
        params.touch_point_id,
        validatedData.slug,
        context.userId
      )
    }

    return APIResponse.updated({
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
