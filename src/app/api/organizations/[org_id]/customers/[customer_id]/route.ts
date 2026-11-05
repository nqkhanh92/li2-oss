import { APIResponse } from '@/infrastructure/response/ok/base'
import { NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { conversionService } from '@/core/services/conversion.service'

export const GET = withAuth<{ org_id: string; customer_id: string }>(
  async (_req, { params: { org_id, customer_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN, không chỉ có session — xem chú thích đầy đủ ở
    // `customers/route.ts`. Thiếu dòng này thì bất kỳ ai đã đăng nhập cũng đọc được
    // dữ liệu khách của tổ chức khác, chỉ cần biết `org_id`.
    await ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    const customer = await conversionService.findCustomerById(org_id, customer_id)

    if (!customer) {
      throw new NotFoundError('Customer not found')
    }

    return APIResponse.ok({ data: customer })
  }
)
