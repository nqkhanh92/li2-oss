import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

// 3 h — manual debug toggle; auto-expires if user forgets to turn it off
const SDK_DEBUG_TOGGLE_TTL_SECONDS = 10800

export const PUT = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)
  const body = await req.json()
  const { debug_mode_enabled, site_url } = body

  if (typeof debug_mode_enabled !== 'boolean') {
    throw new BadRequestError('debug_mode_enabled must be a boolean')
  }

  if (debug_mode_enabled) {
    // site_url is optional — empty string means "match all hostnames" in li2-backend
    const resolvedSiteUrl = typeof site_url === 'string' ? site_url : ''
    await redis.set(REDIS_KEYS.SDK_DEBUG.ACTIVE(org_id), resolvedSiteUrl, 'EX', SDK_DEBUG_TOGGLE_TTL_SECONDS)
  } else {
    await redis.del(REDIS_KEYS.SDK_DEBUG.ACTIVE(org_id))
  }

  return APIResponse.ok({
    data: { debug_mode_enabled },
    i18nMessage: {
      key: 'analytics_settings:messages.debug_mode_updated',
      defaultMessage: debug_mode_enabled ? 'Debug mode enabled' : 'Debug mode disabled',
    },
  })
})
