/**
 * `core/helpers/artifact-idempotency.ts` — the claim/complete/release protocol behind
 * `publish_artifact.idempotency_key` (WP3).
 *
 * The client is a plain in-memory object, not `ioredis-mock` (not a dependency of this repo) and not
 * a real Redis: every branch that matters here is about ORDERING and FAILURE, and both are easier to
 * state exactly with a fake than to provoke against a server. The fake implements the three `SET`
 * forms the module issues, `NX` included, which is the only semantics the protocol leans on.
 */
import { createHash } from 'crypto'
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  claimIdempotency,
  completeIdempotency,
  releaseIdempotency,
  ARTIFACT_IDEMPOTENCY_PENDING,
  ARTIFACT_IDEMPOTENCY_TTL_SECONDS,
  type ArtifactIdempotencyRedis,
} from '../../../core/helpers/artifact-idempotency'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const OTHER_ORG = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'
const OTHER_ARTIFACT_ID = '44444444-4444-4444-8444-444444444444'
const KEY = 'publish-bang-gia-t10'

/** The same digest `keyFor` takes, so a key-name assertion can be exact rather than a regex. */
const sha256Hex = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')

/** `SET` with the options this module uses, `GET` and `DEL`, over a Map. */
function memoryRedis() {
  const data = new Map<string, string>()
  const setArgs: unknown[][] = []

  const client = {
    set: vi.fn(async (key: string, value: string, ...rest: unknown[]) => {
      setArgs.push([key, value, ...rest])
      if (rest.includes('NX') && data.has(key)) return null
      data.set(key, value)
      return 'OK'
    }),
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    del: vi.fn(async (key: string) => (data.delete(key) ? 1 : 0)),
  }

  return { client: client as unknown as ArtifactIdempotencyRedis, data, setArgs, spies: client }
}

/** Every command rejects — a Redis that is not there (ECONNREFUSED and friends). */
function brokenRedis(failing: Array<'set' | 'get' | 'del'> = ['set', 'get', 'del']) {
  const base = memoryRedis()
  for (const name of failing) {
    base.spies[name] = vi.fn(async () => {
      throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    }) as never
  }
  return base
}

/** Every command hangs for ever — a partitioned or firewalled Redis, the failure ioredis' offline
 *  queue turns into silence rather than an error. */
function hangingRedis(): ArtifactIdempotencyRedis {
  const hang = () => new Promise<never>(() => {})
  return { set: hang, get: hang, del: hang } as unknown as ArtifactIdempotencyRedis
}

afterEach(() => {
  vi.useRealTimers()
})

describe('claimIdempotency — the first call owns the publish', () => {
  it('claims on an unused key, with pending + a 24h EX + NX', async () => {
    const redis = memoryRedis()

    await expect(claimIdempotency(redis.client, ORG, KEY)).resolves.toEqual({ outcome: 'claimed' })

    expect(redis.setArgs).toHaveLength(1)
    const [key, value, ...options] = redis.setArgs[0]
    expect(value).toBe(ARTIFACT_IDEMPOTENCY_PENDING)
    expect(options).toEqual(['EX', ARTIFACT_IDEMPOTENCY_TTL_SECONDS, 'NX'])
    expect(key as string).toContain(`artifact:idem:${ORG}:`)
    // No read-back on the winning path: `SET NX` already answered the only question there was.
    expect(redis.spies.get).not.toHaveBeenCalled()
  })

  it('the Redis key hashes the caller-supplied value — it never appears raw', async () => {
    const redis = memoryRedis()
    const readableKey = 'retry.of:the-launch-page'

    await claimIdempotency(redis.client, ORG, readableKey)

    const key = redis.setArgs[0][0] as string
    expect(key).not.toContain(readableKey)
    expect(key).toMatch(new RegExp(`^artifact:idem:${ORG}:[0-9a-f]{64}$`))
  })

  it('two calls with the SAME key: one creates, the retry replays the artifact_id', async () => {
    const redis = memoryRedis()

    const first = await claimIdempotency(redis.client, ORG, KEY)
    expect(first).toEqual({ outcome: 'claimed' })
    await completeIdempotency(redis.client, ORG, KEY, ARTIFACT_ID)

    await expect(claimIdempotency(redis.client, ORG, KEY)).resolves.toEqual({
      outcome: 'replay',
      artifactId: ARTIFACT_ID,
    })
  })

  it('two claims IN PARALLEL: exactly one is admitted, the other is a 409 "still in progress"', async () => {
    const redis = memoryRedis()

    const results = await Promise.allSettled([
      claimIdempotency(redis.client, ORG, KEY),
      claimIdempotency(redis.client, ORG, KEY),
    ])

    const admitted = results.filter((r) => r.status === 'fulfilled')
    const refused = results.filter((r) => r.status === 'rejected')
    expect(admitted).toHaveLength(1)
    expect(refused).toHaveLength(1)
    expect((admitted[0] as PromiseFulfilledResult<unknown>).value).toEqual({ outcome: 'claimed' })
    // ⛔ Specifically NOT `replay`: nothing has been published yet, so there is no artifact_id to
    // answer with — replying with one would be inventing a result.
    const error = (refused[0] as PromiseRejectedResult).reason
    expect(error.status).toBe(409)
    expect(error.i18nMessage.key).toBe('agent:artifact.idem_in_progress')
  })

  it('a key that is still `pending` after the winner vanished is a 409, never a re-claim', async () => {
    // A publish that is genuinely in flight, read by a retry. Re-claiming here would be the
    // duplicate publish the whole mechanism exists to prevent.
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, KEY)

    await expect(claimIdempotency(redis.client, ORG, KEY)).rejects.toMatchObject({ status: 409 })
  })

  it('DIFFERENT keys are independent — two publishes, two artifacts', async () => {
    const redis = memoryRedis()

    await expect(claimIdempotency(redis.client, ORG, 'page-a')).resolves.toEqual({
      outcome: 'claimed',
    })
    await expect(claimIdempotency(redis.client, ORG, 'page-b')).resolves.toEqual({
      outcome: 'claimed',
    })
    expect(redis.data.size).toBe(2)
  })

  it('the SAME key in a DIFFERENT org is a different claim — the key is scoped to the org', async () => {
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, KEY)
    await completeIdempotency(redis.client, ORG, KEY, ARTIFACT_ID)

    await expect(claimIdempotency(redis.client, OTHER_ORG, KEY)).resolves.toEqual({
      outcome: 'claimed',
    })
    await completeIdempotency(redis.client, OTHER_ORG, KEY, OTHER_ARTIFACT_ID)

    await expect(claimIdempotency(redis.client, ORG, KEY)).resolves.toEqual({
      outcome: 'replay',
      artifactId: ARTIFACT_ID,
    })
  })
})

