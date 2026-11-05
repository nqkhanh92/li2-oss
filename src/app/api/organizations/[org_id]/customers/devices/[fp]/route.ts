import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { contentAudienceService } from '@/core/services/content-audience.service'

/**
 * GET /api/organizations/:org_id/customers/devices/:fp
 *
 * Lịch sử của một THIẾT BỊ ẩn danh: đã quét QR nào, bấm link nào, lúc nào. Dữ liệu này có đủ
 * trong `visits` từ lâu nhưng chưa chỗ nào hiện ra.
 *
 * `fp` không phải người: xoá cookie hay đổi máy là ra `fp` khác. Giá trị thật là uuid (đo trên
 * LiHi) nên an toàn trong path, và Next đã decode `params` — không decode lần hai.
 */
export const GET = withAuth<{ org_id: string; fp: string }>(
  async (req, { params: { org_id, fp } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN, không chỉ có session — xem chú thích đầy đủ ở `customers/route.ts`.
    await ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    // Service lọc `organization_id`, nên một `fp` của tổ chức khác trả về `null` chứ không phải
    // lịch sử của họ.
    const activity = await contentAudienceService.getDeviceActivity(org_id, fp)
    return APIResponse.ok({ data: activity })
  }
)
