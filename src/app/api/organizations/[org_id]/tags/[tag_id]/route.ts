import { NextRequest } from 'next/server'
import { updateTagSchema } from '@/shared/schemas/tags'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { tagService } from '@/core/services/tag.service'

export const GET = withAuth<{ org_id: string; tag_id: string }>(async (req, { params }) => {
  const tag = await tagService.findById(params.org_id, params.tag_id)
  return APIResponse.ok({
    data: tag,
  })
})

export const PATCH = withAuth<{ org_id: string; tag_id: string }>(
  async (
    request: NextRequest,
    { params }: { params: { org_id: string; tag_id: string } }
  ) => {
    const body = await request.json()
    const validatedData = updateTagSchema.parse(body)

    const updatedTag = await tagService.updateAndGet(params.org_id, params.tag_id, validatedData)

    return APIResponse.updated({
      data: updatedTag,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: {
          field: 'Tag',
        },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; tag_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string; tag_id: string } }) => {
    await tagService.deleteOne(params.org_id, params.tag_id)

    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: {
          field: 'Tag',
        },
      },
    })
  }
)
