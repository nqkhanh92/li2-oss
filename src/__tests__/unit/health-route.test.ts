/**
 * `/api/health` — the only way to ask a running container which build it is without a shell on the
 * box, which is exactly what it is for after a deploy to LiHi or prod (P0.6). `status` was already
 * pinned by nothing at all; both fields are asserted here because a probe that answers `{status:
 * 'ok'}` with the version silently dropped looks healthy while proving nothing about the deploy.
 */
import { describe, it, expect } from 'vitest'

import { GET } from '@/app/api/health/route'
import { APP_VERSION } from '@/core/constants/app-version'

describe('GET /api/health', () => {
  it('answers ok with the deployed app version', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok', version: APP_VERSION })
  })

  it('reads the version from package.json rather than a constant typed here', async () => {
    const { version } = (await import('../../../package.json')) as { version: string }

    expect(APP_VERSION).toBe(version)
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})
