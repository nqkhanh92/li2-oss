import { NextRequest } from 'next/server'
import { touchPointService } from '@/core/services/touch-point.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

/**
 * `GET …/touch-points/link-count` → `{ link_count }`.
 *
 * Tách khỏi `GET …/touch-points` thay vì gắn thêm vào `rowCount` của nó, vì hai con số có nhịp
 * sống khác nhau: `rowCount` đổi theo mỗi lần gõ vào ô tìm kiếm, còn con số này thì không. Gộp lại
 * là bắt đếm lại toàn tổ chức sau mỗi ký tự người dùng gõ, và cache của TanStack Query thì không
 * tách được hai thứ nằm trong cùng một phản hồi.
 *
 * Là segment tĩnh nằm cạnh `[touch_point_id]`; Next ưu tiên tĩnh hơn động, và không uuid nào được
 * viết là "link-count" — cùng lý do `artifacts/quota` đứng được cạnh `[artifact_id]`.
 *
 * Quyền: đúng quyền của danh sách. `getPermissionScopeOrThrow` ở đây là CỐ Ý và đúng chỗ —
 * VIEW_TOUCH_POINTS là quyền *có* scope (OWN/ALL), và chính scope đó được truyền xuống để đếm.
 * Cảnh báo "đừng dùng getPermissionScopeOrThrow" áp cho quyền scope-null; dùng nó ở đó mới là cái
 * đã gây 403 cho cả Owner ngày 2026-10-26.
 */
export const GET = withAuth<{ org_id: string }>(
  async (_request: NextRequest, { params, context }) => {
    const scope = await getPermissionScopeOrThrow(
      params.org_id,
      ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS
    )

    const linkCount = await touchPointService.countLinks(params.org_id, {
      scope,
      userId: context.userId,
    })

    return APIResponse.ok({ data: { link_count: linkCount } })
  }
)
