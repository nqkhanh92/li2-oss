import { NextRequest } from 'next/server'
import { artifactService } from '@/core/services/artifact.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

/**
 * `GET …/artifacts/quota` (spec R10): `{ used_bytes, quota_bytes, live_count, live_quota }`.
 *
 * A static segment beside `[artifact_id]`; Next resolves static over dynamic, and no uuid is spelled
 * "quota". Same permission as listing: whoever may see the artifacts may see how much room they take.
 */
export const GET = withAuth<{ org_id: string }>(
  async (_request: NextRequest, { params }: { params: { org_id: string } }) => {
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const quota = await artifactService.quotaForOrg(params.org_id)
    return APIResponse.ok({ data: quota })
  }
)
