/**
 * The quota on the outbound fetch `/authorize` can trigger.
 *
 * Why this file exists: `/authorize` is unauthenticated and resolves the client FIRST, so a caller
 * supplying `client_id=https://…` makes this server perform a DNS lookup and an HTTPS request to an
 * address of their choosing. Measured on the dev server 2026-07-31 before the fix: 12 requests, 12
 * outbound attempts, none refused, while `/register` cut off at exactly 5.
 *
 * Every property below is one where the WRONG behaviour is invisible in production. A quota that
 * silently charges cache hits still lets every real client connect — it just starts refusing the
 * heaviest users first, months later. A fail-open path that hangs instead of failing open still
 * returns the right verdict — it just takes the endpoint down with it. So the assertions here are
 * about the TRACE (was Redis touched? was `zadd` called?) and about ELAPSED TIME, never only about
 * the verdict: the verdict is identical on both sides of each of these bugs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FakeMcpOAuthRepository } from '@/__tests__/__mocks__/mcp-oauth-repo.mock'

const { redisState, calls } = vi.hoisted(() => ({
  redisState: {
    /** What `get` answers: `null` = cache miss, a JSON string = hit, 'hang' = never settles. */
    cached: null as string | null | 'hang',
    /** The zcard reading, i.e. the count BEFORE this request. */
    countInWindow: 0,
    /** When true, `multi().exec()` never settles — a partitioned Redis, not a dead one. */
    hangOnMulti: false,
  },
  calls: { get: 0, multi: 0, zadd: 0 },
}))

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: {
    get: async () => {
      calls.get++
      if (redisState.cached === 'hang') return new Promise(() => {})
      return redisState.cached
    },
    set: async () => 'OK',
    multi: () => {
      calls.multi++
      const chain = {
        zremrangebyscore: () => chain,
        zcard: () => chain,
        zadd: () => {
          calls.zadd++
          return chain
        },
        expire: () => chain,
        exec: async () => {
          if (redisState.hangOnMulti) return new Promise(() => {})
          return [
            [null, 0],
            [null, redisState.countInWindow],
            [null, 1],
            [null, 1],
          ]
        },
      }
      return chain
    },
  },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

import { McpOAuthService, CIMD_FETCH_RATE_LIMIT } from '@/core/services/mcp-oauth.service'

const IP = '198.51.100.7'
const CIMD_CLIENT = 'https://client.example/metadata.json'
const REGISTERED_CLIENT = 'li2mcp_3fdbdf195cc6efeded3e83e6864f0fe2'

let service: McpOAuthService

beforeEach(() => {
  service = new McpOAuthService(new FakeMcpOAuthRepository())
  redisState.cached = null
  redisState.countInWindow = 0
  redisState.hangOnMulti = false
  calls.get = 0
  calls.multi = 0
  calls.zadd = 0
})

describe('what is metered', () => {
  it('does not meter a registered client_id — it never goes outbound', async () => {
    const verdict = await service.consumeCimdFetchQuota(IP, REGISTERED_CLIENT)

    expect(verdict.allowed).toBe(true)
    // The point is not the verdict — an unmetered call and a metered-but-under-limit call both
    // return `allowed`. The point is that Redis was never consulted, because a registered client is
    // a local table lookup and charging it would burn a real user's budget on nothing.
    expect(calls.get).toBe(0)
    expect(calls.multi).toBe(0)
  })

  it('does not meter a missing client_id', async () => {
    const verdict = await service.consumeCimdFetchQuota(IP, null)

    expect(verdict.allowed).toBe(true)
    expect(calls.multi).toBe(0)
  })

  it('does not spend quota when the document is ALREADY CACHED', async () => {
    redisState.cached = JSON.stringify({
      clientId: CIMD_CLIENT,
      clientName: 'Cached',
      redirectUris: ['https://client.example/cb'],
      source: 'cimd',
    })

    const verdict = await service.consumeCimdFetchQuota(IP, CIMD_CLIENT)

    expect(verdict.allowed).toBe(true)
    // ★ THE LOAD-BEARING ASSERTION. A cache hit means `resolveClient` answers from Redis and never
    // goes outbound, so there is nothing to charge. Assert on the WRITE (`zadd`), not on the
    // verdict: if this regressed to charging cache hits, the verdict would still be `allowed` and
    // the only symptom would be real clients exhausting a budget they never spent.
    expect(calls.zadd).toBe(0)
  })

  it('does not spend quota when the client_id is already known BAD', async () => {
    // The negative cache short-circuits `resolveClient` exactly like a positive one does, so it must
    // be free too — otherwise one bad client_id costs its owner the whole window.
    redisState.cached = JSON.stringify({ invalid: true })

    await service.consumeCimdFetchQuota(IP, CIMD_CLIENT)

    expect(calls.zadd).toBe(0)
  })

  it('DOES spend quota on a cache miss — the negative control for the three above', async () => {
    redisState.cached = null

    const verdict = await service.consumeCimdFetchQuota(IP, CIMD_CLIENT)

    expect(verdict.allowed).toBe(true)
    // Without this case the assertions above would pass on a quota that never counted anything.
    expect(calls.zadd).toBe(1)
  })
})

describe('the limit', () => {
  it('refuses once the window is full, and says how long to wait', async () => {
    redisState.countInWindow = CIMD_FETCH_RATE_LIMIT.maxRequests

    const verdict = await service.consumeCimdFetchQuota(IP, CIMD_CLIENT)

    expect(verdict.allowed).toBe(false)
    expect(verdict.retryAfter).toBe(CIMD_FETCH_RATE_LIMIT.windowSeconds)
  })

  it('still allows the last request BELOW the limit', async () => {
    redisState.countInWindow = CIMD_FETCH_RATE_LIMIT.maxRequests - 1

    expect((await service.consumeCimdFetchQuota(IP, CIMD_CLIENT)).allowed).toBe(true)
  })
})

describe('what happens when Redis does not answer', () => {
  /**
   * ⚠️ `try/catch` is NOT fail-open. ioredis buffers commands in an offline queue when the server is
   * unreachable, so the promise never settles — measured elsewhere on this stack as a 60-second
   * request that returned 200. A verdict-only assertion cannot tell a bounded fail-open from an
   * unbounded hang, because BOTH eventually answer `allowed`. So this asserts the clock.
   */
  it('fails OPEN and does so within the deadline, when Redis never answers', async () => {
    redisState.cached = 'hang'
    redisState.hangOnMulti = true

    const startedAt = Date.now()
    const verdict = await service.consumeCimdFetchQuota(IP, CIMD_CLIENT)
    const elapsed = Date.now() - startedAt

    // Fail OPEN: this layer only MEASURES. Failing it closed would mean a Redis outage stops every
    // user connecting any client at all.
    expect(verdict.allowed).toBe(true)
    // ★ And the part a verdict assertion would miss entirely: it must not have WAITED for Redis.
    // Two bounded reads (the cache probe and the window) at 250ms each; anything near ioredis's
    // real timeout means the deadline is gone and the endpoint hangs under a partition.
    expect(elapsed).toBeLessThan(2_000)
    // The lower bound keeps THIS test honest rather than the code: it proves the hang was actually
    // simulated. Without it, a mock that quietly stopped hanging would leave the assertion above
    // passing on an instant answer, and the deadline could be deleted with the suite still green.
    expect(elapsed).toBeGreaterThanOrEqual(250)
  })
})
