import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export const GET = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ORGANIZATION])

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('org_credits')
    .select('*')
    .eq('org_id', params.org_id)
    .single()

  if (error) {
    throw error
  }
  return NextResponse.json(data)
})
