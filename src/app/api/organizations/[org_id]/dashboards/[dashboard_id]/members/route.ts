import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { addMemberSchema } from '@/shared/schemas/dashboard-members'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string; dashboard_id: string }>(
  async (_req, { params: { org_id, dashboard_id }, context }) => {
    const data = await dashboardService.getMembers(org_id, dashboard_id, context.userId)
    return APIResponse.ok({ data })
  }
)

export const POST = withAuth<{ org_id: string; dashboard_id: string }>(
  async (req: NextRequest, { params: { org_id, dashboard_id }, context }) => {
    const body = await req.json()
    const validated = addMemberSchema.parse(body)
    const data = await dashboardService.addMember(org_id, dashboard_id, context.userId, validated)
    return APIResponse.created({ data })
  }
)
