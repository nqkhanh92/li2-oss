import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { TrackingSettings } from '@/core/types/analytics-settings.type'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const GET = withAuth<{ org_id: string }>(async (_req, { params: { org_id } }) => {
  await ensureOrgMember(org_id)
  const [settings, debugActive] = await Promise.all([
    analyticsSettingsService.getSettings(org_id),
    redis.exists(REDIS_KEYS.SDK_DEBUG.ACTIVE(org_id)),
  ])

  return APIResponse.ok({
    data: { ...settings, debug_mode_enabled: debugActive > 0 },
  })
})

export const PATCH = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)

  const body = await req.json()
  const { features, outbound_domains, tracking } = body

  if (
    !features ||
    typeof features !== 'object' ||
    !Array.isArray(outbound_domains) ||
    !tracking ||
    typeof tracking !== 'object'
  ) {
    throw new BadRequestError()
  }

  const sanitizedTracking: TrackingSettings = {
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

  const sanitizedDomains = (outbound_domains as unknown[])
    .filter((d): d is string => typeof d === 'string' && d.trim() !== '')
    .map((d) => d.trim())

  const settings = await analyticsSettingsService.updateOnboardingSettings(org_id, {
    features: { ...features, visibility_tracking: true },
    outbound_domains: sanitizedDomains,
    tracking: sanitizedTracking,
  })

  return APIResponse.updated({ data: settings })
})
