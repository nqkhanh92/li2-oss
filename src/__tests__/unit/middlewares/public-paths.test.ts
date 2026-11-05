/**
 * ⭐ P0.5 — the pages that must answer without a session.
 *
 * A separate file from `middleware-matcher.test.ts` because that one MOCKS
 * `@/shared/lib/casdoor/middleware` to keep `@/middleware` importable, and a mocked module has no
 * `publicPath` to assert on. Here the real list is imported.
 */
import { describe, it, expect } from 'vitest'
import { publicPath } from '@/shared/lib/casdoor/middleware'

describe('publicPath', () => {
  it('⭐ contains /privacy, /terms and /support', () => {
    // The first two are published in the OAuth authorization-server metadata as `op_policy_uri` and
    // `op_tos_uri`; `/support` is `supportURL` in `plugin/chatgpt/plugin.json`. Behind a login they
    // answer a redirect to `/auth/login`, and a directory reviewer reads that as a dead URL.
    for (const path of ['/privacy', '/terms', '/support']) {
      expect(publicPath, path).toContain(path)
    }
  })

  it('keeps every entry long enough to be safe as a substring', () => {
    // The list is tested with `request.url.includes(path)` over the WHOLE url, so a short entry
    // marks unrelated authenticated routes public. Nothing shorter than six characters belongs here.
    for (const path of publicPath) {
      expect(path.length, path).toBeGreaterThanOrEqual(6)
    }
  })
})
