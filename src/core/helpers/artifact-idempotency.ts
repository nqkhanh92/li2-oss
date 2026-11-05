/**
 * ============================================================================
 * `publish_artifact.idempotency_key` — one publish per key, 24 hours (spec WP3, đề xuất §3).
 * ============================================================================
 *
 * ⛔ THE PROBLEM IS NOT "the agent called twice by mistake". An MCP tool call travels over a back hop
 * with a 30 s timeout (`core/mcp/call-tool.ts`); `createAndPublish` keeps running on this side after
 * the client has given up. So the caller's timeout cannot distinguish "nothing was created" from
 * "it was created and I lost the answer", and the only safe move available to it — retry — burns a
 * second live artifact slot and a second copy of the file against the org's storage quota
 * (measured, checklist A13). The key is what lets a retry be safe.
 *
 * ★ WHY THIS LIVES AT THE BACK-HOP ROUTE AND NOT IN THE MCP LAYER (checklist §D). Putting the claim
 * in `call-tool.ts` would guard the wrong side of the hop: the publish that must not happen twice
 * runs HERE, and the timeout that loses the response happens between the two. A claim taken before
 * the hop would be released (or never completed) by a client that has already disconnected.
 *
 * ★ WHY NOT IN `artifact.service.ts`. The service is shared with the UI, which has no idempotency
 * key and must not grow a Redis dependency for it (`Deps` has none today — checklist B11). The route
 * is the one place that knows the call came from an agent.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ★ REDIS DOWN → FAIL **CLOSED**, and that is the OPPOSITE of `core/mcp/rate-limit.ts`.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * The rule stated in that file is "never fail open at a layer that decides AUTHORITY; failing open at
 * a layer that only MEASURES is allowed". This layer measures nothing and decides nothing about
 * rights — it decides whether a WRITE has already happened. Letting a call through unclaimed is not
 * "some traffic goes uncounted", it is the duplicate publish the caller asked us to prevent, and it
 * is not reversible by the caller: the second artifact occupies a live slot until a human deletes it.
 * So a call that CARRIES a key is refused with a 503 when the store cannot answer.
 *
 * A call with NO key never touches Redis at all. It is not idempotent and never claimed to be, so a
 * Redis outage must not take ordinary publishing down with it — including the UI's, which shares the
 * service underneath.
 *
 * ⚠️ And fail-closed still needs a DEADLINE, for the reason `rate-limit.ts` documents at length:
 * ioredis buffers commands in an offline queue and keeps retrying, so a promise that "throws when
 * Redis is down" against a HUNG server (firewall, partition) simply never settles. Without the race
 * below, the symptom is not a 503 — it is a publish that hangs until the hop's 30 s timeout, which is
 * exactly the lost-response scenario this file exists to make safe.
 *
 * The client is passed IN rather than imported so the unit tests can drive every branch — including
 * "Redis never answers" — with a plain object and no server.
 */
import { createHash } from 'crypto'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { logger } from '@/infrastructure/logging/logger'
import {
  ConflictError,
  ServiceUnavailableError,
} from '@/infrastructure/response/errors/domain.errors'

const log = logger.child({ module: 'artifact-idempotency' })

/** 24h (spec §3). Long enough to cover a retry an agent makes after the user comes back, short
 *  enough that a key is not a permanent name for an artifact. */
export const ARTIFACT_IDEMPOTENCY_TTL_SECONDS = 86_400

/** The value stored while the publish is in flight. Any other value is an `artifact_id`. */
export const ARTIFACT_IDEMPOTENCY_PENDING = 'pending'

/**
 * More patient than `rate-limit.ts`' 250 ms, on purpose: this path fails CLOSED, so a deadline that
 * fires early costs the user a refused publish rather than one unmetered call. A `SET NX` against a
 * co-located Redis is sub-millisecond; 1 s is far above any healthy round trip and far below the
 * 30 s hop timeout it exists to beat.
 */
const REDIS_DEADLINE_MS = 1_000

class IdempotencyStoreTimeout extends Error {
  constructor() {
    super('idempotency store did not answer within the deadline')
  }
}

