/**
 * `/api/internal/scan-health` — the probe that tells an operator whether turning the fail-closed
 * gate on will refuse every upload (spec §6.2, enable order).
 *
 * What is actually worth pinning here is the AUTH, not the JSON: the route reaches a dependency and
 * reports our internal topology, and the two ways a route like this goes wrong are "open when the
 * secret is unset" and "answers before checking". Both are asserted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const ping = vi.fn()
const version = vi.fn()
vi.mock('@/infrastructure/scan/clamav-client', () => ({
  ping: (...args: any[]) => ping(...args),
  version: (...args: any[]) => version(...args),
}))

import { GET } from '@/app/api/internal/scan-health/route'

const SECRET = 'test-internal-secret'
const URL = 'http://localhost:3000/api/internal/scan-health'

const call = (headers: Record<string, string> = {}) => GET(new NextRequest(URL, { headers }))

const ENV_KEYS = [
  'INTERNAL_API_SECRET',
  'CLAMAV_ENABLED',
  'CLAMAV_HOST',
  'CLAMAV_PORT',
  'CLAMAV_TIMEOUT_MS',
] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  ping.mockReset()
  version.mockReset()
  ping.mockResolvedValue(true)
  version.mockResolvedValue('ClamAV 1.4.6/27891/Tue Oct 21')
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('GET /api/internal/scan-health — authentication', () => {
  it('no INTERNAL_API_SECRET configured → 503, and clamd is NOT contacted', async () => {
    const response = await call({ 'x-internal-secret': SECRET })

    // 503 rather than "open": an env file deployed without the secret must not publish our
    // infrastructure state to anyone who finds the path.
    expect(response.status).toBe(503)
    expect(ping).not.toHaveBeenCalled()
  })

  it.each([
    ['no header', {}],
    ['wrong secret of the same length', { 'x-internal-secret': 'x'.repeat(SECRET.length) }],
    ['wrong secret of a different length', { 'x-internal-secret': 'short' }],
  ])('%s → 401 before clamd is contacted', async (_label, headers) => {
    process.env.INTERNAL_API_SECRET = SECRET

    const response = await call(headers as Record<string, string>)

    expect(response.status).toBe(401)
    // The ordering assertion: a route that pings first would let an unauthenticated caller measure
    // our internals through the response time.
    expect(ping).not.toHaveBeenCalled()
  })
})

describe('GET /api/internal/scan-health — what it reports', () => {
  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = SECRET
  })

  it('gate off → enabled false, and nothing is dialled', async () => {
    const response = await call({ 'x-internal-secret': SECRET })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      enabled: false,
      reachable: false,
      version: null,
      latencyMs: null,
    })
    expect(ping).not.toHaveBeenCalled()
  })

  it('gate on and clamd answers → reachable, the engine version, and a latency number', async () => {
    process.env.CLAMAV_ENABLED = 'true'

    const response = await call({ 'x-internal-secret': SECRET })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      enabled: true,
      reachable: true,
      version: 'ClamAV 1.4.6/27891/Tue Oct 21',
    })
    expect(typeof body.latencyMs).toBe('number')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('gate on and clamd silent → reachable false, and VERSION is not attempted', async () => {
    process.env.CLAMAV_ENABLED = 'true'
    ping.mockResolvedValue(false)

    const body = await (await call({ 'x-internal-secret': SECRET })).json()

    expect(body).toMatchObject({ enabled: true, reachable: false, version: null })
    // Paying the timeout twice would double how long an operator waits for a "no" they already have.
    expect(version).not.toHaveBeenCalled()
  })

  it('misconfigured env → 500 whose message names the variable to fix', async () => {
    process.env.CLAMAV_ENABLED = 'true'
    process.env.CLAMAV_HOST = ''

    const response = await call({ 'x-internal-secret': SECRET })

    expect(response.status).toBe(500)
    expect((await response.json()).error).toMatch(/CLAMAV_HOST/)
  })
})
