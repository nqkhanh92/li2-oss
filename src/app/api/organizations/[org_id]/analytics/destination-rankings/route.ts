import { analyticService } from '@/core/services/analytic.service'
import { RankingDestinationVisits } from '@/core/types/analytics'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { getQueryParams } from '@/shared/lib/utils'
import dayjs from 'dayjs'

export const GET = withAuth<{ org_id: string }>(async (request, { context, params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

  const {
    type,
    date_range,
    exclude_bot,
    removeSpaceFilters,
    tag_ids,
    tp_ids,
    collection_ids,
    utm_campaign_values,
    utm_medium_values,
    utm_source_values,
    interaction_types,
  } = getQueryParams(request) as {
    type: 'full_urls' | 'base_urls'
    date_range?: { from: string; to: string }
    exclude_bot?: string
    removeSpaceFilters?: string
    tag_ids?: string[]
    tp_ids?: string[]
    collection_ids?: string[]
    utm_campaign_values?: string[]
    utm_medium_values?: string[]
    utm_source_values?: string[]
    interaction_types?: string[]
  }

  const [start_time, end_time] = [
    dayjs(date_range?.from || new Date()).toISOString(),
    dayjs(date_range?.to || new Date()).toISOString(),
  ]

  const excludeBotBoolean = exclude_bot === 'true' ? true : exclude_bot === 'false' ? false : false
  const removeSpaceFiltersBool = removeSpaceFilters === 'true'

  const analytics = await analyticService.getRankingByDestinations(
    type,
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

  return APIResponse.ok({ data: analytics })
})
