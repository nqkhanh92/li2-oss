import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { updateDashboardSchema } from '@/shared/schemas/dashboards'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string; dashboard_id: string }>(
  async (_req, { params: { org_id, dashboard_id }, context }) => {
    const data = await dashboardService.getWithWidgets(org_id, dashboard_id, context.userId)
    return APIResponse.ok({ data })
  }
)

export const PUT = withAuth<{ org_id: string; dashboard_id: string }>(
  async (req: NextRequest, { params: { org_id, dashboard_id }, context }) => {
    const body = await req.json()
    const validated = updateDashboardSchema.parse(body)
    const data = await dashboardService.update(org_id, dashboard_id, context.userId, validated)

    return APIResponse.updated({
      data,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: { field: 'Dashboard' },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; dashboard_id: string }>(
  async (_req, { params: { org_id, dashboard_id }, context }) => {
    await dashboardService.delete(org_id, dashboard_id, context.userId)

    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: { field: 'Dashboard' },
      },
    })
  }
)
