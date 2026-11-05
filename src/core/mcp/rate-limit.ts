/**
 * ============================================================================
 * MCP traffic cap — fixed windows on Redis, per (user, client) (plan Phase 5).
 * ============================================================================
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⛔ THIS IS THE ONLY THING IN THE MCP STACK THAT BOUNDS *VOLUME*. EVERYTHING ELSE BOUNDS *RIGHTS*.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * `ensurePolicy`, `ensureOrgMember`, `ensureOrgPlan`, `MAX_TPS_PER_MONTH` — every guard the back hop
 * runs answers "may this user do this at all". None of them answers "how often". `MAX_TPS_PER_MONTH`
 * comes closest and it caps link CREATION only; the five read tools are analytics aggregations with
 * no volume cap anywhere, and `find_li2_docs` reaches a third-party CDN. The caller is a program, not
 * a person: it retries in loops, fans out in parallel, and never gets bored. Without this file, one
 * connector stuck in a retry loop is unbounded load on Postgres, on the analytics RPCs and on
 * docs.li2.ai, from an account that may be on the free plan (`mcp_access` was granted to `t0`).
 *
 * ★ It is NOT a billing meter and must never grow into one. `ai_budget` — li2-ai's spend cap — is
 * deliberately absent from MCP: the customer's own model does the thinking and the customer pays for
 * those tokens (plan §0). What we spend is database and bandwidth, and that is what this counts.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⛔ THE KEY IS (user, client). NOT (org). NOT (org, user).
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * This is a security choice, not a convenience one. `org_id` is a TOOL ARGUMENT (plan §4.1) — the
 * client picks it per call. Key the window by org and a client that wants more budget simply passes a
 * different `org_id`: each org gets its own fresh counter, and a user in five orgs has five times the
 * budget for free. Worse, `list_orgs` hands them the list. The OAuth grant binds to the USER, so the
 * user is the only thing the client cannot rotate; `client_id` joins it so one runaway connector
 * cannot starve the user's other connectors. Phase 5's verification attacks exactly this.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ★ REDIS DOWN → FAIL **OPEN**. AND 4a's AUTH PATH FAILS **CLOSED**. SAME PRINCIPLE, BOTH TIMES.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * `/api/mcp` answers 503 when the database is unreachable during bearer validation, because letting
 * the call through would mean *skipping authentication* — a caller ends up somewhere they were never
 * entitled to be. Here the worst case of letting the call through is that some traffic goes unmetered
 * for as long as Redis is down. Nobody reaches data they lack rights to; every authorization gate on
 * the back hop still runs, untouched. Refusing instead would take a Redis blip and turn it into a
 * total MCP outage for every customer.
 *
 * The rule, stated once so it is not re-litigated per file: **never fail open at a layer that decides
 * AUTHORITY; failing open at a layer that only MEASURES is allowed.** `consumeRegistrationQuota` in
 * `mcp-oauth.service.ts` looks like a counter-example and is not — it guards the one *unauthenticated
 * database write* in the app, so its failure mode is unbounded anonymous rows, i.e. authority.
 *
 * Fail-open is logged at ERROR, not warn: it is a silent loss of a control, and the only way anyone
 * finds out is this line.
 *
 * ⚠️⚠️ AND "FAIL OPEN" NEEDS A DEADLINE, OR IT IS NOT FAIL-OPEN — MEASURED, NOT ASSUMED.
 * A `try/catch` alone covers only the failure mode where Redis says no. The first Phase 5 run against
 * an unreachable Redis produced neither an error nor a refusal: **`POST /api/mcp 200 in 60135ms`**.
 * ioredis buffers commands in an offline queue and keeps retrying the connection, so a promise that
 * "fails open on throw" simply never settles. A process dying gives ECONNREFUSED and lands in the
 * catch; a network partition, a firewall or a hung server gives silence — and silence is the more
 * likely production outage of the two. Sixty seconds of hanging is a worse outage than an unmetered
 * minute; it is the metering layer taking the endpoint down, which is the exact thing fail-open
 * exists to prevent. Hence `withDeadline`. Do not remove it because "the catch already handles it".
 *
 * ★ AND A DEADLINE MAKES FAIL-OPEN HONEST WITHOUT MAKING IT CHEAP — HENCE THE CIRCUIT BREAKER.
 * `withDeadline` bounds ONE call. It does not stop the bill from repeating: with Redis down, every
 * call still pays the full 250 ms, and `consume` runs PER TOOL CALL, so one POST carrying five calls
 * pays ~1.5 s of pure waiting — for the entire duration of the outage, on traffic that is going
 * through unmetered anyway. The breaker below turns that per-call tax into one probe every few
 * seconds. Deadline stops the endpoint hanging; breaker stops the endpoint limping.
 */
