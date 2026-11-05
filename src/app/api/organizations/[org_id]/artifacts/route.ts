import { NextRequest } from 'next/server'
import { artifactBodyExceedsLimit } from '@/core/helpers/artifact-upload-limit'
import { artifactService } from '@/core/services/artifact.service'
import { ARTIFACT_MAX_BYTES } from '@/core/types/artifact.type'
import {
  BadRequestError,
  PayloadTooLargeError,
} from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { AuthContext } from '@/shared/types/request'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/** `removed` cố tình KHÔNG có mặt: tombstone không bao giờ được liệt kê qua API này. */
const LISTABLE_STATUSES = ['draft', 'live']

export const GET = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string } }) => {
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT)
    )

    // Chuỗi rỗng phải thành `undefined`, không phải `''` — `''` đi xuống repo sẽ dựng một mệnh đề
    // `ilike.%%` khớp mọi hàng, tức một bộ lọc vô hình mà vẫn tốn một truy vấn slug.
    const trimmed = (key: string) => searchParams.get(key)?.trim() || undefined

    // Danh sách trắng, không phải lọc rỗng: `status` đi thẳng vào `in()`, và cho `removed` lọt
    // qua đây là mở một đường đọc tombstone bằng chính API sinh ra để giấu chúng.
    const status = (trimmed('status')?.split(',') ?? []).filter((s) =>
      LISTABLE_STATUSES.includes(s)
    )

    const { data, rowCount } = await artifactService.listForOrg(params.org_id, {
      page,
      limit,
      search: trimmed('search'),
      fromDate: trimmed('from_date'),
      toDate: trimmed('to_date'),
      status: status.length > 0 ? status : undefined,
    })
    return APIResponse.ok({ data, rowCount })
  }
)

export const POST = withAuth<{ org_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: AuthContext }
  ) => {
    /**
     * LAYER 0 — refuse on the declared length, before a single byte is parsed. `formData()` of
     * undici multiplies memory ~5× (10MB in → +50,7MB RSS, measured), so parsing first and then
     * checking `file.size` pays for the body it is about to reject.
     */
    if (artifactBodyExceedsLimit(request.headers.get('content-length')))
      throw new PayloadTooLargeError('Artifact upload body exceeds the size limit', {
        key: 'common:messages.error.field_exceed_limit',
        params: { field: '$t(label.file)', limit: ARTIFACT_MAX_BYTES / 1024 / 1024 },
      })

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File))
      throw new BadRequestError('A file is required', {
        key: 'common:messages.error.field_required',
        params: { field: '$t(label.file)' },
      })

    const rawName = formData.get('name')
    const artifact = await artifactService.create(params.org_id, context.userId, {
      file,
      name: typeof rawName === 'string' ? rawName : undefined,
    })

    return APIResponse.created({
      data: artifact,
      i18nMessage: {
        key: 'common:messages.success.created',
        params: { field: '$t(label.artifact)' },
      },
    })
  }
)
