import { utmCampaignService } from '@/core/services/utm-campaign.service'
import { GetUtmCampaignAnalyticsInput } from '@/core/types/utm-campaign.type'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { getQueryParams } from '@/shared/lib/utils'

export const GET = withAuth<{ org_id: string; campaign_id: string }>(
  async (req, { params: { org_id, campaign_id } }) => {
    await ensurePolicy(org_id, nonScopePolicies.view_campaign)

    const queryParams = getQueryParams(req)

    const { channelIds, tpIds, excludeBot, startTime, endTime } =
      queryParams as GetUtmCampaignAnalyticsInput

    const analytics = await utmCampaignService.getAnalytics({
      organizationId: org_id,
      utmCampaignId: campaign_id,
      channelIds,
      tpIds,
      excludeBot,
      startTime,
      endTime,
    })

    return APIResponse.ok({
      data: analytics,
    })
  }
)
