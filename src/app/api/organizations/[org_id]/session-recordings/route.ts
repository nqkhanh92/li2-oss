import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { sessionRecordingService } from '@/core/services/session-recording.service'

export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const queryParams = getQueryParams(req) as SearchFilterPagination
  const { data, count } = await sessionRecordingService.findAll(org_id, queryParams)
  return APIResponse.ok({ data, rowCount: count })
})
