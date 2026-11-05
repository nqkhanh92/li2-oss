import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { conversionService } from '@/core/services/conversion.service'
import { ConversionFilterParams } from '@/core/types/conversions'

export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

  const queryParams = getQueryParams(req) as SearchFilterPagination

  const {
    excludeBot,
    startDate,
    endDate,
    collection_ids,
    tag_ids,
    touch_point_ids,
    exclude_bot,
    source,
    event_names,
    utm_source_values,
    channel_values,
    ...remainingFilters
  } = queryParams.filters

  queryParams.filters = remainingFilters

  const conversionFilters: ConversionFilterParams = {
    collectionIds: collection_ids,
    tagIds: tag_ids,
    touchPointIds: touch_point_ids,
    excludeBot: exclude_bot,
    source,
    eventNames: event_names,
    utmSources: utm_source_values,
    channels: channel_values,
  }
  const { data, count } = await conversionService.findAllConversions(
    org_id,
    conversionFilters,
    queryParams
  )
  return APIResponse.ok({
    data,
    rowCount: count,
  })
})
