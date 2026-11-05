import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { funnelService } from '@/core/services/funnel.service'
import { updateFunnelSchema } from '@/shared/schemas/funnels'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string; funnel_id: string }>(
  async (_req, { params: { org_id, funnel_id } }) => {
    const funnel = await funnelService.findByIdWithSteps(org_id, funnel_id)

    return APIResponse.ok({
      data: funnel,
    })
  }
)

export const PUT = withAuth<{ org_id: string; funnel_id: string }>(
  async (req: NextRequest, { params: { org_id, funnel_id } }) => {
    const body = await req.json()
    const validated = updateFunnelSchema.parse(body)

    const funnel = await funnelService.update(
      org_id,
      funnel_id,
      { name: validated.name, description: validated.description },
      validated.steps.map((s, i) => ({
        position: i + 1,
        name: s.name,
        pattern_type: s.pattern_type,
        condition: s.condition,
        pattern: s.pattern,
        is_required: s.is_required,
        event_name: s.event_name ?? null,
      }))
    )

    return APIResponse.updated({
      data: funnel,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: { field: 'Funnel' },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; funnel_id: string }>(
  async (_req, { params: { org_id, funnel_id } }) => {
    await funnelService.softDelete(org_id, funnel_id)

    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: { field: 'Funnel' },
      },
    })
  }
)
