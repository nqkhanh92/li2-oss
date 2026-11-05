import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string; dashboard_id: string; widget_id: string }>(
  async (req: NextRequest, { params: { org_id, dashboard_id, widget_id }, context }) => {
    const { searchParams } = new URL(req.url)
    const date_from = searchParams.get('date_from') ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const date_to = searchParams.get('date_to') ?? new Date().toISOString()

    const data = await dashboardService.getWidgetData(
      org_id, dashboard_id, widget_id, context.userId,
      { date_from, date_to }
    )

    return APIResponse.ok({ data })
  }
)