import { createHash } from 'crypto'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'mcp-rate-limit' })

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The limits
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export interface McpRateLimitWindow {
  /** Appears in the Redis key and in the log line; never sent to a client. */
  name: string
  seconds: number
  maxCalls: number
}

/**
 * TWO windows, because one cannot express the shape of the traffic we are bounding.
 *
 * A single per-minute window is what an agent's *burst* needs — a client answering one user question
 * may fire several tool calls at once — but 60/min sustained is 86,400 calls a day, which is exactly
 * the machine-rate load this file exists to stop. A single per-hour window solves that and makes a
 * normal burst fail. So: the minute window shapes the burst, the hour window bounds the day.
 *
 * The numbers, and why they are where they are:
 *
 * - **60/minute.** A heavy human-paced session is a few calls per user turn; a user typing quickly
 *   might drive 20–30 calls a minute through a client that parallelises. 60 is roughly double the
 *   worst legitimate case, and it caps a runaway loop at one call per second — slow enough that the
 *   loop is harmless, fast enough that no real session ever meets it.
 * - **1,000/hour.** ~17/minute sustained. A connector that keeps hitting the minute cap and retrying
 *   would otherwise still manage 3,600 calls an hour forever; this is the line that stops that. It
 *   also allows an unusually intensive session (a bulk analytics sweep across several orgs) to run
 *   for a solid hour before it is throttled.
 *
 * These are deliberately GENEROUS. v1 has no per-plan tiering and no dashboard to explain a refusal,
 * so the cost of being too tight is a confused customer with no way to diagnose it, while the cost of
 * being too loose is bounded load we can see in the logs and tighten later. Tighten from evidence.
 *
 * ⚠️ Both windows are checked on EVERY call, and the FIRST one that refuses decides `retryAfter`.
 * Order them shortest-first so a burst refusal reports "wait 30 seconds" rather than "wait 50
 * minutes" — a client obeying `retry-after` on the wrong window is a client that gives up.
 */
export const MCP_RATE_LIMIT_WINDOWS: readonly McpRateLimitWindow[] = [
  { name: 'burst', seconds: 60, maxCalls: 60 },
  { name: 'sustained', seconds: 3600, maxCalls: 1000 },
]

/** Everything the limiter is allowed to key on. There is no `orgId` field ON PURPOSE — see the
 *  header. A future edit that adds one is the bug this type is shaped to prevent. */
export interface McpRateLimitIdentity {
  userId: string
  clientId: string
}

export interface McpRateLimitVerdict {
  allowed: boolean
  /** Seconds until the refusing window rolls over. `0` when allowed. Sent to the client verbatim as
   *  `retry-after`, so it must never be 0 on a refusal — a client would retry immediately. */
  retryAfterSeconds: number
  /** Which window refused, and its limit — for OUR log line only. Publishing the limits would invite
   *  clients to pace themselves against numbers we intend to change. */
  window: string | null
  limit: number | null
}

const ALLOWED: McpRateLimitVerdict = {
  allowed: true,
  retryAfterSeconds: 0,
  window: null,
  limit: null,
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Keys
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Matches the CIMD cache's treatment of `client_id` (`mcp-oauth.service.ts`): it is a caller-chosen
 *  string — an https URL for a CIMD client — and never goes into a key name raw. */
function hashClientId(clientId: string): string {
  return createHash('sha256').update(clientId, 'utf8').digest('hex')
}

/**
 * How long the meter may hold up a tool call. See the header: without this, an unreachable Redis
 * hangs the request for 60s instead of failing open.
 *
 * Two INCRs and an EXPIRE against a co-located Redis are sub-millisecond, and the tool call this
 * guards already costs 300ms+ on the back hop — so a healthy Redis never comes close. It is
 * deliberately far above normal and far below "a human notices".
 */
const REDIS_DEADLINE_MS = 250

class RateLimiterTimeout extends Error {
  constructor() {
    super('rate limiter did not answer within the deadline')
  }
}

/**
 * ⚠️ The losing promise is NOT cancelled — ioredis has no abort. It resolves later into nothing,
 * which is fine: the command still lands (or does not) and the counter is still correct for the next
 * call. What matters is that the CALLER is no longer waiting on it. `clearTimeout` in `finally` is
 * what keeps a stack of pending timers from piling up under load.
 */
async function withDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new RateLimiterTimeout()), REDIS_DEADLINE_MS)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The circuit breaker — stops the deadline being paid over and over
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ⛔ ONLY A REDIS **HEALTH** SIGNAL MAY OPEN THIS. A REFUSAL MUST NEVER COUNT.
 *
 * Conflating the two turns "one client is over its limit" into "metering is off for everybody" — the
 * single worst failure this file could have, and an attractive one to a caller who notices. The
 * protection is structural, not a check to remember: a refusal is a RETURN VALUE (`refusal()`), so it
 * flows out through `withBreaker`'s success path and RESETS the failure count, because a refusal is
 * Redis answering. Only a THROW reaches the failure path, and only two throws are health signals:
 * the deadline firing (Redis said nothing) and a connection error (Redis is not there).
 *
 * Anything else that throws — a shape bug in the pipeline results, a mocked client missing a method —
 * fails open and is deliberately NOT counted. Those throw instantly, so retrying them costs no
 * waiting, and the breaker exists to save waiting. Disabling metering over a code bug would be a
 * second bug hiding the first.
 */
