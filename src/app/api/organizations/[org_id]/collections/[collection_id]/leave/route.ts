import { NextRequest } from 'next/server'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { getSession } from '@/shared/lib/auth/session'
import { collectionMemberService } from '@/core/services/collection-member.service'

interface RouteParams {
  params: {
    org_id: string
    collection_id: string
  }
}

/**
 * POST /api/organizations/[org_id]/collections/[collection_id]/leave
 * Allow current user to leave a collection
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      throw new UnauthorizedError()
    }

    await collectionMemberService.leaveCollection(params.org_id, params.collection_id, session.sub)

    return APIResponse.ok({
      success: true,
      i18nMessage: {
        key: 'collection:messages.leave_success',
        defaultMessage: 'You have left the collection',
      },
    })
  } catch (error: any) {
    console.error('POST /collections/[id]/leave error:', error)
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error.message).toResponse()
  }
}
