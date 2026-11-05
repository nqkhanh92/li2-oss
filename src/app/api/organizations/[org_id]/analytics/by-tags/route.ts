import { NextRequest, NextResponse } from 'next/server'
import { getQueryParams } from '@/shared/lib/utils'
import { AnalyticByTagParams } from '@/features/analytics/hooks/queries'
import dayjs from 'dayjs'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { logger } from '@/infrastructure/logging/logger'
import { analyticService } from '@/core/services/analytic.service'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
export type AnalyticByTagDataType = {
  referrers: { name: string; count: number }[]
  types: { name: AllTouchPointVariants; count: number }[]
  os: { name: string; count: number }[]
  platforms: { name: string; count: number }[]
  countries: {
    name: string
    count: number
    cities: { city: string; count: number }[]
  }[]
  totalVisits: number
  totalUniqueVisits: number
  interaction_types: AllTouchPointVariants[]

  performance_by_date: {
    [date: string]: {
      total: number
      unique: number
      by_interaction_types: Partial<Record<AllTouchPointVariants, number>>
    }
  }
}
const log = logger.child({
  service: 'analytics-by-tag',
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
        date_range,
        exclude_bot,
        tp_ids,
        collection_ids,
        utm_source_values,
        utm_medium_values,
        utm_campaign_values,
        removeSpaceFilters,
        interaction_types,
      } = queryParams as AnalyticByTagParams & {
        exclude_bot?: string
        collection_ids?: string[]
        utm_source_values?: string[]
        utm_medium_values?: string[]
        utm_campaign_values?: string[]
        removeSpaceFilters?: string
        interaction_types?: string[]
      }

      const [start_time, end_time] = [
        dayjs(date_range?.from || new Date()).toISOString(),
        dayjs(date_range?.to || new Date()).toISOString(),
      ]
      // Convert exclude_bot string to boolean
      const excludeBotBoolean =
        exclude_bot === 'true' ? true : exclude_bot === 'false' ? false : false
      // Convert removeSpaceFilters string to boolean
      const removeSpaceFiltersBool = removeSpaceFilters === 'true'

      // Use service layer (not repository) to get permission-filtered analytics
      const analytics = await analyticService.getAnalyticByTag(
        params.org_id,
        tag_ids || undefined,
        start_time,
        end_time,
        tp_ids || undefined,
        excludeBotBoolean,
        collection_ids,
        context.userId,
        utm_source_values,
        utm_medium_values,
        utm_campaign_values,
        interaction_types,
        removeSpaceFiltersBool
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
