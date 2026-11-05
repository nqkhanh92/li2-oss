import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { contentAudienceService } from '@/core/services/content-audience.service'

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

  const queryParams = getQueryParams(req) as SearchFilterPagination

  /**
   * Trả tập KHÁN GIẢ, không còn là danh sách khách của một CRM: `customer_profiles` (người mở
   * artifact bằng Google, có email) hợp với `visits` nhóm theo `fp` (thiết bị ẩn danh). Hai nguồn
   * không nối được với nhau — xem `content-audience.service.ts`.
   *
   * `scanTruncated` phải đi ra tới UI: khi `visits` chạm trần quét thì số thiết bị là CHƯA ĐỦ, và
   * im lặng ở đây sẽ thành một con số người dùng tin là đầy đủ.
   */
  const { data, count, scanTruncated } = await contentAudienceService.listAudience(
    org_id,
    queryParams
  )
  return APIResponse.ok({
    data,
    rowCount: count,
    scanTruncated,
  })
})
