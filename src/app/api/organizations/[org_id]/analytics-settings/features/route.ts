import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { AnalyticsFeatures } from '@/core/types/analytics-settings.type'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

const FEATURE_KEYS: (keyof AnalyticsFeatures)[] = [
  'pageview_tracking',
  'click_tracking',
  'scroll_tracking',
  'form_tracking',
  'outbound_tracking',
  'session_recording',
  'visibility_tracking',
]

export const PUT = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)

  const body = await req.json()
  const { features } = body

  if (!features || typeof features !== 'object') {
    throw new BadRequestError()
  }

  const sanitized: AnalyticsFeatures = {} as AnalyticsFeatures
  for (const key of FEATURE_KEYS) {
    sanitized[key] = Boolean(features[key])
  }

  const settings = await analyticsSettingsService.updateFeatures(org_id, sanitized)

  return APIResponse.updated({ data: settings })
})
