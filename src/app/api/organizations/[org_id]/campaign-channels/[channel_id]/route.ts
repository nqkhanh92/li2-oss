import { NextRequest } from 'next/server'
import { channelSchema } from '@/shared/schemas/utm-campaigns'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { campaignChannelService } from '@/core/services/campaign-channel.service'

export const GET = withAuth<{ org_id: string; channel_id: string }>(async (req, { params }) => {
  const channel = await campaignChannelService.findById(params.org_id, params.channel_id)
  return APIResponse.ok({
    data: channel,
  })
})

export const PATCH = withAuth<{ org_id: string; channel_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string; channel_id: string } }) => {
    const body = await request.json()
    const validatedData = channelSchema.parse(body)

    const updatedChannel = await campaignChannelService.updateAndGet(
      params.org_id,
      params.channel_id,
      validatedData
    )

    return APIResponse.updated({
      data: updatedChannel,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: {
          field: 'Channel',
        },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; channel_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string; channel_id: string } }) => {
    await campaignChannelService.deleteOne(params.org_id, params.channel_id)

    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: {
          field: 'Channel',
        },
      },
    })
  }
)
