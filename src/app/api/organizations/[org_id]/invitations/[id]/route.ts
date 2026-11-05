import { orgMemberUpdateFormSchema } from '@/shared/schemas/org-members'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { invitationService } from '@/core/services/invitation.service'

export const PATCH = withAuth<{ org_id: string; id: string }>(async (request, { params }) => {
  const body = await request.json()
  const { role_id } = orgMemberUpdateFormSchema.parse(body)
  if (!role_id) {
    throw new BadRequestError('Role id is required')
  }

  await invitationService.updateInvitationRole(params.org_id, params.id, role_id)
  return APIResponse.updated({})
})

export const DELETE = withAuth<{ org_id: string; id: string }>(async (_, { params }) => {
  await invitationService.deleteInvitation(params.org_id, params.id)

  return APIResponse.deleted({
    i18nMessage: { key: 'common:messages.success.invitation_deleted' },
  })
})
