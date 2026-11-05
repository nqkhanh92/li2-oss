import { NextRequest } from 'next/server'
import { artifactService } from '@/core/services/artifact.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

/**
 * `GET …/artifacts/access-modes` → `{ modes: ArtifactAccessMode[] }` — những chế độ xem org này
 * ĐƯỢC chọn hôm nay.
 *
 * Tồn tại vì một lý do: PM chốt (§9) chế độ Google gated bằng env server (`ARTIFACT_GOOGLE_CLIENT_*`),
 * và dashboard là client component không đọc được env đó. Một `NEXT_PUBLIC_*` thứ ba sẽ là công tắc
 * thứ hai cho cùng một tính năng — và ngày nó lệch với công tắc server, UI hiện Google còn PATCH trả
 * 400. Hỏi server là cách duy nhất để hai bên đọc cùng một `hasArtifactGoogleClient()`.
 *
 * Static segment cạnh `[artifact_id]`, như `quota`. Cùng quyền với xem danh sách.
 */
export const GET = withAuth<{ org_id: string }>(
  async (_request: NextRequest, { params }: { params: { org_id: string } }) => {
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    return APIResponse.ok({ data: { modes: artifactService.availableAccessModes() } })
  }
)
