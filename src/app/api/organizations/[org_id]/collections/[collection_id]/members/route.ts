import { NextRequest } from 'next/server'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { collectionMemberService } from '@/core/services/collection-member.service'
import {
  addCollectionMemberSchema,
  bulkAddCollectionMembersSchema,
  updateCollectionMemberSchema,
} from '@/shared/schemas/collections'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

interface RouteParams {
  params: {
    org_id: string
    collection_id: string
  }
}

/**
 * GET /api/organizations/[org_id]/collections/[collection_id]/members
 * Get all members of a collection
 */
export const GET = withAuth<RouteParams['params']>(
  async (request: NextRequest, { params, context }) => {
    const members = await collectionMemberService.getCollectionMembers(
      params.org_id,
      params.collection_id,
      context.userId
    )

    return APIResponse.ok({ data: members })
  }
)

/**
 * POST /api/organizations/[org_id]/collections/[collection_id]/members
 * Add member(s) to a collection
 */

export const POST = withAuth<RouteParams['params']>(
  async (request: NextRequest, { params, context }) => {
    const body = await request.json()

    const userId = context.userId
    const userEmail = context.email
    // Support both single and bulk add
    if (body.members && Array.isArray(body.members)) {
      // Bulk add
      const validatedData = bulkAddCollectionMembersSchema.parse(body)

      const result = await collectionMemberService.bulkAddMembers(
        params.org_id,
        params.collection_id,
        validatedData.members,
        userId
      )

      return APIResponse.ok({
        data: result,
        success: true,
        i18nMessage: {
          key: 'collection:messages.members_added',
          params: {
            count: result.added,
          },
        },
      })
    } else {
      // Single add
      const validatedData = addCollectionMemberSchema.parse(body)

      const member = await collectionMemberService.addMember(
        params.org_id,
        params.collection_id,
        validatedData,
        userId
      )

      return APIResponse.ok({
        data: member,
        success: true,
        i18nMessage: {
          key: 'collection:messages.member_added',
        },
      })
    }
  }
)

/**
 * PATCH /api/organizations/[org_id]/collections/[collection_id]/members
 * Update a member's role (requires member_id in query params)
 */
export const PATCH = withAuth<RouteParams['params']>(
  async (request: NextRequest, { params, context }) => {
    const searchParams = request.nextUrl.searchParams
    const memberId = searchParams.get('member_id')

    if (!memberId) {
      throw new AppError('member_id query parameter is required')
    }

    const body = await request.json()
    const validatedData = updateCollectionMemberSchema.parse(body)

    const updated = await collectionMemberService.updateMemberRole(
      params.org_id,
      params.collection_id,
      memberId,
      validatedData,
      context.userId
    )

    return APIResponse.ok({
      data: updated,
      success: true,
      i18nMessage: {
        key: 'collection:messages.member_role_updated',
      },
    })
  }
)

/**
 * DELETE /api/organizations/[org_id]/collections/[collection_id]/members
 * Remove a member from collection (requires member_id in query params)
 */

export const DELETE = withAuth<RouteParams['params']>(
  async (request: NextRequest, { params, context }) => {
    const searchParams = request.nextUrl.searchParams
    const memberId = searchParams.get('member_id')

    if (!memberId) {
      throw new AppError('member_id query parameter is required')
    }

    const result = await collectionMemberService.removeMember(
      params.org_id,
      params.collection_id,
      memberId,
      context.userId
    )

    return APIResponse.ok({
      data: result,
      success: true,
      i18nMessage: {
        key: 'collection:messages.member_removed',
      },
    })
  }
)
