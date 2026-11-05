import { analyticService } from '@/core/services/analytic.service'
import { RealtimeAnalyticsTypes } from '@/core/types/analytics/advanced.type'
import { getTimeZone } from '@/shared/utils/server/get-timezone'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { disabledFeatures } from '@/shared/constants/disabled-features'

// Sourced from conversion_events and customer_profiles, which attribution hides
const VISITOR_FIELDS = [
  'customer_profile_id',
  'customer_name',
  'customer_email',
  'customer_external_id',
  'visitor_id',
] as const

export const GET = withAuth<{ type: RealtimeAnalyticsTypes; org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    const { type, org_id } = params
    const searchParams = request.nextUrl.searchParams
    const timezone = getTimeZone()
    const limit = Math.min(Number(searchParams.get('p_limit')) || 500, 500) || undefined
    const offset = Number(searchParams.get('p_offset')) || 0
    const lastHours = Math.min(Number(searchParams.get('p_last_hours')) || 24, 168)

    const response = await analyticService.getRealtimeAnalytics(
      org_id,
      type,
      {
        p_organization_id: org_id,
        p_timezone: timezone,
        p_last_hours: lastHours,
        p_limit: limit,
      },
      context.userId
    )

    // v3 RPC doesn't support LIMIT/OFFSET natively — slice in JS
    let pagedData = response.data
    if (limit) {
      pagedData = response.data.slice(offset, offset + limit)
    }

    const responseData = disabledFeatures.ATTRIBUTION
      ? pagedData.map((row) => {
          const copy = { ...row } as Record<string, unknown>
          for (const field of VISITOR_FIELDS) delete copy[field]
          return copy
        })
      : pagedData

    return NextResponse.json({
      data: responseData,
      rowCount: response.rowCount,
    })
  }
)
