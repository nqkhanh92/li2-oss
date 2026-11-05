import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { funnelService } from '@/core/services/funnel.service'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string; session_id: string }>(
  async (_req: NextRequest, { params: { org_id, session_id } }) => {
    const result = await funnelService.getSessionDetail(org_id, session_id)
    return APIResponse.ok({ data: result })
  }
)
