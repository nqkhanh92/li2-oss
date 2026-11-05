import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/infrastructure/cache/redis', () => ({ redis: {} }))
vi.mock('@/shared/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/shared/lib/permission/permissions', () => ({ getUserOrgPermissions: vi.fn() }))
const logError = vi.fn()
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ error: (...a: any[]) => logError(...a), warn: vi.fn(), info: vi.fn() }) },
}))

import { NextRequest } from 'next/server'
import {
  ArtifactGateService,
  ArtifactGateUnavailableError,
  hasArtifactGoogleClient,
} from '@/core/services/artifact-gate.service'
import { signViewerSession, verifyViewerSession } from '@/core/helpers/artifact-viewer-session'
import type { ArtifactServeTarget } from '@/core/services/artifact-serve.service'

const TOKEN = 'abcdef0123456789'

const target = (access: Record<string, unknown> = {}): ArtifactServeTarget =>
  ({
    id: 'artifact-1',
    serveToken: TOKEN,
    kind: 'html',
    storagePath: 'org/a.html',
    contentType: 'text/html',
    name: 'Landing',
    sizeBytes: 1,
    access: {
      mode: 'public',
      passwordHash: null,
      accessVersion: 1,
      organizationId: 'org-1',
      touchPointId: 'tp-1',
      ...access,
    },
  }) as ArtifactServeTarget

const request = (over: { cookie?: string; url?: string } = {}) =>
  new NextRequest(over.url ?? `https://app.li2.ai/a/${TOKEN}`, {
    headers: over.cookie ? { cookie: over.cookie } : {},
  })

/**
 * Redis giả: `multi()` trả chain ghi lại các lệnh; `exec()` trả `[err, value][]` theo thứ tự lệnh.
 * `fail` làm mọi lệnh ném; `hang` làm `exec` không bao giờ trả — để đo deadline 250 ms.
 */
const fakeRedis = () => {
  const state = {
    values: {} as Record<string, number>,
    ttls: {} as Record<string, number>,
    fail: false,
    hang: false,
    expireCalls: [] as [string, number][],
    delCalls: [] as string[],
  }
  const exec = async (ops: [string, string][]) => {
    if (state.fail) throw new Error('ECONNREFUSED')
    if (state.hang) return new Promise<never>(() => {})
    return ops.map(([op, key]) => {
      if (op === 'get') return [null, state.values[key] == null ? null : String(state.values[key])]
      if (op === 'ttl') return [null, state.values[key] == null ? -2 : (state.ttls[key] ?? -1)]
      if (op === 'incr') return [null, (state.values[key] = (state.values[key] ?? 0) + 1)]
      throw new Error(op)
    })
  }
  const redis = {
    multi: () => {
      const ops: [string, string][] = []
      const chain: any = {
        get: (k: string) => (ops.push(['get', k]), chain),
        ttl: (k: string) => (ops.push(['ttl', k]), chain),
        incr: (k: string) => (ops.push(['incr', k]), chain),
        exec: () => exec(ops),
      }
      return chain
    },
    expire: async (k: string, s: number) => {
      if (state.fail) throw new Error('ECONNREFUSED')
      state.expireCalls.push([k, s])
      state.ttls[k] = s
      return 1
    },
    del: async (k: string) => {
      if (state.fail) throw new Error('ECONNREFUSED')
      state.delCalls.push(k)
      delete state.values[k]
      return 1
    },
    get: vi.fn(),
    ttl: vi.fn(),
  }
  return { redis, state }
}

let fake: ReturnType<typeof fakeRedis>
let deps: {
  redis: any
  getSession: ReturnType<typeof vi.fn>
  getUserOrgPermissions: ReturnType<typeof vi.fn>
  verifyViewerSession: typeof verifyViewerSession
  hasViewerSecret: ReturnType<typeof vi.fn>
  hasGoogleClient: ReturnType<typeof vi.fn>
  viewRepo: { recordGoogleViewer: ReturnType<typeof vi.fn> }
}
let service: ArtifactGateService
const KEY = `artifact:gate:fail:${TOKEN}`

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ARTIFACT_VIEWER_SECRET = 's'.repeat(64)
  fake = fakeRedis()
  deps = {
    redis: fake.redis,
    getSession: vi.fn(async () => null),
    getUserOrgPermissions: vi.fn(async () => undefined),
    verifyViewerSession,
    hasViewerSecret: vi.fn(() => true),
    hasGoogleClient: vi.fn(() => true),
    viewRepo: { recordGoogleViewer: vi.fn(async () => undefined) },
  }
  service = new ArtifactGateService(deps as any)
})

