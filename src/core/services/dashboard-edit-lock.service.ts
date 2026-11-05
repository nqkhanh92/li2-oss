import { redis } from '@/infrastructure/cache/redis'
import { dashboardPermissionService } from './dashboard-permission.service'

interface LockValue {
  user_id: string
  email: string
}

const LOCK_TTL = 60 // seconds
const KEY_PREFIX = 'dashboard:edit-lock:'

export class DashboardEditLockService {
  private key(dashboardId: string) {
    return `${KEY_PREFIX}${dashboardId}`
  }

  async acquire(orgId: string, dashboardId: string, userId: string, email: string) {
    await dashboardPermissionService.ensureEditor(orgId, dashboardId, userId)

    const key = this.key(dashboardId)
    const value = JSON.stringify({ user_id: userId, email } satisfies LockValue)
    const result = await redis.set(key, value, 'EX', LOCK_TTL, 'NX')

    if (result === 'OK') {
      return { acquired: true }
    }

    // Lock held by someone else
    const existing = await redis.get(key)
    if (!existing) {
      // Race: lock expired between SET NX and GET — retry once
      const retry = await redis.set(key, value, 'EX', LOCK_TTL, 'NX')
      if (retry === 'OK') return { acquired: true }
      return { acquired: false, holder: null }
    }

    const holder = JSON.parse(existing) as LockValue
    // If same user (e.g., reopened tab), re-acquire
    if (holder.user_id === userId) {
      await redis.set(key, value, 'EX', LOCK_TTL)
      return { acquired: true }
    }

    return { acquired: false, holder: { email: holder.email } }
  }

  async heartbeat(dashboardId: string, userId: string) {
    const key = this.key(dashboardId)
    // GETEX atomically reads and resets TTL in one round trip (Redis 6.2+)
    const existing = await redis.getex(key, 'EX', LOCK_TTL)
    if (!existing) {
      return { renewed: false, holder: null }
    }

    const holder = JSON.parse(existing) as LockValue
    if (holder.user_id !== userId) {
      // TTL was refreshed for the wrong user — restore original TTL is not needed
      // since the actual owner's next heartbeat will refresh it anyway
      return { renewed: false, holder: { email: holder.email } }
    }

    return { renewed: true }
  }

  async release(dashboardId: string, userId: string) {
    const key = this.key(dashboardId)
    // Atomic check-and-delete via Lua to prevent TOCTOU race
    // (key could expire and be re-acquired between GET and DEL)
    const script = `
      local val = redis.call("GET", KEYS[1])
      if val == false then return 0 end
      local holder = cjson.decode(val)
      if holder.user_id == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      end
      return 0
    `
    await redis.eval(script, 1, key, userId)
    return { released: true }
  }
}

export const dashboardEditLockService =
  process.env.NODE_ENV !== 'production'
    ? new DashboardEditLockService()
    : (globalThis._dashboardEditLockService ??
      (globalThis._dashboardEditLockService = new DashboardEditLockService()))