const REDIS_CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
])

/** ioredis' own give-up errors, which carry no `code`. */
const REDIS_CONNECTION_ERROR_NAMES = new Set(['MaxRetriesPerRequestError', 'ClusterAllFailedError'])

function isRedisHealthFailure(error: unknown): boolean {
  // Safe `instanceof` (cf. `OAuthProtocolError`, which needed `Symbol.for` because it crosses Next
  // route bundles): this class is thrown and caught in THIS module, so a duplicated copy of the
  // module has its own throw site too and the pair can never be split.
  if (error instanceof RateLimiterTimeout) return true
  if (!(error instanceof Error)) return false
  if (REDIS_CONNECTION_ERROR_NAMES.has(error.name)) return true
  const code = (error as NodeJS.ErrnoException).code
  if (code !== undefined && REDIS_CONNECTION_ERROR_CODES.has(code)) return true
  // ioredis reports a dead socket in prose, not in a code.
  return /connection is (already )?closed|stream isn't writeable/i.test(error.message)
}

/**
 * Five consecutive health failures, because that is the smallest number that cannot be reached by a
 * blip. A Sentinel failover or a `BGSAVE` fork pause stalls Redis for one or two round trips; opening
 * on one or two would mean a routine reconnect silently switches metering off. Five costs at most
 * 5 × 250 ms = 1.25 s of waiting before the tax stops, spread over ~2–3 POSTs (the door `peek` plus
 * one `consume` per tool call both feed this), and is unmistakably "Redis is gone", not "Redis
 * hiccuped".
 */
export const MCP_BREAKER_FAILURE_THRESHOLD = 5

/**
 * Deliberately SHORT. The cooldown is the length of time we knowingly do not measure traffic, so it
 * is a cost, not a rest: this is not a breaker protecting a fragile dependency from load (two INCRs
 * cannot hurt Redis), it is a breaker protecting US from waiting. 5 s reduces the outage tax by ~99%
 * — one 250 ms probe per 5 s instead of 250 ms per call — while bringing metering back within one
 * human-perceptible moment of Redis recovering. A minute-long cooldown would buy nothing more and
 * leave the cap off for a minute after the outage ended.
 */
export const MCP_BREAKER_COOLDOWN_MS = 5_000

/**
 * Module-level ON PURPOSE — Redis is the thing that is down, so breaker state cannot live in Redis,
 * and a shared cache is not needed: `rate-limit.ts` is imported only by `/api/mcp/route.ts`, so one
 * bundle holds one breaker and every MCP call goes through it. If a second route ever imports this
 * and the state has to move to `globalThis`, remember Phase 3b: a class instance crossing bundles
 * breaks `instanceof`. Keep this a plain object for exactly that reason.
 *
 * ⚠️ CONSEQUENCE, STATED SO IT IS NOT MISREAD AS A BUG: while the breaker is open there are NO
 * `INCR`s, so the counters UNDERCOUNT and a client can exceed its nominal budget for the duration of
 * the outage. That is not a leak in the breaker, it is what fail-open means — the same traffic went
 * unmetered before the breaker existed, it just paid 250 ms each time on the way through. Authority
 * is unaffected: every gate on the back hop still runs.
 */
const breaker = {
  /** Reset by ANY answer from Redis, including a refusal. */
  consecutiveFailures: 0,
  /** Epoch ms at which the cooldown ends. `0` means the breaker is closed. */
  openedUntil: 0,
  /** True while the ONE half-open probe is out. */
  probeInFlight: false,
}

