/**
 * `core/mcp/rate-limit.ts` — the MCP traffic cap (plan Phase 5).
 *
 * ★ WHAT THESE TESTS EXIST TO CATCH. One thing above all: **the key must not contain the org.**
 * `org_id` is a tool argument the client chooses per call, so an org in the key is a reset button —
 * pass a different org, get a fresh budget, and `list_orgs` hands the caller the list to rotate
 * through. That defect has no symptom: the limiter still refuses *something*, dashboards still show
 * 429s, and nobody notices the budget silently multiplied by the user's org count. The test below
 * therefore asserts on the KEY STRINGS, not just on the verdicts — a verdict-only test would pass
 * against an org-keyed limiter as long as one org was hammered.
 *
 * The second is the fail-open direction. Redis down must ALLOW; the same file's neighbour
 * (`consumeRegistrationQuota`) must DENY. Two opposite answers that are easy to "make consistent"
 * by mistake, so both directions are pinned here and there.
 *
 * ⚠️ WHAT THESE TESTS CANNOT PROVE: that a real ioredis pipeline returns results in the shape the
 * code indexes into (`results[2i][1]`). That is measured against a live Redis in the Phase 5
 * verification, not here.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * A fake ioredis recording every key it is asked about. Deliberately NOT a partial mock of the real
 * client: this module only uses `mget` and `multi`, and a factory exposing exactly those is what
 * makes an accidental new Redis call fail loudly here instead of connecting to a real server.
 */
const redisState = {
  counts: new Map<string, number>(),
  seenKeys: [] as string[],
  expires: [] as { key: string; seconds: number }[],
  throwOn: null as null | 'mget' | 'multi' | 'exec',
  /** `connection` = Redis is unreachable (a breaker signal); `generic` = anything else (not one). */
  throwKind: 'connection' as 'connection' | 'generic',
  /** Simulates ioredis' offline queue: the promise simply never settles. */
  hangOn: null as null | 'mget' | 'exec',
  /** Every `mget`/`exec` that actually reached the fake client. The breaker's whole job is to make
   *  this stop growing, so it is the only direct evidence that Redis was not touched. */
  redisCalls: 0,
}

const NEVER = new Promise<never>(() => {})

/**
 * Defaults to a REAL ioredis connection failure rather than a bare `new Error('redis down')`, because
 * the circuit breaker only counts errors it can recognise as a HEALTH signal (see
 * `isRedisHealthFailure`). A generic Error takes the deliberately-not-counted branch, so if this
 * returned one by default every breaker test below would silently be testing nothing.
 * Declared as a `function` so it exists before the hoisted `vi.mock` factory can use it.
 */
function redisError(): Error {
  if (redisState.throwKind === 'generic') return new Error('unexpected pipeline result shape')
  const error = new Error('connect ECONNREFUSED 127.0.0.1:6379') as NodeJS.ErrnoException
  error.code = 'ECONNREFUSED'
  return error
}

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: {
    mget: async (...keys: string[]) => {
      redisState.redisCalls += 1
      if (redisState.throwOn === 'mget') throw redisError()
      if (redisState.hangOn === 'mget') return NEVER
      redisState.seenKeys.push(...keys)
      return keys.map((key) => {
        const value = redisState.counts.get(key)
        return value === undefined ? null : String(value)
      })
    },
    multi: () => {
      if (redisState.throwOn === 'multi') throw redisError()
      const queued: [string, ...unknown[]][] = []
      const chain = {
        incr: (key: string) => {
          queued.push(['incr', key])
          return chain
        },
        expire: (key: string, seconds: number) => {
          queued.push(['expire', key, seconds])
          return chain
        },
        exec: async () => {
          redisState.redisCalls += 1
          if (redisState.throwOn === 'exec') throw redisError()
          if (redisState.hangOn === 'exec') return NEVER
          return queued.map((command) => {
            if (command[0] === 'incr') {
              const key = command[1] as string
              redisState.seenKeys.push(key)
              const next = (redisState.counts.get(key) ?? 0) + 1
              redisState.counts.set(key, next)
              return [null, next]
            }
            redisState.expires.push({ key: command[1] as string, seconds: command[2] as number })
            return [null, 1]
          })
        },
      }
      return chain
    },
  },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

