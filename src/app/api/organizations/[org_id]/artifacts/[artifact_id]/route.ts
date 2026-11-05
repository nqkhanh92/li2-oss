import { NextRequest } from 'next/server'
import { artifactService } from '@/core/services/artifact.service'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { AuthContext } from '@/shared/types/request'

export const GET = withAuth<{ org_id: string; artifact_id: string }>(
  async (_request: NextRequest, { params }: { params: { org_id: string; artifact_id: string } }) => {
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const artifact = await artifactService.getForOrg(params.org_id, params.artifact_id)
    return APIResponse.ok({ data: artifact })
  }
)

/**
 * Removes the content and keeps the address: the object is deleted, the row becomes a tombstone, the
 * touch point lives on. The order and the reasons live in `artifactService.deleteForOrg`.
 *
 * The status code and the payload are UNCHANGED, and the i18n key still says "deleted". For the user
 * the action is still "I deleted this", and the file really is gone for good — that a short link keeps
 * redirecting to an explanation page is infrastructure, not something this response should rename.
 *
 * An explicit `i18nMessage` because `APIResponse.deleted`'s default key is
 * `common.messages.deleted.default` — dots where the namespace separator should be a colon, and no
 * such key in either language file. i18next answers a missing key with the key itself, so the default
 * would put `common.messages.deleted.default` in a toast. That is the same class of bug as the four
 * raw keys this feature already shipped once.
 */
export const DELETE = withAuth<{ org_id: string; artifact_id: string }>(
  async (
    _request: NextRequest,
    { params, context }: { params: { org_id: string; artifact_id: string }; context: AuthContext }
  ) => {
    try {
      await artifactService.deleteForOrg(params.org_id, context.userId, params.artifact_id)
    } catch (error) {
      /**
       * ⚠️ KEY MAPPED BACK, ON PURPOSE (wave 4 WP1 §4).
       *
       * `deleteForOrg` now throws `artifactRemoved()` (key `artifact:errors.removed`) for a second
       * delete, so MCP's `delete_artifact` can answer that case as a SUCCESS. The status was already
       * 404 and still is — but that key's SENTENCE is written for `update_artifact` ("không cập nhật
       * được nữa. Đăng một artifact mới"), which is the wrong thing to say in a toast after someone
       * pressed Delete twice. So the human-facing route restores the exact error it answered before:
       * 404 with `common:messages.error.not_found`.
       *
       * Narrow by design — only that one key, only on a 404. Anything else propagates untouched.
       */
      if (error instanceof NotFoundError && error.i18nMessage?.key === 'artifact:errors.removed')
        throw new NotFoundError('Artifact not found', {
          key: 'common:messages.error.not_found',
          params: { field: '$t(label.artifact)' },
        })
      throw error
    }

    return APIResponse.deleted({
      data: { id: params.artifact_id },
      i18nMessage: {
        key: 'common:messages.success.deleted_field',
        params: { field: '$t(label.artifact)' },
      },
    })
  }
)

/**
 * `PATCH …/{artifact_id}` — editing FIELDS of the artifact (spec R2a). Today the only field is the
 * view permission: `{ access_mode, password? }`. This is the slot `replace/route.ts` reserved for
 * exactly this; replacing content stays a POST with side effects outside the database.
 *
 * The body is JSON and REQUIRED — unlike `publish`, where an empty body means "no options", a PATCH
 * with nothing in it has nothing to do and is a 400. `password` is handed to the service as-is and
 * never logged here or there.
 */
export const PATCH = withAuth<{ org_id: string; artifact_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string; artifact_id: string }; context: AuthContext }
  ) => {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || typeof body.access_mode !== 'string')
      throw new BadRequestError('access_mode is required', {
        key: 'common:messages.error.field_required',
        params: { field: 'access_mode' },
      })

    const artifact = await artifactService.setAccess(params.org_id, context.userId, params.artifact_id, {
      access_mode: body.access_mode,
      password: typeof body.password === 'string' ? body.password : undefined,
    })

    return APIResponse.ok({
      data: artifact,
      i18nMessage: { key: 'common:messages.success.updated_field', params: { field: '$t(label.artifact)' } },
    })
  }
)
