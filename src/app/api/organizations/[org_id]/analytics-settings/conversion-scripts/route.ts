import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { z } from 'zod'

const customScriptSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().default(''),
  script: z.string().min(1),
  site_url: z.string().max(500).optional().default(''),
})

const updateCustomScriptsSchema = z.object({
  custom_scripts: z.array(customScriptSchema),
})

export const GET = withAuth<{ org_id: string }>(async (_req, { params: { org_id } }) => {
  await ensureOrgMember(org_id)
  const settings = await analyticsSettingsService.getSettings(org_id)
  return APIResponse.ok({ data: settings.custom_scripts ?? [] })
})

export const PUT = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensureOrgMember(org_id)
  const body = await req.json()
  const { custom_scripts } = updateCustomScriptsSchema.parse(body)

  const settings = await analyticsSettingsService.updateCustomScripts(org_id, custom_scripts)

  return APIResponse.updated({
    data: settings.custom_scripts ?? [],
    i18nMessage: {
      key: 'setting:analytics_settings.custom_scripts.saved',
      defaultMessage: 'Conversion scripts saved successfully',
    },
  })
})
