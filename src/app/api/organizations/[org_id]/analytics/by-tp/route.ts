import { NextRequest, NextResponse } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import { AnalyticByTouchPointParams } from '@/features/analytics/hooks/queries'
import dayjs from 'dayjs'
import { analyticService } from '@/core/services/analytic.service'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export const GET = withAuth(
  async (request: NextRequest, { params, context }: { params: { org_id: string }; context: any }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    try {
      const queryParams = getQueryParams(request)
      const { tp_ids, date_range, exclude_bot, collection_ids } = queryParams as AnalyticByTouchPointParams & {
        exclude_bot?: string
        collection_ids?: string[]
      }
      const [start_time, end_time] = [
        dayjs(date_range?.from || new Date()).toISOString(),
        dayjs(date_range?.to || new Date()).toISOString(),
      ]
      // Convert exclude_bot string to boolean
      const excludeBotBoolean = exclude_bot === 'true' ? true : exclude_bot === 'false' ? false : false

      // Use service layer to get permission-filtered analytics
      const analytics = await analyticService.getAnalyticByTouchPoint(
        params.org_id,
        tp_ids || undefined,
        start_time,
        end_time,
        excludeBotBoolean,
        collection_ids,
        context.userId
      )
      return NextResponse.json(analytics)
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
