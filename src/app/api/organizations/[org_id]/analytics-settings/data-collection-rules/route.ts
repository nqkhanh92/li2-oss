import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { z } from 'zod'

const updateDataCollectionRulesSchema = z.object({
  data_collection_rules: z.object({
    mode: z.enum(['exclude', 'include']).default('exclude'),
    exclude_paths: z.array(z.string()),
    include_paths: z.array(z.string()),
  }),
})

export const PUT = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)
  const body = await req.json()
  const { data_collection_rules } = updateDataCollectionRulesSchema.parse(body)

  const settings = await analyticsSettingsService.updateDataCollectionRules(org_id, data_collection_rules)

  return APIResponse.updated({
    data: settings,
    i18nMessage: {
      key: 'setting:analytics_settings.data_collection_rules.saved',
      defaultMessage: 'Data collection rules updated successfully',
    },
  })
})