describe('claimIdempotency — Redis down means FAIL CLOSED (the opposite of rate-limit.ts)', () => {
  it('SET throwing → 503 with the idem key, so the publish is never attempted', async () => {
    const redis = brokenRedis(['set'])

    await expect(claimIdempotency(redis.client, ORG, KEY)).rejects.toMatchObject({
      status: 503,
      i18nMessage: { key: 'agent:artifact.idem_unavailable' },
    })
  })

  it('the read-back on the losing path throwing → 503, not a silent re-claim', async () => {
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, KEY)
    redis.spies.get = vi.fn(async () => {
      throw Object.assign(new Error('connection is closed'), { code: 'ECONNRESET' })
    }) as never

    await expect(claimIdempotency(redis.client, ORG, KEY)).rejects.toMatchObject({ status: 503 })
  })

  it('a Redis that HANGS answers 503 on the deadline, not after the hop timeout', async () => {
    // The measured production failure `rate-limit.ts` documents: ioredis queues the command and
    // keeps retrying, so a promise that "throws when Redis is down" never settles at all. Without
    // the deadline the symptom is a publish hanging for 30 s, which IS the lost-response case.
    vi.useFakeTimers()
    const pending = claimIdempotency(hangingRedis(), ORG, KEY)
    const asserted = expect(pending).rejects.toMatchObject({
      status: 503,
      i18nMessage: { key: 'agent:artifact.idem_unavailable' },
    })

    await vi.advanceTimersByTimeAsync(1_001)

    await asserted
  })
})

describe('completeIdempotency — the key starts answering with the artifact_id', () => {
  it('writes the artifact_id with KEEPTTL, so the 24h window runs from the CLAIM', async () => {
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, KEY)

    await completeIdempotency(redis.client, ORG, KEY, ARTIFACT_ID)

    const [, value, ...options] = redis.setArgs[1]
    expect(value).toBe(ARTIFACT_ID)
    expect(options).toEqual(['KEEPTTL'])
  })

  it('falls back to a fresh EX when KEEPTTL is rejected (Redis < 6.0 answers a syntax error)', async () => {
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, KEY)
    const memorySet = redis.spies.set
    redis.spies.set = vi.fn(async (...args: unknown[]) => {
      if (args.includes('KEEPTTL')) throw new Error('ERR syntax error')
      return (memorySet as unknown as (...a: unknown[]) => Promise<'OK' | null>)(...args)
    }) as never

    await completeIdempotency(redis.client, ORG, KEY, ARTIFACT_ID)

    // The fallback must NOT carry NX — the key already exists and reads `pending`.
    const fallback = redis.setArgs.at(-1)!
    expect(fallback.slice(1)).toEqual([ARTIFACT_ID, 'EX', ARTIFACT_IDEMPOTENCY_TTL_SECONDS])
    await expect(claimIdempotency(redis.client, ORG, KEY)).resolves.toEqual({
      outcome: 'replay',
      artifactId: ARTIFACT_ID,
    })
  })

  it('never throws when Redis is gone — the publish already happened and must still be reported', async () => {
    const redis = brokenRedis(['set'])

    await expect(completeIdempotency(redis.client, ORG, KEY, ARTIFACT_ID)).resolves.toBeUndefined()
  })
})

