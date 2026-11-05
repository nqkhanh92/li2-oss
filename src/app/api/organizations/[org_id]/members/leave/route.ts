import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { memberService } from '@/core/services/member.service'
import { APIResponse } from '@/infrastructure/response/ok/base'

export const DELETE = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  const member = await memberService.leaveOrganization(params.org_id)
  return APIResponse.deleted({ data: member })
})
