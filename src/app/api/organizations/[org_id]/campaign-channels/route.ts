import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { campaignChannelService } from '@/core/services/campaign-channel.service'
import { channelSchema } from '@/shared/schemas/utm-campaigns'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const queryParams = getQueryParams(req) as SearchFilterPagination

  const { data, count } = await campaignChannelService.findAll(org_id, queryParams)
  return APIResponse.ok({
    data,
    rowCount: count,
  })
})

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id }, context }) => {
  const body = await req.json()
  const validatedData = channelSchema.parse(body)

  const createdChannel = await campaignChannelService.createOne(
    org_id,
    context.userId,
    validatedData
  )
  return APIResponse.created({
    data: createdChannel,
    success: true,
    i18nMessage: {
      key: 'common:messages.success.created_field',
      params: {
        field: 'Channel',
      },
    },
  })
})

export const DELETE = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const { ids } = await req.json()
  const deleteCount = await campaignChannelService.deleteMany(org_id, ids)

  if (deleteCount === null) {
    throw new BadRequestError('Cant delete anything.')
  }

  if (deleteCount < ids.length) {
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted_count_restricted',
        params: {
          field: 'Channel',
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
        field: 'Channel',
        count: deleteCount,
      },
    },
  })
})
