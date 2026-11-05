import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { invitationService } from '@/core/services/invitation.service'
import { APIResponse } from '@/infrastructure/response/ok/base'

export const POST = withAuth(
  async (request: NextRequest, { params }: { params: { org_id: string; id: string } }) => {
    await invitationService.updateInvitationExpiredAt(params.org_id, params.id, 7)
    return APIResponse.updated({})
  }
)
