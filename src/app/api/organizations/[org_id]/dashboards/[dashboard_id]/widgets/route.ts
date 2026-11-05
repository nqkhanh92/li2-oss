import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { createWidgetSchema } from '@/shared/schemas/dashboards'
import { NextRequest } from 'next/server'

export const POST = withAuth<{ org_id: string; dashboard_id: string }>(
  async (req: NextRequest, { params: { org_id, dashboard_id }, context }) => {
    const body = await req.json()
    const validated = createWidgetSchema.parse(body)
    const widget = await dashboardService.createWidget(org_id, dashboard_id, context.userId, validated)

    return APIResponse.created({
      data: widget,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.created_field',
        params: { field: 'Widget' },
      },
    })
  }
)
