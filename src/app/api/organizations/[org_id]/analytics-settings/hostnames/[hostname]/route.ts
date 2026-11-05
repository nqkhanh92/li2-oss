import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const DELETE = withAuth<{ org_id: string; hostname: string }>(
  async (req, { params: { org_id, hostname } }) => {
    await ensurePolicy(org_id, nonScopePolicies.manage_organization)
    await analyticsSettingsService.removeHostname(org_id, decodeURIComponent(hostname))

    return APIResponse.deleted({
      data: { hostname: decodeURIComponent(hostname) },
      i18nMessage: {
        key: 'analytics_settings:messages.hostname_removed',
        defaultMessage: 'Hostname removed successfully',
      },
    })
  }
)
