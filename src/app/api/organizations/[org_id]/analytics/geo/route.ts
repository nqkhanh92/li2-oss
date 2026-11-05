import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { getQueryParams } from '@/shared/lib/utils'
import { logger } from '@/infrastructure/logging/logger'
import { analyticService } from '@/core/services/analytic.service'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { GeoLevel } from '@/core/types/analytics/geo.type'
import { DEFAULT_GEO_LIMIT } from '@/core/helpers/analytics/geo-aggregate'

const log = logger.child({
  service: 'analytics-geo',
})

const parseLevel = (raw: unknown): GeoLevel => (raw === 'region' ? 'region' : 'country')

const parsePositiveInt = (raw: unknown, fallback: number): number => {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

/**
 * Ngưỡng ẩn danh: **0 là một giá trị thật** (tắt hẳn việc ẩn, cho export/debug), nên không dùng
 * được `parsePositiveInt` — hàm kia coi 0 là "không truyền gì" và sẽ âm thầm bật lại ngưỡng 5.
 * Không truyền gì → undefined → `aggregateGeo` dùng mặc định 5.
 */
const parseThreshold = (raw: unknown): number | undefined => {
  if (raw === undefined || raw === '') return undefined
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

/**
 * GET /api/organizations/{org_id}/analytics/geo
 *
 * Phân bố lượt truy cập theo vị trí, PHẦN TRĂM TÍNH SẴN Ở SERVER. Endpoint riêng, không sửa
 * `by-tags`: payload kia là payload chung cho cả dashboard.
 *
 * Tham số ngày theo đúng quy ước của các endpoint analytics khác —
 * `date_range[from]` / `date_range[to]`, qs-parse, ISO hoặc timestamp. Cũng nhận `from` / `to`
 * phẳng cho tiện gọi tay.
 */
export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: any }
  ) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    //
    // ⚠ `nonScopePolicies` chứ KHÔNG phải `getPermissionScopeOrThrow`: `view_analytics` nằm trong
    // `noScopePermissionKeys` (Owner có `scope: null`), dùng sai hàm đã gây 403 cho cả Owner trên
    // production 2026-10-26.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

    try {
      const queryParams = getQueryParams(request)
      const {
        level,
        country,
        limit,
        anonymity_threshold,
        date_range,
        from,
        to,
        tag_ids,
        tp_ids,
        exclude_bot,
        collection_ids,
        interaction_types,
      } = queryParams

      const [start_time, end_time] = [
        dayjs(date_range?.from || from || dayjs().subtract(30, 'days').toDate()).toISOString(),
        dayjs(date_range?.to || to || new Date()).toISOString(),
      ]

      const analytics = await analyticService.getGeoAnalytics(
        params.org_id,
        {
          level: parseLevel(level),
          country: typeof country === 'string' ? country : undefined,
          limit: parsePositiveInt(limit, DEFAULT_GEO_LIMIT),
          anonymity_threshold: parseThreshold(anonymity_threshold),
          start_time,
          end_time,
          tag_ids,
          tp_ids,
          exclude_bot: exclude_bot === 'true',
          collection_ids,
          interaction_types,
        },
        context.userId
      )

      return NextResponse.json(analytics)
    } catch (error: any) {
      log.error(error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