/** [P2] R9 bước 3 — ghi thất bại thì người quét vẫn được phục vụ. */
describe('recordGoogleViewer', () => {
  it('chuyển artifact/org/touch point/email cho repo', async () => {
    await service.recordGoogleViewer(target({ mode: 'google' }), 'Khach@Example.com')
    expect(deps.viewRepo.recordGoogleViewer).toHaveBeenCalledWith({
      artifactId: 'artifact-1',
      organizationId: 'org-1',
      touchPointId: 'tp-1',
      email: 'Khach@Example.com',
    })
  })

  it('⭐ repo ném → nuốt + log ERROR không chứa email, không ném ra route', async () => {
    deps.viewRepo.recordGoogleViewer.mockRejectedValue(new Error('unique?'))
    await expect(service.recordGoogleViewer(target({ mode: 'google' }), 'bi-mat@x.vn')).resolves.toBeUndefined()
    expect(logError).toHaveBeenCalled()
    expect(JSON.stringify(logError.mock.calls)).not.toContain('bi-mat@x.vn')
  })
})

describe('evaluateGate — thứ tự: public → cookie → theo chế độ', () => {
  it('public → allow mà không đọc cookie, session hay Redis', async () => {
    expect(await service.evaluateGate(request(), target())).toEqual({ kind: 'allow' })
    expect(deps.getSession).not.toHaveBeenCalled()
    expect(deps.hasViewerSecret).not.toHaveBeenCalled()
  })

  it('⭐ cookie hợp lệ (tok+m+v khớp) → allow ở cả password lẫn google, không hỏi Redis', async () => {
    for (const mode of ['password', 'google'] as const) {
      const cookie = await signViewerSession({ token: TOKEN, mode, accessVersion: 3 })
      const verdict = await service.evaluateGate(
        request({ cookie: `artifact_viewer=${cookie}` }),
        target({ mode, accessVersion: 3, passwordHash: mode === 'password' ? 'h' : null })
      )
      expect(verdict).toEqual({ kind: 'allow' })
    }
  })

  it('⭐ secret thiếu → unavailable cho password/google, nhưng private vẫn chạy', async () => {
    deps.hasViewerSecret.mockReturnValue(false)
    expect(await service.evaluateGate(request(), target({ mode: 'password', passwordHash: 'h' }))).toEqual({
      kind: 'unavailable',
    })
    expect(await service.evaluateGate(request(), target({ mode: 'google' }))).toEqual({ kind: 'unavailable' })
    expect(await service.evaluateGate(request(), target({ mode: 'private' }))).toEqual({ kind: 'private-login' })
    expect(logError).toHaveBeenCalled()
  })

  describe('password', () => {
    const pw = () => target({ mode: 'password', passwordHash: 'h', accessVersion: 2 })

    it('không cookie → password-required hint none', async () => {
      expect(await service.evaluateGate(request(), pw())).toEqual({ kind: 'password-required', hint: 'none' })
    })

    it('⭐ A10: cookie đúng chữ ký nhưng v lệch → hint changed', async () => {
      const cookie = await signViewerSession({ token: TOKEN, mode: 'password', accessVersion: 1 })
      expect(await service.evaluateGate(request({ cookie: `artifact_viewer=${cookie}` }), pw())).toEqual({
        kind: 'password-required',
        hint: 'changed',
      })
    })

    it('⭐ A11: cookie của chế độ khác (m lệch) → hint none, im lặng', async () => {
      const cookie = await signViewerSession({ token: TOKEN, mode: 'google', accessVersion: 2 })
      expect(await service.evaluateGate(request({ cookie: `artifact_viewer=${cookie}` }), pw())).toEqual({
        kind: 'password-required',
        hint: 'none',
      })
    })

    it('cookie của token khác → hint none', async () => {
      const cookie = await signViewerSession({ token: 'fedcba9876543210', mode: 'password', accessVersion: 2 })
      expect(await service.evaluateGate(request({ cookie: `artifact_viewer=${cookie}` }), pw())).toEqual({
        kind: 'password-required',
        hint: 'none',
      })
    })

    it('⭐ A6: đang khoá (≥3 sai) → locked với TTL còn lại', async () => {
      fake.state.values[KEY] = 3
      fake.state.ttls[KEY] = 421
      expect(await service.evaluateGate(request(), pw())).toEqual({ kind: 'locked', retryAfterSeconds: 421 })
    })

    it('2 lần sai → chưa khoá', async () => {
      fake.state.values[KEY] = 2
      expect(await service.evaluateGate(request(), pw())).toEqual({ kind: 'password-required', hint: 'none' })
    })

    it('⭐ Redis lỗi trên GET → vẫn hiện form (không có gì để kiểm), log ERROR', async () => {
      fake.state.fail = true
      expect(await service.evaluateGate(request(), pw())).toEqual({ kind: 'password-required', hint: 'none' })
      expect(logError).toHaveBeenCalled()
    })
  })

  describe('private', () => {
    const pv = () => target({ mode: 'private' })

    it('không session Casdoor → private-login, không hỏi quyền', async () => {
      expect(await service.evaluateGate(request(), pv())).toEqual({ kind: 'private-login' })
      expect(deps.getUserOrgPermissions).not.toHaveBeenCalled()
    })

    it('⭐ A13: thành viên org → allow; quyền được hỏi với org CHỦ artifact', async () => {
      deps.getSession.mockResolvedValue({ sub: 'u1', id: 'u1', email: 'a@b.c', exp: 0 })
      deps.getUserOrgPermissions.mockResolvedValue([{ key: 'x' }])
      expect(await service.evaluateGate(request(), pv())).toEqual({ kind: 'allow' })
      expect(deps.getUserOrgPermissions).toHaveBeenCalledWith('org-1')
    })

    it('⭐ A13: đã đăng nhập, không thuộc org → private-denied kèm email', async () => {
      deps.getSession.mockResolvedValue({ sub: 'u1', id: 'u1', email: 'ngoai@org.khac', exp: 0 })
      expect(await service.evaluateGate(request(), pv())).toEqual({ kind: 'private-denied', email: 'ngoai@org.khac' })
    })

    it('session không email → email null', async () => {
      deps.getSession.mockResolvedValue({ sub: 'u1', id: 'u1', exp: 0 })
      expect(await service.evaluateGate(request(), pv())).toEqual({ kind: 'private-denied', email: null })
    })

    it('getSession nhận đúng request (đọc cookie casdoor_access_token từ request, không từ cookies())', async () => {
      const req = request({ cookie: 'casdoor_access_token=t' })
      await service.evaluateGate(req, pv())
      expect(deps.getSession).toHaveBeenCalledWith(req)
    })

    it('private không cần ARTIFACT_VIEWER_SECRET', async () => {
      deps.hasViewerSecret.mockReturnValue(false)
      deps.getSession.mockResolvedValue({ sub: 'u1', id: 'u1', email: 'a@b.c', exp: 0 })
      deps.getUserOrgPermissions.mockResolvedValue([])
      expect(await service.evaluateGate(request(), pv())).toEqual({ kind: 'allow' })
    })
  })

  describe('[P2] google', () => {
    const gg = () => target({ mode: 'google', accessVersion: 5 })

    it('không cookie → google-required hint none', async () => {
      expect(await service.evaluateGate(request(), gg())).toEqual({ kind: 'google-required', hint: 'none' })
    })

    it.each([
      ['cancelled', 'cancelled'],
      ['failed', 'failed'],
      ['other', 'none'],
      ['', 'none'],
    ])('?g=%s → hint %s', async (g, hint) => {
      const url = `https://app.li2.ai/a/${TOKEN}?g=${g}`
      expect(await service.evaluateGate(request({ url }), gg())).toEqual({ kind: 'google-required', hint })
    })

    it('⭐ §9: env Google chưa đặt → unavailable, không hiện nút Google', async () => {
      deps.hasGoogleClient.mockReturnValue(false)
      expect(await service.evaluateGate(request(), gg())).toEqual({ kind: 'unavailable' })
    })
  })
})

