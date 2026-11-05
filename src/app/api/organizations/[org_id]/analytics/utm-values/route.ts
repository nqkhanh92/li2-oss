import { NextRequest, NextResponse } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import dayjs from 'dayjs'
import { logger } from '@/infrastructure/logging/logger'
import { analyticService } from '@/core/services/analytic.service'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

const log = logger.child({
  service: 'analytics-utm-values',
})

export type UtmValuesResponse = {
  utm_source: string[]
  utm_medium: string[]
  utm_campaign: string[]
}

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: any }
  ) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    try {
      const queryParams = getQueryParams(request)
      const { tag_ids, tp_ids, collection_ids, date_range, exclude_bot } = queryParams as {
        tag_ids?: string[]
        tp_ids?: string[]
        collection_ids?: string[]
        date_range?: { from: string; to: string }
        exclude_bot?: string
      }

      const [start_time, end_time] = date_range
        ? [dayjs(date_range.from).toISOString(), dayjs(date_range.to).toISOString()]
        : [undefined, undefined]

      const excludeBotBoolean = exclude_bot === 'true'

      const utmValues = await analyticService.getDistinctUtmValues(
        params.org_id,
        tag_ids,
        tp_ids,
        start_time,
        end_time,
        excludeBotBoolean,
        collection_ids,
        context.userId
      )

      return NextResponse.json(utmValues)
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