/**
 * Only the four commands this file issues, so a test double is a four-line object and cannot be
 * handed the whole Redis API by accident. `ioredis`' `Redis` satisfies it structurally.
 */
export interface ArtifactIdempotencyRedis {
  set(
    key: string,
    value: string,
    secondsToken: 'EX',
    seconds: number,
    nx: 'NX'
  ): Promise<'OK' | null>
  set(key: string, value: string, secondsToken: 'EX', seconds: number): Promise<'OK'>
  set(key: string, value: string, keepttl: 'KEEPTTL'): Promise<'OK' | null>
  get(key: string): Promise<string | null>
  del(key: string): Promise<number>
}

/**
 * `claimed` — this call owns the publish and MUST finish with `completeIdempotency` (on success) or
 * `releaseIdempotency` (on failure). `replay` — the same key already published `artifactId`, so the
 * caller answers with that artifact instead of making another.
 *
 * "still running" is NOT a variant here: it is a `ConflictError` thrown from `claimIdempotency`,
 * because there is nothing the caller can do with it other than surface it.
 */
export type ArtifactIdempotencyClaim =
  { outcome: 'claimed' } | { outcome: 'replay'; artifactId: string }

/**
 * Which kind of resource a key claims (SL-0 §2).
 *
 * ⚠️ IT IS PART OF THE REDIS KEY, so the same caller-chosen key means one thing for a publish and
 * another for a short link. Sharing one namespace would let `create_short_link` replay an
 * `artifact_id` — an id from a different table — to a caller that names its keys by date.
 *
 * ★ The artifact branch keeps `artifact:idem:*` BYTE FOR BYTE rather than moving to a uniform
 * `agent:idem:<namespace>:*`. Those keys are live in Redis with a 24 h TTL; renaming them would
 * abandon every claim currently in flight, which is exactly the duplicate publish the parameter
 * exists to prevent.
 */
export type AgentIdempotencyNamespace = 'artifact' | 'short_link'

function keyFor(
  orgId: string,
  idempotencyKey: string,
  namespace: AgentIdempotencyNamespace
): string {
  const hash = createHash('sha256').update(idempotencyKey, 'utf8').digest('hex')
  return namespace === 'short_link'
    ? REDIS_KEYS.SHORT_LINK.IDEMPOTENCY(orgId, hash)
    : REDIS_KEYS.ARTIFACT.IDEMPOTENCY(orgId, hash)
}

/** See the header: a hung Redis answers neither success nor error, so the race is the only thing
 *  that turns "Redis is unreachable" into a 503 rather than a 30 s hang. */
async function withDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new IdempotencyStoreTimeout()), REDIS_DEADLINE_MS)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * The sentence a 503 carries. `agent:*` key: no UI renders it, `core/mcp/artifact-refusals.ts` is
 * the only reader, and it turns the key into the wording the model sees.
 */
function storeUnavailable(namespace: AgentIdempotencyNamespace): ServiceUnavailableError {
  return new ServiceUnavailableError('Idempotency store unavailable', {
    key: `agent:${namespace}.idem_unavailable`,
  })
}

/**
 * Take the claim, or report what the key already means.
 *
 * `SET key pending NX EX 86400` is the whole of the mutual exclusion, and it has to be ONE command:
 * a `GET` followed by a `SET` is two round trips with a window between them, which is precisely the
 * case the parallel-retry test covers (two retries of the same timed-out call, arriving together).
 *
 * The `GET` below runs only on the losing path, where the race is already decided — it reads what
 * the winner wrote. A `null` there means the key expired between the two commands (24 h of waiting,
 * so realistically never); it is treated as "still running" rather than re-claimed, because
 * re-claiming would publish twice for the one key whose job is to prevent that.
 */
