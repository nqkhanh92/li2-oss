import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'

export const POST = withAuth<{ org_id: string; dashboard_id: string }>(
  async (_req, { params: { org_id, dashboard_id }, context }) => {
    const data = await dashboardService.duplicate(org_id, dashboard_id, context.userId)
    return APIResponse.created({ data })
  }
)
