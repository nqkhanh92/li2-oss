import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { eventRuleService } from '@/core/services/event-rule.service'
import { createEventRuleSchema } from '@/shared/schemas/event-rules'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string }>(
  async (_req: NextRequest, { params: { org_id } }) => {
    const data = await eventRuleService.findAll(org_id)

    return APIResponse.ok({
      data,
    })
  }
)

export const POST = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id }, context }) => {
    const body = await req.json()
    const validated = createEventRuleSchema.parse(body)

    const rule = await eventRuleService.create(org_id, context.userId, validated)

    return APIResponse.created({
      data: rule,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.created_field',
        params: { field: 'Event Rule' },
      },
    })
  }
)