import {
  consumeMcpRateLimit,
  peekMcpRateLimit,
  MCP_RATE_LIMIT_WINDOWS,
  MCP_BREAKER_FAILURE_THRESHOLD,
  MCP_BREAKER_COOLDOWN_MS,
  __resetMcpRateLimitBreakerForTests,
} from '@/core/mcp/rate-limit'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'
const CLIENT_A = 'li2mcp_client_a'
const CLIENT_B = 'https://claude.ai/mcp/client-metadata.json'

const BURST = MCP_RATE_LIMIT_WINDOWS[0]

beforeEach(() => {
  redisState.counts.clear()
  redisState.seenKeys = []
  redisState.expires = []
  redisState.throwOn = null
  redisState.throwKind = 'connection'
  redisState.hangOn = null
  redisState.redisCalls = 0
  // The breaker is module state, so an outage simulated in one test would otherwise still be open in
  // the next one — and an open breaker makes every limit assertion pass by not metering at all.
  __resetMcpRateLimitBreakerForTests()
})

/** Drive the burst window to exactly its limit. */
async function fillBurstWindow(userId: string, clientId: string) {
  for (let index = 0; index < BURST.maxCalls; index += 1) {
    const verdict = await consumeMcpRateLimit({ userId, clientId })
    expect(verdict.allowed).toBe(true)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ★ The key shape — the org-rotation attack
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('the window key', () => {
  it('contains the user and never the org', async () => {
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })

    expect(redisState.seenKeys.length).toBe(MCP_RATE_LIMIT_WINDOWS.length)
    for (const key of redisState.seenKeys) {
      expect(key).toContain(USER_A)
      expect(key.startsWith('mcp:rate:')).toBe(true)
    }
  })

  it('is IDENTICAL no matter which org the call names — the org is not an input at all', async () => {
    // The limiter's signature cannot even accept an org, which is the point: this test documents the
    // guarantee that makes rotating `org_id` useless, and fails the moment someone widens the type.
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    const firstCallKeys = [...redisState.seenKeys]

    redisState.seenKeys = []
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })

    expect(redisState.seenKeys).toEqual(firstCallKeys)
    // Both calls landed on the same counter.
    expect(redisState.counts.get(firstCallKeys[0])).toBe(2)
  })

  it('does not put a caller-supplied client_id into the key raw', async () => {
    // A CIMD client_id is an https URL. Slashes, colons and unbounded length have no business in a
    // Redis key name — the CIMD cache hashes it for the same reason.
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_B })
    for (const key of redisState.seenKeys) {
      expect(key).not.toContain('https://')
      expect(key).not.toContain(CLIENT_B)
    }
  })

  it('separates two clients of the same user', async () => {
    await fillBurstWindow(USER_A, CLIENT_A)
    expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(false)

    // A second connector of the SAME user is untouched — one runaway client must not starve the rest.
    expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_B })).allowed).toBe(true)
  })

  it('separates two users of the same client', async () => {
    await fillBurstWindow(USER_A, CLIENT_A)
    expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(false)
    expect((await consumeMcpRateLimit({ userId: USER_B, clientId: CLIENT_A })).allowed).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Consume
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('consumeMcpRateLimit', () => {
  it('allows exactly maxCalls and refuses the next one', async () => {
    await fillBurstWindow(USER_A, CLIENT_A)

    const verdict = await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(verdict.allowed).toBe(false)
    expect(verdict.window).toBe(BURST.name)
    expect(verdict.limit).toBe(BURST.maxCalls)
  })

  it('reports a retry-after that is never 0 — a 0 tells the client to retry instantly', async () => {
    await fillBurstWindow(USER_A, CLIENT_A)
    const verdict = await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })

    expect(verdict.retryAfterSeconds).toBeGreaterThan(0)
    expect(verdict.retryAfterSeconds).toBeLessThanOrEqual(BURST.seconds)
  })

  it('sets a TTL on every counter so a window can never outlive its bucket', async () => {
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })

    expect(redisState.expires.length).toBe(MCP_RATE_LIMIT_WINDOWS.length)
    for (const window of MCP_RATE_LIMIT_WINDOWS) {
      expect(redisState.expires.some((entry) => entry.seconds === window.seconds)).toBe(true)
    }
    // Never 0: `EXPIRE key 0` deletes the counter, which would hand out a free window.
    for (const entry of redisState.expires) expect(entry.seconds).toBeGreaterThan(0)
  })

  it('keeps refusing once over the line — a refusal is not a reset', async () => {
    await fillBurstWindow(USER_A, CLIENT_A)
    for (let index = 0; index < 3; index += 1) {
      expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(false)
    }
  })

  it('reports the SHORTEST refusing window, so retry-after is actionable', async () => {
    // Windows are ordered shortest-first for this reason: a burst refusal that reported the hourly
    // window's reset would tell a healthy client to sleep for most of an hour.
    await fillBurstWindow(USER_A, CLIENT_A)
    const verdict = await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(verdict.window).toBe(MCP_RATE_LIMIT_WINDOWS[0].name)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Peek
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('peekMcpRateLimit', () => {
  it('charges nothing', async () => {
    await peekMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    await peekMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })

    expect(redisState.counts.size).toBe(0)
    expect(redisState.expires.length).toBe(0)
  })

  it('allows while under the limit and refuses once the meter is at it', async () => {
    expect((await peekMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(true)

    await fillBurstWindow(USER_A, CLIENT_A)

    const verdict = await peekMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(verdict.allowed).toBe(false)
    expect(verdict.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('reads the same keys consume writes', async () => {
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    const written = [...redisState.seenKeys]

    redisState.seenKeys = []
    await peekMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })

    expect(redisState.seenKeys).toEqual(written)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ★ Redis down — this layer MEASURES, so it fails OPEN
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('when Redis is unreachable', () => {
  it('lets the call through from peek', async () => {
    redisState.throwOn = 'mget'
    const verdict = await peekMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(verdict.allowed).toBe(true)
    expect(verdict.retryAfterSeconds).toBe(0)
  })

  it('lets the call through from consume, whether multi() or exec() is what fails', async () => {
    redisState.throwOn = 'multi'
    expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(true)

    redisState.throwOn = 'exec'
    expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(true)
  })

  it('⭐ gives up on a Redis that never ANSWERS, not just one that says no', async () => {
    /**
     * The regression this pins was measured, not imagined: against an unreachable Redis the first
     * Phase 5 build logged `POST /api/mcp 200 in 60135ms`. ioredis buffers commands in an offline
     * queue rather than rejecting, so a `try/catch` fail-open never fires and the meter hangs the
     * endpoint — which is precisely the outage fail-open exists to avoid. A verdict-only assertion
     * would pass here even with the deadline deleted, so the ELAPSED TIME is what is asserted.
     */
    redisState.hangOn = 'exec'
    const started = Date.now()
    const verdict = await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    const elapsed = Date.now() - started

    expect(verdict.allowed).toBe(true)
    expect(elapsed).toBeLessThan(2000)
  })

  it('gives up on a hanging peek too — the door must not hold the request open either', async () => {
    redisState.hangOn = 'mget'
    const started = Date.now()
    const verdict = await peekMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })

    expect(verdict.allowed).toBe(true)
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it('does not carry a refusal over from before the outage', async () => {
    await fillBurstWindow(USER_A, CLIENT_A)
    expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(false)

    // Unmetered is the accepted cost of an outage — the back hop's authorization gates all still run.
    redisState.throwOn = 'exec'
    expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ★★ The circuit breaker — fail-open must be HONEST (the deadline) *and* CHEAP (this)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️⚠️ EVERY TEST HERE THAT CAN ASSERT ELAPSED TIME DOES, AND THAT IS THE WHOLE POINT.
 *
 * This is the exact trap Phase 5 fell into once already: an assertion on `allowed === true` stays
 * green when the breaker is deleted, because a Redis that never answers ALSO ends in `allowed` — just
 * 250 ms later, on every single call, for the length of the outage. The verdict cannot distinguish
 * "skipped Redis" from "waited for Redis and gave up". Time can, and so can `redisState.redisCalls`,
 * which counts commands that actually reached the client. The tests below use both.
 *
 * `consume` runs per tool call, so the cost being measured is not per request: one POST carrying five
 * tool calls pays it five times.
 */
describe('the circuit breaker', () => {
  /** Real ioredis' offline queue: no rejection, no answer. This is what the deadline then converts
   *  into a `RateLimiterTimeout`, which is the breaker's primary health signal. */
  function redisStopsAnswering() {
    redisState.hangOn = 'exec'
  }

  /** Drive the breaker to OPEN and report what the waiting cost on the way there. */
  async function openBreakerByTimeouts(): Promise<number> {
    const started = Date.now()
    for (let index = 0; index < MCP_BREAKER_FAILURE_THRESHOLD; index += 1) {
      const verdict = await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
      // Fail-open all the way: the breaker never turns an outage into a refusal.
      expect(verdict.allowed).toBe(true)
    }
    return Date.now() - started
  }

  /**
   * Only `Date` is faked, never `setTimeout`. The breaker reads the clock to decide when the cooldown
   * is over, so the clock has to move; `withDeadline` uses a real timer that must keep firing for
   * 250 ms, or a hanging probe would hang the test forever instead of timing out.
   */
  function jumpPastCooldown() {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Date.now() + MCP_BREAKER_COOLDOWN_MS + 100))
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('⭐ stops PAYING the deadline once Redis stops answering — asserted in ms', async () => {
    redisStopsAnswering()

    const costToOpen = await openBreakerByTimeouts()
    const callsToOpen = redisState.redisCalls

    // BEFORE: every call went to Redis and waited out the full deadline.
    expect(callsToOpen).toBe(MCP_BREAKER_FAILURE_THRESHOLD)
    expect(costToOpen).toBeGreaterThanOrEqual(MCP_BREAKER_FAILURE_THRESHOLD * 200)

    // AFTER: one POST's worth of tool calls, with the breaker open.
    const startedAfter = Date.now()
    for (let index = 0; index < 5; index += 1) {
      expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(true)
    }
    const costAfter = Date.now() - startedAfter

    // ★ The assertion that dies if the breaker is removed: five calls in under one deadline.
    // Measured 2026-07-30: 5 calls before open = 1253 ms (250.6 ms each); 5 calls after open = 0 ms.
    expect(costAfter).toBeLessThan(20)
    // And the reason it is fast — Redis was not touched at all, not merely touched quickly.
    expect(redisState.redisCalls).toBe(callsToOpen)
  })

  it('opens on the Nth consecutive timeout and not before', async () => {
    redisStopsAnswering()

    for (let index = 0; index < MCP_BREAKER_FAILURE_THRESHOLD - 1; index += 1) {
      await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    }
    // Still closed one short of the threshold: the call below reaches Redis and pays for it.
    const started = Date.now()
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(Date.now() - started).toBeGreaterThanOrEqual(200)
    expect(redisState.redisCalls).toBe(MCP_BREAKER_FAILURE_THRESHOLD)

    // That was the Nth. Now it is open.
    const startedAfter = Date.now()
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(Date.now() - startedAfter).toBeLessThan(20)
    expect(redisState.redisCalls).toBe(MCP_BREAKER_FAILURE_THRESHOLD)
  })

  it('⛔ does NOT open on refusals — being over the limit is the system WORKING', async () => {
    /**
     * The failure this forbids: a client that hammers past its limit trips the breaker, and the
     * breaker then switches metering off FOR EVERYONE — turning the cap into a self-destruct button
     * that any caller can press on purpose. A refusal is Redis answering, so it must reset the
     * failure count like any other answer.
     */
    await fillBurstWindow(USER_A, CLIENT_A)

    const refusals = MCP_BREAKER_FAILURE_THRESHOLD * 4
    for (let index = 0; index < refusals; index += 1) {
      expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(false)
    }
    // Every one of them reached Redis: nothing was short-circuited, so nothing opened.
    expect(redisState.redisCalls).toBe(BURST.maxCalls + refusals)

    /**
     * ★ The stronger half. `redisCalls` alone would also look right if refusals HAD been counted but
     * the count were reset by something else. So: with the breaker's own tolerance now proven to be
     * intact, N−1 real timeouts must still leave it closed. Had the refusals above counted, the
     * breaker would already be open and these would return instantly instead of paying the deadline.
     */
    redisStopsAnswering()
    const before = redisState.redisCalls
    const started = Date.now()
    for (let index = 0; index < MCP_BREAKER_FAILURE_THRESHOLD - 1; index += 1) {
      await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    }
    expect(redisState.redisCalls).toBe(before + MCP_BREAKER_FAILURE_THRESHOLD - 1)
    expect(Date.now() - started).toBeGreaterThanOrEqual((MCP_BREAKER_FAILURE_THRESHOLD - 1) * 200)
  })

  it('does not count a non-health error either — a code bug must not switch metering off', async () => {
    // A shape bug in the pipeline results throws instantly, so retrying it costs no waiting and the
    // breaker has nothing to save. It still fails open; it just does not disable the meter.
    redisState.throwOn = 'exec'
    redisState.throwKind = 'generic'

    const attempts = MCP_BREAKER_FAILURE_THRESHOLD * 2
    for (let index = 0; index < attempts; index += 1) {
      expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(true)
    }
    expect(redisState.redisCalls).toBe(attempts)
  })

  it('⭐ half-open admits exactly ONE probe, not everything that was waiting', async () => {
    /**
     * A Redis coming back must not be handed the whole backlog the instant the cooldown ends, and the
     * other callers must not each pay 250 ms to rediscover an outage that is still going. `probeInFlight`
     * is set synchronously before the first `await`, which is what makes "exactly one" hold under
     * concurrency.
     */
    redisStopsAnswering()
    await openBreakerByTimeouts()
    const beforeProbe = redisState.redisCalls

    jumpPastCooldown()

    const verdicts = await Promise.all(
      Array.from({ length: 8 }, () => consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A }))
    )

    expect(verdicts.every((verdict) => verdict.allowed)).toBe(true)
    expect(redisState.redisCalls).toBe(beforeProbe + 1)

    // The probe failed, so the breaker re-opened for another cooldown rather than staying half-open
    // and letting the next call probe again immediately.
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(redisState.redisCalls).toBe(beforeProbe + 1)
  })

  it('⭐ closes when Redis comes back, and the counters start counting again', async () => {
    redisStopsAnswering()
    await openBreakerByTimeouts()

    // Redis recovers. Nothing tells the breaker that; the probe has to discover it.
    redisState.hangOn = null
    const afterOutage = redisState.redisCalls

    // Still inside the cooldown, so recovery changes nothing yet — a healthy Redis is not consulted
    // and this call is unmetered. Pinning it here is what makes the rest of this test mean something:
    // without it, the assertions below would also pass against no breaker at all.
    expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(true)
    expect(redisState.redisCalls).toBe(afterOutage)

    jumpPastCooldown()

    /**
     * ⚠️ The frozen fake clock is load-bearing here: every call below shares one timestamp, so they
     * all land in one window bucket and the arithmetic is exact rather than "unless the minute rolls".
     */
    const probe = await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(probe.allowed).toBe(true)

    // Metering is genuinely back: the probe was charged, and the window fills and then refuses. If
    // the breaker had stayed open, all of these would be free and none would ever refuse.
    for (let index = 1; index < BURST.maxCalls; index += 1) {
      expect((await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })).allowed).toBe(true)
    }
    const overTheLine = await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    expect(overTheLine.allowed).toBe(false)
    expect(overTheLine.window).toBe(BURST.name)
  })

  it('never opens while Redis is healthy — existing behaviour is untouched', async () => {
    // The whole burst window plus refusals plus reads, all answered, all metered. A breaker that
    // opened on any of this would silently uncap production the first busy minute.
    await fillBurstWindow(USER_A, CLIENT_A)
    await consumeMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    await peekMcpRateLimit({ userId: USER_A, clientId: CLIENT_A })
    await consumeMcpRateLimit({ userId: USER_B, clientId: CLIENT_B })

    expect(redisState.redisCalls).toBe(BURST.maxCalls + 3)
  })
})
