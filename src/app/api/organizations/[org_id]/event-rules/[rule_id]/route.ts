import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { eventRuleService } from '@/core/services/event-rule.service'
import { updateEventRuleSchema } from '@/shared/schemas/event-rules'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string; rule_id: string }>(
  async (_req, { params: { org_id, rule_id } }) => {
    const rule = await eventRuleService.findOne(org_id, rule_id)

    return APIResponse.ok({
      data: rule,
    })
  }
)

export const PUT = withAuth<{ org_id: string; rule_id: string }>(
  async (req: NextRequest, { params: { org_id, rule_id } }) => {
    const body = await req.json()
    const validated = updateEventRuleSchema.parse(body)

    const rule = await eventRuleService.update(org_id, rule_id, validated)

    return APIResponse.updated({
      data: rule,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: { field: 'Event Rule' },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; rule_id: string }>(
  async (_req, { params: { org_id, rule_id } }) => {
    await eventRuleService.delete(org_id, rule_id)

    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: { field: 'Event Rule' },
      },
    })
  }
)
