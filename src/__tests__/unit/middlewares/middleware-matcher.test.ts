import { describe, it, expect, vi } from 'vitest'

vi.mock('@/shared/lib/casdoor/middleware', () => ({ casdoor_middleware: vi.fn() }))

import { config } from '@/middleware'

const matcher = new RegExp(`^${config.matcher[0]}$`)

describe('middleware matcher', () => {
  it('skips artifact serving — /a/* must be anonymous', () => {
    expect(matcher.test('/a/abcdef0123456789')).toBe(false)
    expect(matcher.test('/a/anything/at/all')).toBe(false)
  })

  it('still guards every app route', () => {
    for (const path of ['/analytics', '/org/x', '/org/x/touch-points', '/auth/login', '/artifacts']) {
      expect(matcher.test(path)).toBe(true)
    }
  })

  it('keeps the exclusions it already had', () => {
    expect(matcher.test('/api/organizations/x/artifacts')).toBe(false)
    expect(matcher.test('/_next/static/chunk.js')).toBe(false)
    expect(matcher.test('/favicon.ico')).toBe(false)
  })
})

describe('the legal pages stay matched by the middleware (P0.5)', () => {
  it('⭐ lets /privacy and /terms through to the publicPath check', () => {
    // `op_policy_uri` and `op_tos_uri` in `.well-known/oauth-authorization-server` point at these
    // two URLs and a connector directory fetches them anonymously. They are matched here and then
    // allowed by `publicPath` in `shared/lib/casdoor/middleware.ts` — see `public-paths.test.ts`.
    expect(matcher.test('/privacy')).toBe(true)
    expect(matcher.test('/terms')).toBe(true)
  })
})
