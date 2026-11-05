import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)
  const result = await analyticsSettingsService.regenerateKey(org_id)

  return APIResponse.ok({
    data: {
      publishable_key: result.publishable_key,
      publishable_key_created_at: result.publishable_key_created_at,
    },
    i18nMessage: {
      key: 'analytics_settings:messages.key_regenerated',
      defaultMessage: 'Publishable key regenerated successfully',
    },
  })
})
