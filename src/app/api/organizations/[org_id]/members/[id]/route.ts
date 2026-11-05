import { orgMemberUpdateFormSchema } from '@/shared/schemas/org-members'
import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { memberService } from '@/core/services/member.service'
import { APIResponse } from '@/infrastructure/response/ok/base'

export const DELETE = withAuth<{ org_id: string; id: string }>(async (request, { params }) => {
  const member = await memberService.deleteById(params.id, params.org_id)
  return APIResponse.deleted({ data: member })
})

export const PATCH = withAuth<{ org_id: string; id: string }>(
  async (request: NextRequest, { params }) => {
    const body = await request.json()
    const validatedData = orgMemberUpdateFormSchema.parse(body)
    const member = await memberService.updateMemberRole(
      params.id,
      params.org_id,
      validatedData.role_id
    )

    return APIResponse.updated({ data: member })
  }
)
