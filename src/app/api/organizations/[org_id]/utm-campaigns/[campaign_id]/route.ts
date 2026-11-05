import { NextRequest } from 'next/server'
import { updateUtmCampaignSchema } from '@/shared/schemas/utm-campaigns'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { utmCampaignService } from '@/core/services/utm-campaign.service'

export const GET = withAuth<{ org_id: string; campaign_id: string }>(async (req, { params }) => {
  const campaign = await utmCampaignService.findById(params.org_id, params.campaign_id)
  return APIResponse.ok({
    data: campaign,
  })
})

export const PATCH = withAuth<{ org_id: string; campaign_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string; campaign_id: string } }) => {
    const body = await request.json()
    const validatedData = updateUtmCampaignSchema.parse(body)

    const updatedCampaign = await utmCampaignService.updateAndGet(
      params.org_id,
      params.campaign_id,
      validatedData
    )

    return APIResponse.updated({
      data: updatedCampaign,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: {
          field: 'UTM Campaign',
        },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; campaign_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string; campaign_id: string } }) => {
    await utmCampaignService.deleteOne(params.org_id, params.campaign_id)

    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: {
          field: 'UTM Campaign',
        },
      },
    })
  }
)
