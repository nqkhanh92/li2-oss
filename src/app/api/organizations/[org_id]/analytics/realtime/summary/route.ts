import { analyticService } from '@/core/services/analytic.service'
import { getTimeZone } from '@/shared/utils/server/get-timezone'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export const GET = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    const { org_id } = params
    const searchParams = request.nextUrl.searchParams
    const timezone = getTimeZone()
    const lastHours = Math.min(Number(searchParams.get('p_last_hours')) || 24, 168)
    const userId = context.userId

    const response = await analyticService.getRealtimeAnalytics(
      org_id,
      'realtime-summary',
      {
        p_organization_id: org_id,
        p_timezone: timezone,
        p_last_hours: lastHours,
      },
      userId
    )

    return NextResponse.json({
      data: response.data?.[0] ?? null,
    })
  }
)