import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { contentAudienceService } from '@/core/services/content-audience.service'

/**
 * GET /api/organizations/:org_id/customers/countries
 *
 * Quốc gia cho ô lọc, lấy từ `visits` nhóm theo `fp`. Trước đây đi qua
 * `customer_profiles.first_click_id` — cột rỗng ở mọi hàng trên LiHi, nên ô lọc luôn trống.
 */
export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  /**
   * Kiểm THÀNH VIÊN + QUYỀN, không chỉ có session. `withAuth` chỉ xác minh session tồn tại
   * (`with-auth.ts`), còn `org_id` thì lấy thẳng từ URL và `conversion.service` truy bằng
   * client service-role (bỏ qua RLS) — nên thiếu dòng này thì BẤT KỲ người dùng đã đăng nhập
   * nào cũng đọc được danh sách khách (tên, email, external id) của tổ chức khác, chỉ cần biết
   * `org_id`. Mà ai từng là thành viên thì đều biết: nó nằm trong mọi URL `/org/<uuid>/...`.
   * `VIEW_ANALYTICS` khớp đúng gate của mục Customers ở `menu-list.tsx`.
   */
  await ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

  const countries = await contentAudienceService.getAudienceCountries(org_id)
  return APIResponse.ok({ data: countries })
})