describe('readLock / recordFailure / clearFailures — bộ đếm theo token', () => {
  it('readLock: chưa có key → không khoá', async () => {
    expect(await service.readLock(TOKEN)).toEqual({ locked: false, count: 0, retryAfterSeconds: 0 })
  })

  it('⭐ A6: sai lần 1 → count 1, EXPIRE 600 đúng một lần; lần 2 không EXPIRE lại (cửa sổ cố định)', async () => {
    expect(await service.recordFailure(TOKEN)).toEqual({ locked: false, count: 1, retryAfterSeconds: 0 })
    expect(fake.state.expireCalls).toEqual([[KEY, 600]])
    fake.state.ttls[KEY] = 590
    expect(await service.recordFailure(TOKEN)).toEqual({ locked: false, count: 2, retryAfterSeconds: 0 })
    expect(fake.state.expireCalls).toHaveLength(1)
  })

  it('⭐ A6: lần 3 → locked, retryAfter = TTL còn lại (≤ 600)', async () => {
    fake.state.values[KEY] = 2
    fake.state.ttls[KEY] = 500
    const lock = await service.recordFailure(TOKEN)
    expect(lock).toEqual({ locked: true, count: 3, retryAfterSeconds: 500 })
  })

  it('key không có TTL (EXPIRE rơi) → tự chữa: EXPIRE lại', async () => {
    fake.state.values[KEY] = 1
    fake.state.ttls[KEY] = -1
    await service.recordFailure(TOKEN)
    expect(fake.state.expireCalls).toEqual([[KEY, 600]])
  })

  it('đang khoá mà TTL -1 → retryAfter = 600, không bao giờ 0', async () => {
    fake.state.values[KEY] = 5
    fake.state.ttls[KEY] = -1
    expect(await service.readLock(TOKEN)).toEqual({ locked: true, count: 5, retryAfterSeconds: 600 })
  })

  it('⭐ A19: Redis ném → ArtifactGateUnavailableError từ readLock và recordFailure', async () => {
    fake.state.fail = true
    await expect(service.readLock(TOKEN)).rejects.toBeInstanceOf(ArtifactGateUnavailableError)
    await expect(service.recordFailure(TOKEN)).rejects.toBeInstanceOf(ArtifactGateUnavailableError)
  })

  it('⭐ Redis treo quá 250 ms → ArtifactGateUnavailableError, không đợi mãi', async () => {
    vi.useFakeTimers()
    try {
      fake.state.hang = true
      const pending = service.readLock(TOKEN)
      const assertion = expect(pending).rejects.toBeInstanceOf(ArtifactGateUnavailableError)
      await vi.advanceTimersByTimeAsync(260)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('clearFailures: DEL đúng key; Redis lỗi → nuốt + log, không ném', async () => {
    fake.state.values[KEY] = 2
    await service.clearFailures(TOKEN)
    expect(fake.state.delCalls).toEqual([KEY])
    fake.state.fail = true
    await expect(service.clearFailures(TOKEN)).resolves.toBeUndefined()
    expect(logError).toHaveBeenCalled()
  })

  it('key đúng tên artifact:gate:fail:<token>', () => {
    expect(KEY).toBe(`artifact:gate:fail:${TOKEN}`)
  })
})

describe('hasArtifactGoogleClient', () => {
  it('cần CẢ HAI env', () => {
    delete process.env.ARTIFACT_GOOGLE_CLIENT_ID
    delete process.env.ARTIFACT_GOOGLE_CLIENT_SECRET
    expect(hasArtifactGoogleClient()).toBe(false)
    process.env.ARTIFACT_GOOGLE_CLIENT_ID = 'id'
    expect(hasArtifactGoogleClient()).toBe(false)
    process.env.ARTIFACT_GOOGLE_CLIENT_SECRET = 'secret'
    expect(hasArtifactGoogleClient()).toBe(true)
    delete process.env.ARTIFACT_GOOGLE_CLIENT_ID
    delete process.env.ARTIFACT_GOOGLE_CLIENT_SECRET
  })
})
