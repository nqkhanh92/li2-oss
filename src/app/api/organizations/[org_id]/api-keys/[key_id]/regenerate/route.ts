import { NextRequest } from 'next/server'
import { apiKeyService } from '@/core/services/api-key.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { APIResponse } from '@/infrastructure/response/ok/base'

export const POST = withAuth<{ org_id: string; key_id: string }>(
  async (request: NextRequest, { params }) => {
    /**
     * `manage_organization` — CÙNG policy với `api-keys/route.ts:16` và
     * `api-keys/[key_id]/route.ts:19`. Chọn cho khớp hai route kia chứ không chọn
     * `MANAGE_API_KEYS` (dù khoá đó tồn tại): lệch policy thì một vai tạo và xoá được key
     * nhưng regenerate lại 403, mà regenerate chính là cách xử lý khi key bị lộ.
     *
     * Thiếu dòng này thì ai đã đăng nhập cũng rotate được API key của tổ chức khác — và
     * `regenerateKey` TRẢ VỀ secret dạng rõ (`api-key.service.ts:346`, "only time it's
     * shown"), nên vừa phá integration của họ vừa lấy được key mới.
     */
    await ensurePolicy(params.org_id, nonScopePolicies.manage_organization)

    const regeneratedKey = await apiKeyService.regenerateKey(params.org_id, params.key_id)
    return APIResponse.ok({
      data: regeneratedKey,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: { field: 'API Key' },
      },
    })
  }
)
