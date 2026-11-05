import { analyticService } from '@/core/services/analytic.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { getTimeZone } from '@/shared/utils/server/get-timezone'
import dayjs from 'dayjs'
import { getQueryParams } from '@/shared/lib/utils'
import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'

export const GET = withAuth(
  async (req: NextRequest, { params, context }: { params: { org_id: string }; context: any }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    const { tp_id, date_range, exclude_bot, collection_ids } = getQueryParams(req)
    const [start_time, end_time] = [
      dayjs(date_range?.from || new Date()).toISOString(),
      dayjs(date_range?.to || new Date()).toISOString(),
    ]
    const timezone = getTimeZone()

    // Convert exclude_bot string to boolean
    const excludeBotBoolean =
      exclude_bot === 'true' ? true : exclude_bot === 'false' ? false : false

    // Use service layer with permission filtering
    const analytics = await analyticService.getVisitsByDestinations(
      params.org_id,
      tp_id,
      start_time,
      end_time,
      excludeBotBoolean,
      timezone,
      collection_ids,
      context.userId
    )
    return APIResponse.ok({ data: analytics })
  }
)
