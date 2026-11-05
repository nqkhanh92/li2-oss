import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { staticQrService } from '@/core/services/static-qr.service'
import { updateStaticQrSchema } from '@/shared/schemas/static-qr'

export const GET = withAuth<{ org_id: string; static_qr_id: string }>(
  async (req, { params: { org_id, static_qr_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const data = await staticQrService.findById(org_id, static_qr_id)
    return APIResponse.ok({ data })
  }
)

export const PATCH = withAuth<{ org_id: string; static_qr_id: string }>(
  async (req, { params: { org_id, static_qr_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const body = await req.json()
    const validatedData = updateStaticQrSchema.parse(body)

    const updatedStaticQr = await staticQrService.update(org_id, static_qr_id, validatedData as any)
    return APIResponse.ok({
      data: updatedStaticQr,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: {
          field: 'Static QR',
        },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; static_qr_id: string }>(
  async (req, { params: { org_id, static_qr_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    await staticQrService.delete(org_id, static_qr_id)
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted_field',
        params: {
          field: 'Static QR',
        },
      },
    })
  }
)
