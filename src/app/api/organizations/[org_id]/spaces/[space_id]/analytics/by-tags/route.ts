import { NextRequest, NextResponse } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import dayjs from 'dayjs'
import { logger } from '@/infrastructure/logging/logger'
import { analyticService } from '@/core/services/analytic.service'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

const log = logger.child({
  service: 'space-analytics-by-tag',
})

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string; space_id: string }; context: any }
  ) => {
    try {
      // Extract query parameters
      const queryParams = getQueryParams(request)
      const { date_range, exclude_bot } = queryParams as {
        date_range?: { from: Date; to: Date }
        exclude_bot?: string
      }

      const [start_time, end_time] = [
        dayjs(date_range?.from || new Date()).toISOString(),
        dayjs(date_range?.to || new Date()).toISOString(),
      ]

      const excludeBotBoolean =
        exclude_bot === 'true' ? true : exclude_bot === 'false' ? false : false

      // Get space-scoped analytics (includes permission check)
      const analytics = await analyticService.getSpaceAnalytics(
        params.org_id,
        params.space_id,
        context.userId,
        {
          start_time,
          end_time,
          exclude_bot: excludeBotBoolean,
        }
      )

      return NextResponse.json(analytics)
    } catch (error: any) {
      log.error({ error: error.message, org_id: params.org_id, space_id: params.space_id })

      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
