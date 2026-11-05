import { orgMemberCreateFormSchema } from '@/shared/schemas/org-members'
import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { invitationService } from '@/core/services/invitation.service'
import { APIResponse } from '@/infrastructure/response/ok/base'

export const GET = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  const invitation = await invitationService.getByOrgId(params.org_id)

  return APIResponse.ok({ data: invitation })
})

export const POST = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  const body = await request.json()
  const { email, role_id } = await orgMemberCreateFormSchema.parse(body)

  await invitationService.sendInvitation(params.org_id, email, role_id)

  return APIResponse.created({ i18nMessage: { key: 'common:messages.success.invitation_sent' } })
})

export const DELETE = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  const body = await request.json()
  const ids = body.ids

  await invitationService.deleteInvitations(params.org_id, ids)

  return APIResponse.deleted({ i18nMessage: { key: 'common:messages.success.invitation_deleted' } })
})
