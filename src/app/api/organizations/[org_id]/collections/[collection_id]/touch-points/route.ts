import { NextRequest } from 'next/server'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { collectionService } from '@/core/services/collection.service'
import {
  addTouchPointToCollectionSchema,
  bulkAddTouchPointsToCollectionSchema,
} from '@/shared/schemas/collections'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

/**
 * GET /api/organizations/[org_id]/collections/[collection_id]/touch-points
 * Get all touch-points in a collection
 */
export const GET = withAuth<{ org_id: string; collection_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())

      const { data, count } = await collectionService.getCollectionTouchPoints(
        params.org_id,
        params.collection_id,
        context.userId,
        searchParams
      )

      return APIResponse.ok({ data, rowCount: count })
    } catch (error: any) {
      console.error('GET /collections/[id]/touch-points error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

/**
 * POST /api/organizations/[org_id]/collections/[collection_id]/touch-points
 * Add touch-point(s) to a collection
 */
export const POST = withAuth<{ org_id: string; collection_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const body = await request.json()

      // Support both single and bulk add
      if (body.touch_point_ids && Array.isArray(body.touch_point_ids)) {
        // Bulk add
        const validatedData = bulkAddTouchPointsToCollectionSchema.parse(body)

        const result = await collectionService.addTouchPointsToCollection(
          params.org_id,
          params.collection_id,
          validatedData.touch_point_ids,
          context.userId
        )

        return APIResponse.ok({
          data: result,
          success: true,
          i18nMessage: {
            key: 'collection:messages.links_added_count',
            params: {
              count: result.count,
            },
          },
        })
      } else {
        // Single add
        const validatedData = addTouchPointToCollectionSchema.parse(body)

        const result = await collectionService.addTouchPointsToCollection(
          params.org_id,
          params.collection_id,
          [validatedData.touch_point_id],
          context.userId
        )

        return APIResponse.ok({
          data: result,
          success: true,
          i18nMessage: {
            key: 'collection:messages.links_added',
          },
        })
      }
    } catch (error: any) {
      console.error('POST /collections/[id]/touch-points error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

/**
 * DELETE /api/organizations/[org_id]/collections/[collection_id]/touch-points
 * Remove touch-point(s) from a collection
 */
export const DELETE = withAuth<{ org_id: string; collection_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const body = await request.json()
      const { touch_point_ids } = body

      if (!touch_point_ids || !Array.isArray(touch_point_ids)) {
        throw new AppError('touch_point_ids array is required')
      }

      const result = await collectionService.removeTouchPointsFromCollection(
        params.org_id,
        params.collection_id,
        touch_point_ids,
        context.userId
      )

      return APIResponse.ok({
        data: result,
        success: true,
        i18nMessage: {
          key: 'collection:messages.links_removed',
        },
      })
    } catch (error: any) {
      console.error('DELETE /collections/[id]/touch-points error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
