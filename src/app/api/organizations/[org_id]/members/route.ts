import { NextRequest } from 'next/server'

import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { memberService } from '@/core/services/member.service'
import { APIResponse } from '@/infrastructure/response/ok/base'

export const GET = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  const members = await memberService.getByOrgId(params.org_id)

  return APIResponse.ok({ data: members })
})
