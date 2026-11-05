import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'

const SDK_DEBUG_TTL_SECONDS = 60

export interface BehaviorDebugStatus {
  pageview: boolean
  click: boolean
  scroll: boolean
  form: boolean
  session_recording: boolean
  site_url: string | null
}

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensureOrgMember(org_id)

  const body = await req.json()
  const { site_url } = body

  if (!site_url || typeof site_url !== 'string') {
    throw new BadRequestError('site_url is required')
  }

  // Refresh the SDK debug active key — li2-backend reads this to enable debug mode
  await redis.set(REDIS_KEYS.SDK_DEBUG.ACTIVE(org_id), site_url, 'EX', SDK_DEBUG_TTL_SECONDS)

  // Read behavior debug results written by li2-backend
  const raw = await redis.hgetall(REDIS_KEYS.BEHAVIOR_DEBUG.RESULT(org_id))

  const status: BehaviorDebugStatus = {
    pageview: raw?.pageview === '1',
    click: raw?.click === '1',
    scroll: raw?.scroll === '1',
    form: raw?.form === '1',
    session_recording: raw?.session_recording === '1',
    site_url: raw?.site_url ?? null,
  }

  return APIResponse.ok({ data: status })
})
