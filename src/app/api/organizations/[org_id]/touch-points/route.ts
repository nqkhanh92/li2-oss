import { touchPointFormCreateWithAdvanceSchema } from '@/shared/schemas/touch-points'
import { NextRequest } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { Tables } from '@/shared/types/database.types'
import { TouchPointVariantsContent } from '@/features/touch-points/types'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { malformedUuidFilterKeys, unknownFilterKeys } from './list-filters'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { logger } from '@/infrastructure/logging/logger'
import { touchPointService } from '@/core/services/touch-point.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { formToJSON } from 'axios'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AuthContext, requestContext } from '@/shared/types/request'
import { isBlacklisted } from '@/shared/lib/blacklist/domain-blacklist'
const log = logger.child({ module: 'touch-points' })

export type TouchPoint = Tables<'touch_points'>
export type GetTouchPointObject = Tables<'touch_points'> & {
  tp_tag_links: {
    tag_id: string
    tags: Pick<Tables<'tags'>, 'id' | 'name' | 'color'>
  }[]
  profiles: Pick<Tables<'profiles'>, 'id' | 'name' | 'email'>
  variants_content: TouchPointVariantsContent
}
export const GET = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    //Get permission scope, if user doesn't have permission, throw error
    const scope = await getPermissionScopeOrThrow(
      params.org_id,
      ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS
    )

    const queryParams = getQueryParams(request) as SearchFilterPagination

    /**
     * Khoá lọc lạ → **400 nêu tên khoá**, không phải 500.
     *
     * Trước đây khoá lạ đi thẳng xuống `queryBuilderByParams` → `.match()` trên một cột không tồn
     * tại → PostgREST 400 → 500, và cả danh sách chết với câu `Unknown error`. Gõ nhầm
     * `filters[merged_status]` là mất trang.
     *
     * CỐ Ý không im lặng bỏ qua: bỏ qua một bộ lọc rồi trả về hàng không khớp là hỏng **âm thầm**,
     * tệ hơn hẳn một lỗi ồn ào. 400 nêu tên khoá thì vừa ồn ào như 500, vừa chỉ đúng chỗ phải sửa.
     */
    const unknownKeys = unknownFilterKeys(queryParams?.filters)
    if (unknownKeys.length) {
      throw new BadRequestError(`Unknown filter: ${unknownKeys.join(', ')}`)
    }

    /**
     * Cùng câu chuyện, hẹp hơn một bậc: khoá ĐÚNG nhưng giá trị sai **kiểu**. Bốn khoá so thẳng
     * với cột `uuid`, và một chuỗi không phải UUID làm PostgREST ném → 500. Cùng kiểu câu trả lời
     * với khoá lạ: 400 nêu tên khoá, không vọng lại giá trị.
     */
    const malformedKeys = malformedUuidFilterKeys(queryParams?.filters)
    if (malformedKeys.length) {
      throw new BadRequestError(`Invalid filter value: ${malformedKeys.join(', ')}`)
    }

    // Parse additional query parameters for filtering
    const { searchParams } = new URL(request.url)
    const editableOnly = searchParams.get('editableOnly') === 'true'
    const excludeCollectionId = searchParams.get('excludeCollectionId') || undefined

    const { data, count } = await touchPointService.getAllTouchPoints(params.org_id, {
      scope,
      userId: context.userId,
      queryParams,
      applyCollectionPermissions: true, // Enable collection-based filtering
      editableOnly, // Filter for editable touch-points only
      excludeCollectionId, // Exclude touch-points in this collection
    })
    const enrichedData = await touchPointService.enrichWithConversionCounts(data ?? [])
    return APIResponse.ok({ data: enrichedData, rowCount: count })
  }
)

export const POST = withAuth<{ org_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: AuthContext }
  ) => {
    //**Validate form data && data preprocessing */
    const formData = await request.formData()
    const json = formToJSON(formData)
    const validatedData = touchPointFormCreateWithAdvanceSchema.parse(json)

    const insertedTp = await touchPointService.createTouchPoint(
      params.org_id,
      validatedData,
      context.userId
    )

    return APIResponse.created({
      data: {
        id: insertedTp.id,
        short_url: insertedTp.short_url,
        qr_customize_options: insertedTp.qr_customize_options ?? {},
        privacy_security: insertedTp.privacy_security ?? null,
        variants_content: insertedTp.variants_content ?? {},
      },
      i18nMessage: {
        key: 'common:messages.success.created',
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: AuthContext }
  ) => {
    const body = await request.json()
    const ids = body.ids

    const userId = requestContext?.getStore()?.userId!
    const count = await touchPointService.deleteTpByIds(params.org_id, ids, userId)
    if (!count) {
      throw new BadRequestError("Can't delete Link", {
        key: 'common:messages.error.permission_error',
      })
    }

    if (count < ids.length) {
      return APIResponse.deleted({
        success: true,
        i18nMessage: {
          key: 'common:messages.success.deleted_count_restricted',
          params: {
            field: 'Links',
            count: `${count}/${ids.length}`,
          },
        },
      })
    }
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted_count',
        params: {
          field: 'Links',
          count,
        },
      },
    })
  }
)
