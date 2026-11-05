import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { invitationService } from '@/core/services/invitation.service'

export const GET = async (request: NextRequest, { params }: { params: { token: string } }) => {
  const token = params.token
  if (!token) {
    throw new BadRequestError('Token is required')
  }

  const invitation = await invitationService.findByToken(token)
  if (!invitation) {
    throw new BadRequestError('Invitation not found')
  }
  return APIResponse.ok({ data: invitation })
}

export const POST = withAuth<{ token: string }>(async (request: NextRequest, { params }) => {
  const body = await request.json()
  const { action } = body
  if (action === 'accept') {
    await invitationService.acceptInvitation(params.token)
  }
  return APIResponse.ok({
    message: 'Invitation processed successfully',
    i18nMessage: {
      key: 'common:messages.success.invitation_accepted',
      params: {
        field: '$t(module.invitation)',
      },
    },
  })
})
