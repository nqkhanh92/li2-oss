import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { dashboardPermissionService } from '@/core/services/dashboard-permission.service'

export const POST = withAuth<{ org_id: string; dashboard_id: string }>(
  async (_req: NextRequest, { params: { org_id, dashboard_id }, context }) => {
    await dashboardPermissionService.ensureViewer(org_id, dashboard_id, context.userId)
    const pinned = await dashboardService.togglePin(org_id, dashboard_id, context.userId)
    return APIResponse.ok({ data: { pinned } })
  }
)
