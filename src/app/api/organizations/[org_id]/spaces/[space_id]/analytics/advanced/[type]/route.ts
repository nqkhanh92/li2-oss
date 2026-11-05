import { NextRequest, NextResponse } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import { logger } from '@/infrastructure/logging/logger'
import { analyticService } from '@/core/services/analytic.service'
import { collectionPermissionService } from '@/core/services/collection-permission.service'
import { AdvancedAnalyticTypes } from '@/core/types/analytics/advanced.type'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

const log = logger.child({
  service: 'space-advanced-analytics',
})

export const GET = withAuth(
  async (
    request: NextRequest,
    {
      params,
      context,
    }: { params: { org_id: string; space_id: string; type: string }; context: any }
  ) => {
    try {
      // Ensure user can view this space
      await collectionPermissionService.ensureCanView(
        params.org_id,
        params.space_id,
        context.userId
      )

      const queryParams = getQueryParams(request)
      const { period_days, timezone } = queryParams as {
        period_days?: number
        timezone?: string
      }

      // Get advanced analytics for this space only
      const analytics = await analyticService.getAdvancedAnalytics(
        params.org_id,
        params.type as AdvancedAnalyticTypes,
        {
          p_organization_id: params.org_id,
          p_tag_ids: undefined,
          p_touchpoint_ids: undefined,
          p_collection_ids: [params.space_id], // filter to this space
          p_period_days: period_days || 7,
          p_timezone: timezone || 'UTC',
        },
        context.userId
      )

      return NextResponse.json(analytics)
    } catch (error: any) {
      log.error({
        error: error.message,
        org_id: params.org_id,
        space_id: params.space_id,
        type: params.type,
      })

      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
