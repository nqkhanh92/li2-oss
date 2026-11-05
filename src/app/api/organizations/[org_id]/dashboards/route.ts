import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { createDashboardSchema } from '@/shared/schemas/dashboards'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string }>(
  async (_req: NextRequest, { params: { org_id }, context }) => {
    const data = await dashboardService.list(org_id, context.userId)
    return APIResponse.ok({ data })
  }
)

export const POST = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id }, context }) => {
    const body = await req.json()
    const validated = createDashboardSchema.parse(body)
    const dashboard = await dashboardService.create(org_id, context.userId, validated)

    return APIResponse.created({
      data: dashboard,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.created_field',
        params: { field: 'Dashboard' },
      },
    })
  }
)
