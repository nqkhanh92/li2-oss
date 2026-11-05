import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { funnelService } from '@/core/services/funnel.service'
import { createFunnelSchema } from '@/shared/schemas/funnels'
import { NextRequest } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'

export const GET = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id } }) => {
    const queryParams = getQueryParams(req) as SearchFilterPagination
    const { data, count } = await funnelService.findAllWithStats(org_id, queryParams)

    return APIResponse.ok({
      data,
      rowCount: count,
    })
  }
)

export const POST = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id }, context }) => {
    const body = await req.json()
    const validated = createFunnelSchema.parse(body)

    const funnel = await funnelService.create(
      org_id,
      context.userId,
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

    return APIResponse.created({
      data: funnel,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.created_field',
        params: { field: 'Funnel' },
      },
    })
  }
)
