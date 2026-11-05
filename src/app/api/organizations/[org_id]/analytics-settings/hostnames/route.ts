import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)
  const body = await req.json()
  const { hostname } = body

  if (!hostname || typeof hostname !== 'string') {
    throw new BadRequestError('Hostname is required')
  }

  await analyticsSettingsService.addHostname(org_id, hostname)

  return APIResponse.created({
    data: { hostname },
    i18nMessage: {
      key: 'analytics_settings:messages.hostname_added',
      defaultMessage: 'Hostname added successfully',
    },
  })
})
