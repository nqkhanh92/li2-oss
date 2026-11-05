import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { formToJSON } from 'axios'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { touchPointImportTasksService } from '@/core/services/touchpoint_import_tasks.service'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

export const POST = withAuth<{ org_id: string }>(async (request, { params: { org_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

  const body = await request.json()

  const { notMappedHeaders, notMappedColumns } = body
  if (!notMappedHeaders || !notMappedColumns) {
    throw new BadRequestError('CSV headers and columns is required')
  }

  const autoMapping = await touchPointImportTasksService.autoMappingImport(
    org_id,
    notMappedHeaders,
    notMappedColumns
  )

  return APIResponse.ok({ message: 'Auto mapping successfully', data: autoMapping })
})