describe('releaseIdempotency — a FAILED publish gives the key back', () => {
  it('deletes the claim, so the next retry with the same key publishes rather than 409s', async () => {
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, KEY)

    await releaseIdempotency(redis.client, ORG, KEY)

    expect(redis.data.size).toBe(0)
    await expect(claimIdempotency(redis.client, ORG, KEY)).resolves.toEqual({ outcome: 'claimed' })
  })

  it('releases only the key it was given', async () => {
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, 'page-a')
    await claimIdempotency(redis.client, ORG, 'page-b')

    await releaseIdempotency(redis.client, ORG, 'page-a')

    expect(redis.data.size).toBe(1)
    await expect(claimIdempotency(redis.client, ORG, 'page-b')).rejects.toMatchObject({
      status: 409,
    })
  })

  it('never throws — the publish error is the one the caller must see', async () => {
    const redis = brokenRedis(['del'])

    await expect(releaseIdempotency(redis.client, ORG, KEY)).resolves.toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SL-0 §2 — the `namespace` parameter
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('the namespace parameter', () => {
  it('⭐ defaults to artifact, so every wave-4 caller keeps its EXISTING Redis keys', () => {
    // Not a style point. Those keys are live with a 24 h TTL; a rename would abandon every claim in
    // flight, which is the duplicate publish the parameter exists to prevent. Every test above this
    // line calls the three functions with no namespace and asserts `artifact:idem:…`.
    expect(true).toBe(true)
  })

  it('⭐ a short_link claim and an artifact claim with the SAME key do not collide', async () => {
    // The failure this prevents: a caller that names its keys by date (`2026-10-20`) uses one for a
    // publish and one for a link. Sharing a namespace would have `create_short_link` replay an
    // `artifact_id` — an id from a different table — as if it were a short link.
    const redis = memoryRedis()

    await expect(claimIdempotency(redis.client, ORG, KEY, 'artifact')).resolves.toEqual({
      outcome: 'claimed',
    })
    await expect(claimIdempotency(redis.client, ORG, KEY, 'short_link')).resolves.toEqual({
      outcome: 'claimed',
    })

    const keys = [...redis.data.keys()]
    expect(keys).toHaveLength(2)
    expect(keys.some((k) => k.startsWith(`artifact:idem:${ORG}:`))).toBe(true)
    expect(keys.some((k) => k.startsWith(`short_link:idem:${ORG}:`))).toBe(true)
  })

  it('hashes the caller-chosen key in the short_link namespace too', async () => {
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, 'publish:2026-10-20:bảng giá', 'short_link')
    const [key] = redis.setArgs[0]
    expect(key).toMatch(new RegExp(`^short_link:idem:${ORG}:[0-9a-f]{64}$`))
  })

  it('complete + replay round-trip inside the short_link namespace', async () => {
    const redis = memoryRedis()
    const TP_ID = '55555555-5555-4555-8555-555555555555'

    await claimIdempotency(redis.client, ORG, KEY, 'short_link')
    await completeIdempotency(redis.client, ORG, KEY, TP_ID, 'short_link')

    await expect(claimIdempotency(redis.client, ORG, KEY, 'short_link')).resolves.toEqual({
      outcome: 'replay',
      artifactId: TP_ID,
    })
    // ⭐ And the artifact namespace is still free for the same key — the isolation holds AFTER a
    // completion, not just at claim time.
    await expect(claimIdempotency(redis.client, ORG, KEY, 'artifact')).resolves.toEqual({
      outcome: 'claimed',
    })
  })

  it('release only gives back the key in its own namespace', async () => {
    const redis = memoryRedis()
    await claimIdempotency(redis.client, ORG, KEY, 'artifact')
    await claimIdempotency(redis.client, ORG, KEY, 'short_link')

    await releaseIdempotency(redis.client, ORG, KEY, 'short_link')

    expect([...redis.data.keys()]).toEqual([`artifact:idem:${ORG}:${sha256Hex(KEY)}`])
  })

  it('⭐ the i18n keys a short_link claim throws are its OWN, not the artifact ones', async () => {
    // The refusal mapper branches on these. An `agent:artifact.idem_in_progress` coming out of a
    // short-link call would be answered with a sentence about publishing a second ARTIFACT.
    const pending = memoryRedis()
    await claimIdempotency(pending.client, ORG, KEY, 'short_link')
    const conflict = (await claimIdempotency(pending.client, ORG, KEY, 'short_link').catch(
      (e) => e
    )) as { i18nMessage: { key: string } }
    expect(conflict.i18nMessage.key).toBe('agent:short_link.idem_in_progress')

    const broken = brokenRedis(['set'])
    const unavailable = (await claimIdempotency(broken.client, ORG, KEY, 'short_link').catch(
      (e) => e
    )) as { status: number; i18nMessage: { key: string } }
    expect(unavailable.status).toBe(503)
    expect(unavailable.i18nMessage.key).toBe('agent:short_link.idem_unavailable')
  })
})
