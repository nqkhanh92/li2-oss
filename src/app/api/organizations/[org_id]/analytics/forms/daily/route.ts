import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { formsAnalyticsService } from '@/core/services/forms-analytics.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { logger } from '@/infrastructure/logging/logger'
import dayjs from 'dayjs'

const log = logger.child({ service: 'analytics-forms-daily' })

export const GET = withAuth(
  async (
    request: NextRequest,
    { params }: { params: { org_id: string }; context: any }
  ) => {
    try {
      const { searchParams } = new URL(request.url)
      const date_from = searchParams.get('date_from') ?? dayjs().subtract(30, 'days').toISOString()
      const date_to = searchParams.get('date_to') ?? dayjs().toISOString()
      const form_id = searchParams.get('form_id') ?? null
      const form_name = searchParams.get('form_name') ?? null
      const page_path = searchParams.get('page_path') ?? null
      const hostname = searchParams.get('hostname') ?? null

      const data = await formsAnalyticsService.getFormsDaily(params.org_id, date_from, date_to, {
        form_id,
        form_name,
        page_path,
        hostname,
      })
      return APIResponse.ok({ data })
    } catch (error: any) {
      log.error(error)
      if (error instanceof BaseError) return error.toResponse()
      return new AppError(error.message).toResponse()
    }
  }
)
