import { NextRequest, NextResponse } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import dayjs from 'dayjs'
import { logger } from '@/infrastructure/logging/logger'
import { analyticService } from '@/core/services/analytic.service'
import { collectionPermissionService } from '@/core/services/collection-permission.service'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

const log = logger.child({
  service: 'space-raw-visits',
})

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string; space_id: string }; context: any }
  ) => {
    try {
      // Ensure user can view this space
      await collectionPermissionService.ensureCanView(
        params.org_id,
        params.space_id,
        context.userId
      )

      const queryParams = getQueryParams(request)
      const { date_range, exclude_bot, timezone, last_hours } = queryParams as {
        date_range?: { from: Date; to: Date }
        exclude_bot?: string
        timezone?: string
        last_hours?: number
      }

      const [start_time, end_time] = [
        dayjs(date_range?.from || new Date()).toISOString(),
        dayjs(date_range?.to || new Date()).toISOString(),
      ]

      const excludeBotBoolean =
        exclude_bot === 'true' ? true : exclude_bot === 'false' ? false : false

      // Get raw visits for this space only
      const visits = await analyticService.getRawVisitData(
        params.org_id,
        undefined, // no tag filter
        undefined, // no tp filter
        start_time,
        end_time,
        excludeBotBoolean,
        timezone,
        last_hours,
        undefined, // limit
        undefined, // offset
        [params.space_id], // filter to this space
        context.userId
      )

      return NextResponse.json(visits)
    } catch (error: any) {
      log.error({ error: error.message, org_id: params.org_id, space_id: params.space_id })

      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
