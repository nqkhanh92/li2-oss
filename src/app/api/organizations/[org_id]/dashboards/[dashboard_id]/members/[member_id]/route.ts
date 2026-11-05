import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { updateMemberRoleSchema } from '@/shared/schemas/dashboard-members'
import { NextRequest } from 'next/server'

export const PATCH = withAuth<{ org_id: string; dashboard_id: string; member_id: string }>(
  async (req: NextRequest, { params: { org_id, dashboard_id, member_id }, context }) => {
    const body = await req.json()
    const validated = updateMemberRoleSchema.parse(body)
    const data = await dashboardService.updateMemberRole(org_id, dashboard_id, member_id, context.userId, validated.role)
    return APIResponse.ok({ data })
  }
)

export const DELETE = withAuth<{ org_id: string; dashboard_id: string; member_id: string }>(
  async (_req, { params: { org_id, dashboard_id, member_id }, context }) => {
    await dashboardService.removeMember(org_id, dashboard_id, member_id, context.userId)
    return APIResponse.deleted({})
  }
)