export async function claimIdempotency(
  redis: ArtifactIdempotencyRedis,
  orgId: string,
  idempotencyKey: string,
  namespace: AgentIdempotencyNamespace = 'artifact'
): Promise<ArtifactIdempotencyClaim> {
  const key = keyFor(orgId, idempotencyKey, namespace)

  let acquired: 'OK' | null
  try {
    acquired = await withDeadline(
      redis.set(key, ARTIFACT_IDEMPOTENCY_PENDING, 'EX', ARTIFACT_IDEMPOTENCY_TTL_SECONDS, 'NX')
    )
  } catch (error) {
    log.error({ err: error, orgId, namespace }, '[agent] idempotency claim could not reach Redis')
    throw storeUnavailable(namespace)
  }

  if (acquired === 'OK') return { outcome: 'claimed' }

  let stored: string | null
  try {
    stored = await withDeadline(redis.get(key))
  } catch (error) {
    log.error(
      { err: error, orgId, namespace },
      '[agent] idempotency read-back could not reach Redis'
    )
    throw storeUnavailable(namespace)
  }

  if (stored !== null && stored !== ARTIFACT_IDEMPOTENCY_PENDING) {
    return { outcome: 'replay', artifactId: stored }
  }

  /**
   * 409 and not a wait: the first call may still be uploading a 10 MB page, and holding this request
   * open until it finishes would mean two requests paying one publish's latency — with the second
   * one likely to hit the hop timeout anyway. Its own key tells the agent the retry is safe.
   */
  throw new ConflictError('A call with this idempotency_key is still in progress', {
    key: `agent:${namespace}.idem_in_progress`,
  })
}

/**
 * Turn the claim into the answer: from here on, the same key replays `artifactId`.
 *
 * `KEEPTTL` so the 24 h window runs from the CLAIM — the key is a receipt for one publish attempt,
 * not a lease that renews itself at the end. The fallback is not decoration: `KEEPTTL` needs Redis
 * ≥ 6.0, and on an older server the command is a syntax error that would leave the key reading
 * `pending` for a full day — every retry of a publish that SUCCEEDED answering 409. A slightly
 * longer window is the harmless failure; a publish that can never be confirmed is not.
 *
 * ⚠️ BEST-EFFORT, AND IT DOES NOT CLEAN UP ON FAILURE. If Redis dies between the publish and this
 * line, the key stays `pending` and retries get 409 for up to 24 h. `DEL`-ing instead would let a
 * retry publish a SECOND artifact — a duplicate that burns a live slot and only a human can remove.
 * A stuck 409 is visible and costs nothing; a silent duplicate is neither. Never throws: the publish
 * already happened and the caller must still be able to report it.
 */
export async function completeIdempotency(
  redis: ArtifactIdempotencyRedis,
  orgId: string,
  idempotencyKey: string,
  resourceId: string,
  namespace: AgentIdempotencyNamespace = 'artifact'
): Promise<void> {
  const key = keyFor(orgId, idempotencyKey, namespace)
  try {
    await withDeadline(redis.set(key, resourceId, 'KEEPTTL'))
  } catch (error) {
    try {
      // No `NX` here — the key EXISTS, it reads `pending`. This overwrites it.
      await withDeadline(redis.set(key, resourceId, 'EX', ARTIFACT_IDEMPOTENCY_TTL_SECONDS))
      log.warn({ orgId, namespace }, '[agent] idempotency KEEPTTL failed, fell back to a fresh EX')
    } catch (fallbackError) {
      log.error(
        { err: fallbackError, originalErr: error, orgId, namespace, resourceId },
        '[agent] the created resource could not be recorded against its idempotency_key — ' +
          'retries with this key will answer 409 until it expires'
      )
    }
  }
}

/**
 * Give the key back, so a retry of a publish that FAILED is a fresh attempt rather than a 409 for a
 * day. The quota refusal and the taken slug are the common cases, and both are things the user fixes
 * and the agent then retries — with the same key, because it has no reason to mint a new one.
 *
 * Never throws, for the same reason as `completeIdempotency`: the real error is the publish's and it
 * must reach the caller unchanged. A `DEL` lost to a Redis outage leaves a `pending` key that
 * expires on its own.
 */
export async function releaseIdempotency(
  redis: ArtifactIdempotencyRedis,
  orgId: string,
  idempotencyKey: string,
  namespace: AgentIdempotencyNamespace = 'artifact'
): Promise<void> {
  try {
    await withDeadline(redis.del(keyFor(orgId, idempotencyKey, namespace)))
  } catch (error) {
    log.error(
      { err: error, orgId, namespace },
      '[agent] idempotency key could not be released after a failed call'
    )
  }
}
