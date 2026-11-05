import { NextRequest } from 'next/server'
import dayjs from 'dayjs'
import { getQueryParams } from '@/shared/lib/utils'
import { deepLinkAnalyticsService, DeepLinkOverview } from '@/ee/core/services/deep-link-analytics.service'
import { logger } from '@/infrastructure/logging/logger'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getTimeZone } from '@/shared/utils/server/get-timezone'

export type DeepLinkAnalyticsDataType = DeepLinkOverview

const log = logger.child({ service: 'deep-link-analytics' })

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: any }
  ) => {
    try {
      const queryParams = getQueryParams(request)
      const {
        date_range,
        exclude_bot,
        tp_ids,
        tag_ids,
        collection_ids,
        utm_source_values,
        utm_medium_values,
        utm_campaign_values,
      } = queryParams as {
        date_range?: { from?: string; to?: string }
        exclude_bot?: string
        tp_ids?: string[]
        tag_ids?: string[]
        collection_ids?: string[]
        utm_source_values?: string[]
        utm_medium_values?: string[]
        utm_campaign_values?: string[]
      }

      const data = await deepLinkAnalyticsService.getOverview(
        params.org_id,
        context.userId,
        {
          startDate: date_range?.from ? dayjs(date_range.from).toISOString() : undefined,
          endDate: date_range?.to ? dayjs(date_range.to).toISOString() : undefined,
          tpIds: tp_ids,
          tagIds: tag_ids,
          collectionIds: collection_ids,
          utmSources: utm_source_values,
          utmMediums: utm_medium_values,
          utmCampaigns: utm_campaign_values,
          excludeBot: exclude_bot === 'true',
        },
        getTimeZone()
      )

      return APIResponse.ok({ data })
    } catch (error: any) {
      log.error({ error }, 'deep-link-analytics overview failed')
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      // Generic message — don't leak the raw error to the client (it's logged above).
      return new AppError().toResponse()
    }
  }
)
