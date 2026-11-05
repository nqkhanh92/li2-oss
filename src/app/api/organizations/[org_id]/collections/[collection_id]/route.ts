import { NextRequest } from 'next/server'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { collectionService } from '@/core/services/collection.service'
import { updateCollectionSchema } from '@/shared/schemas/collections'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

interface RouteParams {
  params: {
    org_id: string
    collection_id: string
  }
}

/**
 * GET /api/organizations/[org_id]/collections/[collection_id]
 * Get a single collection by ID
 */
export const GET = withAuth<{ org_id: string; collection_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const collection = await collectionService.getCollectionById(
        params.org_id,
        params.collection_id,
        context.userId
      )

      return APIResponse.ok({ data: collection })
    } catch (error: any) {
      console.error('GET /collections/[id] error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

/**
 * PATCH /api/organizations/[org_id]/collections/[collection_id]
 * Update a collection
 */
export const PATCH = withAuth<{ org_id: string; collection_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const body = await request.json()
      const validatedData = updateCollectionSchema.parse(body)

      const updated = await collectionService.updateCollection(
        params.org_id,
        params.collection_id,
        validatedData,
        context.userId
      )

      return APIResponse.ok({
        data: updated,
        success: true,
        i18nMessage: {
          key: 'collection:messages.updated',
        },
      })
    } catch (error: any) {
      console.error('PATCH /collections/[id] error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

/**
 * DELETE /api/organizations/[org_id]/collections/[collection_id]
 * Delete a collection (soft delete)
 */
export const DELETE = withAuth<{ org_id: string; collection_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const result = await collectionService.deleteCollection(
        params.org_id,
        params.collection_id,
        context.userId
      )

      return APIResponse.deleted({
        data: result,
        success: true,
        i18nMessage: {
          key: 'collection:messages.deleted',
        },
      })
    } catch (error: any) {
      console.error('DELETE /collections/[id] error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
