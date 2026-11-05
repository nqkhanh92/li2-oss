import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { touchPointService } from '@/core/services/touch-point.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { getSession } from '@/shared/lib/auth/session'
import { AuthContext } from '@/shared/types/request'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: AuthContext }
  ) => {
    const data = await touchPointService.getAllWithCampaignInfo(params.org_id, context.userId)
    return APIResponse.ok({ data })
  }
)
