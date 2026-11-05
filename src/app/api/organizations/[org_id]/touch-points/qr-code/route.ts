import { NextRequest } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { Tables } from '@/shared/types/database.types'
import { TouchPointVariantsContent } from '@/features/touch-points/types'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { logger } from '@/infrastructure/logging/logger'
import { touchPointService } from '@/core/services/touch-point.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
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

    const { data, count } = await touchPointService.getAllTouchPointsWithQrCode(params.org_id, {
      scope,
      userId: context.userId,
      queryParams,
      applyCollectionPermissions: true, // Enable collection-based filtering
    })
    return APIResponse.ok({ data, rowCount: count })
  }
)
