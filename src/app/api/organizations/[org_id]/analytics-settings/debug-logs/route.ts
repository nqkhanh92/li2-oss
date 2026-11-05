import { debugLogsService } from '@/core/services/debug-logs.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensureOrgMember(org_id)
  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const request_type = searchParams.get('request_type') || undefined
  const client_type = searchParams.get('client_type') || undefined
  const start_date = searchParams.get('start_date') || undefined
  const end_date = searchParams.get('end_date') || undefined

  const result = await debugLogsService.getDebugLogs(org_id, {
    page,
    limit,
    request_type,
    client_type,
    start_date,
    end_date,
  })

  return APIResponse.ok(result)
})

export const DELETE = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)
  const deletedCount = await debugLogsService.clearDebugLogs(org_id)

  return APIResponse.ok({
    data: { deleted_count: deletedCount },
    i18nMessage: {
      key: 'analytics_settings:messages.debug_logs_cleared',
      defaultMessage: `${deletedCount} debug log(s) cleared`,
    },
  })
})
