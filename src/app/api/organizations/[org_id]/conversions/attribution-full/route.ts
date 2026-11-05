import { NextRequest } from 'next/server'
import { conversionService } from '@/core/services/conversion.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { getQueryParams } from '@/shared/lib/utils'
import { ConversionFilterParams } from '@/core/types/conversions'

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: any }
  ) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    const { org_id } = params
    const queryParams = getQueryParams(request) as ConversionFilterParams
    const attribution = await conversionService.getTouchpointAttributionFull(org_id, queryParams)
    return APIResponse.ok({ data: attribution })
  }
)
