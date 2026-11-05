import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

import { eventRuleService } from '@/core/services/event-rule.service'

export const GET = withAuth<{ org_id: string }>(
  async (_req, { params: { org_id } }) => {
    const names = await eventRuleService.getEventNames(org_id)

    return APIResponse.ok({
      data: names,
    })
  }
)
