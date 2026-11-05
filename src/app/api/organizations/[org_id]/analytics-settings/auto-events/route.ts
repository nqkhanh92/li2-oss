import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { z } from 'zod'

const autoEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  trigger: z.object({
    id: z.string(),
    type: z.enum(['click', 'pageview', 'form_submit']),
    conditions: z.array(
      z.object({
        id: z.string(),
        type: z.enum(['page_path', 'page_title', 'element_text', 'element_id', 'element_class', 'css_selector']),
        operator: z.enum(['contains', 'equals', 'starts_with', 'ends_with', 'matches_regex']),
        value: z.string(),
      })
    ),
  }),
  action: z.object({
    id: z.string(),
    type: z.enum(['lead', 'sale']),
    customData: z.record(z.string()),
  }),
})

const updateAutoEventsSchema = z.object({
  auto_events: z.array(autoEventSchema),
})

export const PUT = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)
  const body = await req.json()
  const { auto_events } = updateAutoEventsSchema.parse(body)

  const settings = await analyticsSettingsService.updateAutoEvents(org_id, auto_events)

  return APIResponse.ok({
    data: settings,
  })
})
