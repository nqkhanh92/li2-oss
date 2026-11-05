import { NextRequest } from 'next/server'
import { artifactService } from '@/core/services/artifact.service'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AuthContext } from '@/shared/types/request'

/**
 * `POST …/{artifact_id}/slug` (spec wave 4 B2) — đổi đường dẫn của một artifact đã live.
 *
 * POST, không PATCH, dù chỉ một field đổi: PATCH trên resource này dành cho sửa FIELD trong DB
 * (`access_mode`), còn đây là thao tác có side effect NGOÀI DB — một hàng mới trong bảng `slugs` và
 * một ảnh QR được render lại rồi upload. Cùng lý do và cùng họ với `publish` và `replace`.
 *
 * Route chỉ lấy `slug` ra khỏi body và từ chối một body không có string ở đó. Mọi luật về định dạng
 * (6–64 ký tự, `a-z0-9` nối bằng gạch, cấm tiền tố `f-`) nằm trong service, dùng CHUNG `slugSchema`
 * với `publish`: hai bản luật thì bản ở route là bản không ai cập nhật khi schema đổi.
 */
export const POST = withAuth<{ org_id: string; artifact_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string; artifact_id: string }; context: AuthContext }
  ) => {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object' || typeof body.slug !== 'string')
      throw new BadRequestError('`slug` is required', {
        key: 'common:messages.error.field_required',
        params: { field: 'slug' },
      })

    const artifact = await artifactService.changeSlug(
      params.org_id,
      context.userId,
      params.artifact_id,
      body.slug
    )

    return APIResponse.ok({
      data: artifact,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: { field: '$t(label.slug)' },
      },
    })
  }
)
