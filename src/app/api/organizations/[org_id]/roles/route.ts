import { NextRequest } from 'next/server'
import { getServiceClient } from '@/infrastructure/database/supabase/server'
import { Tables } from '@/shared/types/database.types'
import { RolePermission } from '@/shared/types/role-permission'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { APIResponse } from '@/infrastructure/response/ok/base'

export type OrgRole = Omit<Tables<'roles'>, 'permissions'> & {
  permissions: RolePermission[]
}

export const GET = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_MEMBERS])

  const supabase = await getServiceClient()
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .or(`org_id.eq.${params.org_id},org_id.is.null`)
  if (error) {
    throw error
  }
  return APIResponse.ok({
    data,
  })
})
