import { NextRequest } from 'next/server'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { collectionService } from '@/core/services/collection.service'
import { createCollectionSchema, getCollectionsQuerySchema } from '@/shared/schemas/collections'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

/**
 * GET /api/organizations/[org_id]/collections
 * List all collections in an organization (with permission filtering)
 */
export const GET = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const queryParams = getCollectionsQuerySchema.parse(searchParams)

    // Get collections with permission filtering
    const { data, count } = await collectionService.getAllCollections(
      params.org_id,
      context.userId,
      queryParams
    )

    return APIResponse.ok({ data, rowCount: count })
  }
)

/**
 * POST /api/organizations/[org_id]/collections
 * Create a new collection
 */
export const POST = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = createCollectionSchema.parse(body)

    // Create collection with proper DTO structure
    const collection = await collectionService.createCollection(
      params.org_id,
      {
        ...validatedData,
        organization_id: params.org_id,
        user_id: context.userId,
      },
      context.userId
    )

    return APIResponse.created({
      data: collection,
      success: true,
      i18nMessage: {
        key: 'collection:messages.created',
      },
    })
  }
)
