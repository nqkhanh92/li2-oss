import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardService } from '@/core/services/dashboard.service'
import { transferOwnershipSchema } from '@/shared/schemas/dashboard-members'
import { NextRequest } from 'next/server'

export const POST = withAuth<{ org_id: string; dashboard_id: string }>(
  async (req: NextRequest, { params: { org_id, dashboard_id }, context }) => {
    const body = await req.json()
    const validated = transferOwnershipSchema.parse(body)
    const data = await dashboardService.transferOwnership(org_id, dashboard_id, context.userId, validated.new_owner_id)
    return APIResponse.ok({ data })
  }
)
