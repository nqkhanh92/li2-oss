import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { updateLayoutSchema } from '@/shared/schemas/dashboards'
import { NextRequest } from 'next/server'

export const PUT = withAuth<{ org_id: string; dashboard_id: string }>(
  async (req: NextRequest, { params: { org_id, dashboard_id }, context }) => {
    const body = await req.json()
    const validated = updateLayoutSchema.parse(body)

    const data = await dashboardService.updateLayout(
      org_id,
      dashboard_id,
      context.userId,
      validated.positions
    )

    return APIResponse.updated({
      data,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: { field: 'Layout' },
      },
    })
  }
)
