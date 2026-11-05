import { NextRequest, NextResponse } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import { RawVisitDataParams } from '@/features/analytics/hooks/queries'
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
  service: 'analytics-raw-visits',
})

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
      const {
        tag_ids,
        tp_ids,
        date_range,
        exclude_bot,
        pagination,
        collection_ids,
        utm_sources,
        utm_mediums,
        utm_campaigns,
        interaction_types,
      } = queryParams as RawVisitDataParams & {
        exclude_bot?: string
        pagination?: {
          pageIndex: number
          pageSize: number
        }
        collection_ids?: string[]
        utm_sources?: string[]
        utm_mediums?: string[]
        utm_campaigns?: string[]
        interaction_types?: string[]
      }

      // Get user's timezone from request headers or default to UTC
      const timezone = request.headers.get('x-timezone') || 'UTC'

      const [start_time, end_time] = [
        dayjs(date_range?.from || dayjs().subtract(24, 'hours').toDate()).toISOString(),
        dayjs(date_range?.to || new Date()).toISOString(),
      ]

      // Convert exclude_bot string to boolean
      const excludeBotBoolean =
        exclude_bot === 'true' ? true : exclude_bot === 'false' ? false : false

      // Extract pagination parameters
      const pageIndex = pagination?.pageIndex ?? 0
      const pageSize = pagination?.pageSize ?? 50
      const offset = pageIndex * pageSize

      // Use service layer to get permission-filtered raw visits
      const rawVisits = await analyticService.getRawVisitData(
        params.org_id,
        tag_ids || undefined,
        tp_ids || undefined,
        start_time,
        end_time,
        excludeBotBoolean,
        timezone,
        undefined, // last_hours - using date_range instead
        pageSize,
        offset,
        collection_ids,
        context.userId,
        utm_sources,
        utm_mediums,
        utm_campaigns,
        interaction_types
      )

      // Extract total_count from first row (all rows have the same total_count)
      const totalCount = rawVisits?.[0]?.total_count ?? 0

      // Return response in the expected format for infinite scroll
      return NextResponse.json({
        data: rawVisits,
        rowCount: totalCount,
      })
    } catch (error: any) {
      log.error(error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
