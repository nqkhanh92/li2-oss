import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { TrackingSettings } from '@/core/types/analytics-settings.type'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const PUT = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)

  const body = await req.json()
  const { tracking } = body

  if (!tracking || typeof tracking !== 'object') {
    throw new BadRequestError()
  }

  const sanitized: TrackingSettings = {
    cookie_path: typeof tracking.cookie_path === 'string' ? tracking.cookie_path || '/' : '/',
    cookie_domain:
      typeof tracking.cookie_domain === 'string' && tracking.cookie_domain.trim()
        ? tracking.cookie_domain.trim()
        : null,
    session_timeout: Number.isFinite(Number(tracking.session_timeout))
      ? Math.max(60, Number(tracking.session_timeout))
      : 1800,
    cookie_expires_in_days: Number.isFinite(Number(tracking.cookie_expires_in_days))
      ? Math.max(1, Number(tracking.cookie_expires_in_days))
      : 365,
  }

  const settings = await analyticsSettingsService.updateTracking(org_id, sanitized)

  return APIResponse.updated({ data: settings })
})