/** ⚠️ Tests only — module state would otherwise leak an open breaker into the next test. */
export function __resetMcpRateLimitBreakerForTests(): void {
  breaker.consecutiveFailures = 0
  breaker.openedUntil = 0
  breaker.probeInFlight = false
}

type BreakerAdmission =
  | { admitted: false }
  /** `probe` distinguishes the half-open probe from a straggler admitted before the breaker opened,
   *  so a straggler's late timeout is not mistaken for the probe failing and let a second one in. */
  | { admitted: true; probe: boolean }

function breakerAdmit(): BreakerAdmission {
  if (breaker.openedUntil === 0) return { admitted: true, probe: false }
  if (Date.now() < breaker.openedUntil) return { admitted: false }
  // ⚠️ HALF-OPEN LETS THROUGH EXACTLY ONE CALL, NOT EVERY CALL WAITING. A Redis that has just come
  // back — or is still coming back — must not be handed the whole backlog at once, and the callers
  // must not all pay 250 ms again to discover the same thing. The flag is set synchronously, before
  // any `await`, which is what makes "exactly one" true.
  if (breaker.probeInFlight) return { admitted: false }
  breaker.probeInFlight = true
  log.info('[mcp] rate limiter breaker HALF-OPEN — one probe call will touch Redis')
  return { admitted: true, probe: true }
}

function breakerOnAnswer(): void {
  breaker.consecutiveFailures = 0
  if (breaker.openedUntil === 0) return
  breaker.openedUntil = 0
  breaker.probeInFlight = false
  log.info('[mcp] rate limiter breaker CLOSED — Redis answered, metering is back on')
}

function breakerOnHealthFailure(wasProbe: boolean): void {
  if (wasProbe) {
    breaker.probeInFlight = false
    breaker.openedUntil = Date.now() + MCP_BREAKER_COOLDOWN_MS
    // WARN, not ERROR: the control was already reported lost when the breaker opened. Re-stating it
    // at ERROR every 5 s would bury the rest of the incident in the log we need to read during it.
    log.warn('[mcp] rate limiter breaker probe failed — still OPEN, still unmetered')
    return
  }
  // Already open: a call admitted just before it opened, timing out afterwards. Its ERROR is on the
  // record; neither re-log nor extend the cooldown, or five stragglers become five ERROR lines and a
  // cooldown that keeps sliding forward.
  if (breaker.openedUntil !== 0) return

  breaker.consecutiveFailures += 1
  if (breaker.consecutiveFailures < MCP_BREAKER_FAILURE_THRESHOLD) return

  breaker.openedUntil = Date.now() + MCP_BREAKER_COOLDOWN_MS
  log.error(
    { consecutiveFailures: breaker.consecutiveFailures, cooldownMs: MCP_BREAKER_COOLDOWN_MS },
    '[mcp] rate limiter breaker OPEN — skipping Redis entirely, ALL MCP traffic is unmetered'
  )
}

/**
 * The only path to Redis in this file. `peek` and `consume` differ in what they ask Redis; they do
 * not differ in how they handle a Redis that is not answering, so that half lives here once.
 */
async function withBreaker(
  identity: McpRateLimitIdentity,
  phase: 'peek' | 'consume',
  work: () => Promise<McpRateLimitVerdict>
): Promise<McpRateLimitVerdict> {
  const admission = breakerAdmit()
  // ⚠️ NOT LOGGED. This branch runs on every call during an outage; a line here would flood the log
  // at exactly the moment it has to stay readable. The transitions are the signal, and they are
  // logged above.
  if (!admission.admitted) return ALLOWED

  try {
    const verdict = await work()
    breakerOnAnswer()
    return verdict
  } catch (error) {
    if (isRedisHealthFailure(error)) breakerOnHealthFailure(admission.probe)
    return failOpen(error, identity, phase)
  }
}

interface WindowKey {
  window: McpRateLimitWindow
  key: string
  /** Absolute epoch second at which this bucket rolls over. */
  resetAt: number
}

function windowKeys(identity: McpRateLimitIdentity, nowSeconds: number): WindowKey[] {
  const clientIdHash = hashClientId(identity.clientId)
  return MCP_RATE_LIMIT_WINDOWS.map((window) => {
    const bucket = Math.floor(nowSeconds / window.seconds)
    return {
      window,
      key: REDIS_KEYS.MCP.CALL_WINDOW(window.name, identity.userId, clientIdHash, bucket),
      resetAt: (bucket + 1) * window.seconds,
    }
  })
}

/** Never 0: `retry-after: 0` tells a client to retry at once, which is the opposite of the message. */
function retryAfter(resetAt: number, nowSeconds: number): number {
  return Math.max(1, resetAt - nowSeconds)
}

