import { NextRequest } from 'next/server'
import { createIntegrationService } from '@/infrastructure/external/integrations/factory'
import { createIntegrationSchema } from '@/shared/schemas/integrations'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'

/**
 * POST — thử kết nối tới một integration trước khi lưu nó.
 *
 * ## Vì sao route này từng là một lỗ SSRF KHÔNG XÁC THỰC
 *
 * Bản trước có ba thứ cộng lại:
 *
 * 1. **Không có wrapper auth và không `getSession`.** Và `src/middleware.ts` **loại trừ `api`**
 *    khỏi matcher (`(?!…|api|…)`), nên middleware KHÔNG chạy cho bất kỳ `/api/*` nào — mọi xác
 *    thực API là việc của từng route. Tức endpoint này mở cho cả Internet.
 * 2. `ensurePolicy` bị **comment lại**.
 * 3. `const { type, config } = body satisfies {…}` — `satisfies` là **TypeScript thuần, bị xoá lúc
 *    biên dịch**. Nó KHÔNG kiểm gì lúc chạy, nên `config.base_url` là input thô.
 *
 * `ParcelvoyIntegrationService` đưa `base_url` thẳng vào `axios.create({ baseURL })` rồi
 * `GET /keys`, và `validateConfig()` trả `true` khi và chỉ khi phản hồi là 200 + JSON. Kết quả:
 * bất kỳ ai cũng bắt được app gửi GET tới host/cổng tuỳ ý **bên trong `golang_network`**, với cả
 * header `Authorization` do họ chọn, và đọc kết quả qua một **oracle boolean**. Đúng cái mạng nội
 * bộ mà đợt rồi vừa đóng cổng public để bảo vệ.
 *
 * ## Nay
 *
 * `withAuth` (401 cho khách lạ) → `ensurePolicy(ADD_INTEGRATION)` (chặn người ngoài tổ chức) →
 * `createIntegrationSchema.parse` (validate THẬT lúc chạy, `base_url` phải là URL hợp lệ).
 *
 * Thứ tự là chủ ý: xác thực và phân quyền chạy TRƯỚC khi đọc body, nên một request không có quyền
 * không bao giờ tới được chỗ phát sinh kết nối ra ngoài.
 *
 * ⚠ Vẫn còn một mặt SSRF **đã thu hẹp nhưng chưa biến mất**: thành viên có quyền
 * `ADD_INTEGRATION` vẫn chọn được `base_url` trỏ vào mạng nội bộ. Đó là bản chất của tính năng
 * "kết nối tới Parcelvoy self-host của tôi". Muốn bịt hẳn thì phải chặn dải IP riêng —
 * `assertUrlIsSafeToFetch` đã có trong repo; chưa áp ở đây vì nó sẽ chặn luôn những deploy đặt
 * Parcelvoy trong cùng mạng, nên cần chủ sản phẩm quyết.
 */
export const POST = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.ADD_INTEGRATION])

  const { type, config } = createIntegrationSchema.parse(await request.json())

  const integrationService = createIntegrationService(type, config)
  const isValid = await integrationService.validateConfig()

  if (!isValid) {
    throw new BadRequestError("We can't connect to your integration, please check your data!")
  }

  return APIResponse.ok({
    success: true,
    i18nMessage: {
      key: 'common:messages.success.verify_field',
      params: {
        field: '$t(module.integration)',
      },
    },
  })
})
