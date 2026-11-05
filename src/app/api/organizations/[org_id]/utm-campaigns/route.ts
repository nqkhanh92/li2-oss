import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { Tables } from '@/shared/types/database.types'
import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { utmCampaignService } from '@/core/services/utm-campaign.service'
import { createUtmCampaignSchema } from '@/shared/schemas/utm-campaigns'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const queryParams = getQueryParams(req) as SearchFilterPagination

  const { data, count } = await utmCampaignService.findAll(org_id, queryParams)
  return APIResponse.ok({
    data,
    rowCount: count,
  })
})

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id }, context }) => {
  const body = await req.json()
  const validatedData = createUtmCampaignSchema.parse(body)

  const createdCampaign = await utmCampaignService.createOne(org_id, context.userId, validatedData)

  return APIResponse.created({
    data: createdCampaign,
    success: true,
    i18nMessage: {
      key: 'common:messages.success.created_field',
      params: {
        field: 'UTM Campaign',
      },
    },
  })
})

export const DELETE = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const { campaignIds: ids } = await req.json()
  const deleteCount = await utmCampaignService.deleteMany(org_id, ids)

  if (deleteCount === null) {
    throw new BadRequestError('Cannot delete anything.')
  }

  if (deleteCount < ids.length) {
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted_count_restricted',
        params: {
          field: 'UTM Campaign',
          count: `${deleteCount}/${ids.length}`,
        },
      },
    })
  }

  return APIResponse.deleted({
    success: true,
    i18nMessage: {
      key: 'common:messages.success.deleted_count',
      params: {
        field: 'UTM Campaign',
        count: deleteCount,
      },
    },
  })
})
