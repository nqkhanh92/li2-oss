import { NextRequest } from 'next/server'
import dayjs from 'dayjs'
import { getQueryParams } from '@/shared/lib/utils'
import { deepLinkAnalyticsService } from '@/ee/core/services/deep-link-analytics.service'
import { DeepLinkRankingGroupBy } from '@/ee/features/deep-link-analytics/types'
import { logger } from '@/infrastructure/logging/logger'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

const VALID_GROUP_BY: DeepLinkRankingGroupBy[] = [
  'link',
  'tag',
  'space',
  'referrer',
  'utm_source',
  'utm_medium',
  'utm_campaign',
]

const log = logger.child({ service: 'deep-link-analytics-ranking' })

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: any }
  ) => {
    try {
      const queryParams = getQueryParams(request)
      const {
        group_by,
        date_range,
        tp_ids,
        tag_ids,
        collection_ids,
        utm_source_values,
        utm_medium_values,
        utm_campaign_values,
      } = queryParams as {
        group_by?: string
        date_range?: { from?: string; to?: string }
        tp_ids?: string[]
        tag_ids?: string[]
        collection_ids?: string[]
        utm_source_values?: string[]
        utm_medium_values?: string[]
        utm_campaign_values?: string[]
      }

      if (!group_by || !VALID_GROUP_BY.includes(group_by as DeepLinkRankingGroupBy)) {
        throw new BadRequestError('Invalid group_by')
      }

      const data = await deepLinkAnalyticsService.getRanking(
        params.org_id,
        context.userId,
        group_by as DeepLinkRankingGroupBy,
        {
          startDate: date_range?.from ? dayjs(date_range.from).toISOString() : undefined,
          endDate: date_range?.to ? dayjs(date_range.to).toISOString() : undefined,
          tpIds: tp_ids,
          tagIds: tag_ids,
          collectionIds: collection_ids,
          utmSources: utm_source_values,
          utmMediums: utm_medium_values,
          utmCampaigns: utm_campaign_values,
        }
      )

      return APIResponse.ok({ data })
    } catch (error: any) {
      log.error({ error }, 'deep-link-analytics ranking failed')
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      // Generic message — don't leak the raw error to the client (it's logged above).
      return new AppError().toResponse()
    }
  }
)
