import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { updateWidgetSchema } from '@/shared/schemas/dashboards'
import { NextRequest } from 'next/server'

export const PUT = withAuth<{ org_id: string; dashboard_id: string; widget_id: string }>(
  async (req: NextRequest, { params: { org_id, dashboard_id, widget_id }, context }) => {
    const body = await req.json()
    const validated = updateWidgetSchema.parse(body)
    const widget = await dashboardService.updateWidget(org_id, dashboard_id, widget_id, context.userId, validated)

    return APIResponse.updated({
      data: widget,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: { field: 'Widget' },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; dashboard_id: string; widget_id: string }>(
  async (_req, { params: { org_id, dashboard_id, widget_id }, context }) => {
    await dashboardService.deleteWidget(org_id, dashboard_id, widget_id, context.userId)

    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: { field: 'Widget' },
      },
    })
  }
)
