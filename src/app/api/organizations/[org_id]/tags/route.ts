import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { Tables } from '@/shared/types/database.types'
import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { tagService } from '@/core/services/tag.service'
import { createTagSchema } from '@/shared/schemas/tags'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

export type Tag = Tables<'tags'>
export type GetTagObject = Tag & {
  tp_tag_links: [{ count: number }]
  profiles: Pick<Tables<'profiles'>, 'id' | 'name' | 'email' | 'avatar'>
}

export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const queryParams = getQueryParams(req) as SearchFilterPagination

  const { data, count } = await tagService.findAll(org_id, queryParams)
  return APIResponse.ok({
    data,
    rowCount: count,
  })
})

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id }, context }) => {
  const body = await req.json()
  const validatedData = createTagSchema.parse(body)

  const createdTag = await tagService.createOne(org_id, context.userId, validatedData)
  return APIResponse.created({
    data: createdTag,
    success: true,
    i18nMessage: {
      key: 'common:messages.success.created_field',
      params: {
        field: 'Tag',
      },
    },
  })
})

export const DELETE = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const { ids } = await req.json()
  const deletedTags = await tagService.deleteMany(org_id, ids)

  if (deletedTags === null) {
    throw new BadRequestError('Cant delete anything.')
  }

  if (deletedTags.length < ids.length) {
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted_count_restricted',
        params: {
          field: 'Tag',
          count: `${deletedTags.length}/${ids.length}`,
        },
      },
    })
  }

  return APIResponse.deleted({
    success: true,
    i18nMessage: {
      key: 'common:messages.success.deleted_count',
      params: {
        field: 'Tag',
        count: deletedTags.length,
      },
    },
  })
})
