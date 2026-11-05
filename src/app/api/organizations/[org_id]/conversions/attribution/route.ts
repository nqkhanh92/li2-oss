import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { conversionService } from '@/core/services/conversion.service'
import { NextRequest } from 'next/server'

export const GET = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    const searchParams = req.nextUrl.searchParams

    const limitParam = searchParams.get('limit')
    const attributionParams = {
      startDate: searchParams.get('startDate') || null,
      endDate: searchParams.get('endDate') || null,
      touchPointId: searchParams.get('touchPointId') || null,
      limit: limitParam ? parseInt(limitParam, 10) : 3,
    }

    const attribution = await conversionService.getTouchpointAttribution(org_id, attributionParams)

    return APIResponse.ok({
      data: attribution,
    })
  }
)