function refusal(entry: WindowKey, nowSeconds: number): McpRateLimitVerdict {
  return {
    allowed: false,
    retryAfterSeconds: retryAfter(entry.resetAt, nowSeconds),
    window: entry.window.name,
    limit: entry.window.maxCalls,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Peek and consume
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ★ WHY THIS IS SPLIT IN TWO, AND WHY IT IS NOT OVER-ENGINEERING.
 *
 * The obvious design is one function called once per HTTP request. It does not hold, and the reason
 * is measurable in the SDK source rather than in the spec: `webStandardStreamableHttp.js` accepts a
 * **JSON-RPC array** body and dispatches every element. So one POST can carry a hundred `tools/call`
 * requests. A per-POST counter would charge that hundred as one — the bypass is a JSON bracket.
 *
 * Hence: **`consume` runs per tool call**, where the work actually happens, so a batch is charged
 * honestly and `find_li2_docs` (which reaches an external CDN and would otherwise be free) is charged
 * with everything else. **`peek` runs at the door**, read-only, so a client that is already over gets
 * a real HTTP **429 with `retry-after`** — the thing MCP clients and their HTTP stacks actually back
 * off on. A tool-result error is read by the model, not by the client's transport, and no model backs
 * off on a schedule.
 *
 * The two together also close the batch's one free over-run: the door lets the batch in (the counter
 * was under the limit when it arrived), and then `consume` refuses each call inside it past the line.
 */

/** Read-only. Charges nothing, so a request refused at the door does not deepen the hole it is in. */
export async function peekMcpRateLimit(
  identity: McpRateLimitIdentity
): Promise<McpRateLimitVerdict> {
  return withBreaker(identity, 'peek', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const entries = windowKeys(identity, nowSeconds)

    const counts = await withDeadline(redis.mget(...entries.map((entry) => entry.key)))
    for (let index = 0; index < entries.length; index += 1) {
      const count = Number(counts[index] ?? 0)
      if (Number.isFinite(count) && count >= entries[index].window.maxCalls) {
        return refusal(entries[index], nowSeconds)
      }
    }
    return ALLOWED
  })
}

/**
 * Charge one call and say whether it was within the limit.
 *
 * The increment happens even when the call is over the line. That is intentional and is what "fixed
 * window" means: the bucket expires on a clock, not on good behaviour, so a client that keeps
 * hammering does not extend its own lockout. Punishing it would need a different algorithm and would
 * make an honest client's transient burst indistinguishable from an abusive one.
 */
export async function consumeMcpRateLimit(
  identity: McpRateLimitIdentity
): Promise<McpRateLimitVerdict> {
  return withBreaker(identity, 'consume', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const entries = windowKeys(identity, nowSeconds)

    const pipeline = redis.multi()
    for (const entry of entries) {
      pipeline.incr(entry.key)
      // TTL = the FULL window, not the time remaining in this bucket. The bucket index is already in
      // the key, so an over-long TTL only retains a dead key a little longer, while a computed
      // remaining-time TTL rounds to 0 at the boundary — and `EXPIRE key 0` deletes the counter,
      // handing whoever hit that millisecond a free window.
      pipeline.expire(entry.key, entry.window.seconds)
    }
    const results = await withDeadline(pipeline.exec())

    for (let index = 0; index < entries.length; index += 1) {
      // Two commands per window, INCR first: results[2i] is the INCR, results[2i + 1] the EXPIRE.
      const count = Number(results?.[index * 2]?.[1] ?? 0)
      if (Number.isFinite(count) && count > entries[index].window.maxCalls) {
        log.warn(
          {
            userId: identity.userId,
            clientId: identity.clientId,
            window: entries[index].window.name,
            limit: entries[index].window.maxCalls,
            count,
          },
          '[mcp] rate limit exceeded'
        )
        return refusal(entries[index], nowSeconds)
      }
    }
    return ALLOWED
  })
}

/** See the header for why this is the right answer here and the wrong one two files over. */
function failOpen(
  error: unknown,
  identity: McpRateLimitIdentity,
  phase: 'peek' | 'consume'
): McpRateLimitVerdict {
  log.error(
    {
      err: error,
      phase,
      // Distinguishes "Redis said no" from "Redis said nothing" — the two outages need different
      // fixes, and only this field tells them apart once the request is long gone.
      timedOut: error instanceof RateLimiterTimeout,
      userId: identity.userId,
      clientId: identity.clientId,
    },
    '[mcp] rate limiter unavailable — ALLOWING the call unmetered (Redis is down)'
  )
  return ALLOWED
}
