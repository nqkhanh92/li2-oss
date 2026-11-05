import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { contentAudienceService } from '@/core/services/content-audience.service'

/**
 * GET /api/organizations/:org_id/customers/:customer_id/content-views
 *
 * "Đã xem những gì" — nội dung khách này đã mở, từ `artifact_views`.
 */
export const GET = withAuth<{ org_id: string; customer_id: string }>(
  async (req, { params: { org_id, customer_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN, không chỉ có session — xem chú thích đầy đủ ở
    // `customers/route.ts`. Thiếu dòng này thì bất kỳ ai đã đăng nhập cũng đọc được
    // dữ liệu khách của tổ chức khác, chỉ cần biết `org_id`.
    await ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    // `null` = hồ sơ không thuộc tổ chức này. Service lọc theo `organization_id` chứ không tin
    // `customer_id` từ URL: client service-role bỏ qua RLS nên id của org khác vẫn đọc được.
    const views = await contentAudienceService.getContentViews(org_id, customer_id)
    return APIResponse.ok({ data: views ?? [] })
  }
)
