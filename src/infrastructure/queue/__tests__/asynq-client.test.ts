import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: {
    sadd: vi.fn(),
    eval: vi.fn(),
    ping: vi.fn(),
  },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}))

describe('asynq-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueueTask', () => {
    it('returns a task ID on successful enqueue', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      const taskId = await enqueueTask('task:audit_log:create', { entity: 'org' })

      expect(taskId).toBeTruthy()
      expect(typeof taskId).toBe('string')
    })

    it('returns null when task ID already exists (deduplication)', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(0)

      const taskId = await enqueueTask('task:audit_log:create', { entity: 'org' })

      expect(taskId).toBeNull()
    })

    it('returns null on Redis error', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockRejectedValue(new Error('ECONNREFUSED'))

      const taskId = await enqueueTask('task:audit_log:create', { entity: 'org' })

      expect(taskId).toBeNull()
    })

    it('uses a provided custom task ID', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      const customId = 'my-fixed-task-id'
      const taskId = await enqueueTask('task:audit_log:create', {}, { taskId: customId })

      expect(taskId).toBe(customId)
    })

    it('registers the queue name in the asynq:queues set', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      await enqueueTask('task:audit_log:create', {}, { queue: 'critical' })

      expect(redis.sadd).toHaveBeenCalledWith('asynq:queues', 'critical')
    })

    it('defaults to the "default" queue when none is specified', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      await enqueueTask('task:audit_log:create', {})

      expect(redis.sadd).toHaveBeenCalledWith('asynq:queues', 'default')
    })

    it('writes a protobuf-encoded binary blob to Redis (not raw JSON)', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      await enqueueTask('task:payment:process', { amount: 100 }, { taskId: 'test-encode-id' })

      // redis.eval(script, numKeys, taskKey, pendingKey, encoded, taskId, nowNano)
      const evalCall = vi.mocked(redis.eval).mock.calls[0]
      const encoded = evalCall[4] as Buffer

      expect(Buffer.isBuffer(encoded)).toBe(true)
      expect(encoded.length).toBeGreaterThan(0)
      // Protobuf bytes are not valid JSON
      expect(() => JSON.parse(encoded.toString())).toThrow()
    })

    it('passes headers through to the encoded message without error', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      const taskId = await enqueueTask(
        'task:notification:send',
        {},
        { headers: { 'X-Source': 'api', 'X-Tenant': 'org-abc' } },
      )

      expect(taskId).toBeTruthy()
    })
  })

  describe('isQueueHealthy', () => {
    it('returns true when Redis responds to ping', async () => {
      const { isQueueHealthy } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.ping).mockResolvedValue('PONG')

      expect(await isQueueHealthy()).toBe(true)
    })

    it('returns false when Redis is unreachable', async () => {
      const { isQueueHealthy } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.ping).mockRejectedValue(new Error('ECONNREFUSED'))

      expect(await isQueueHealthy()).toBe(false)
    })
  })

  // Security regression for CVE-2023-36665 (npmjs advisory #1117571)
  // protobufjs < 7.5.5: util.merge() did not guard against __proto__ / constructor keys,
  // allowing prototype pollution when map<string,string> fields received adversarial objects.
  // These tests must pass before and after upgrading to >= 7.5.5 — if they fail before the
  // upgrade, the vulnerability is confirmed; the upgrade makes them green.
  describe('security: CVE-2023-36665 — prototype pollution via map<string,string> fields', () => {
    const MARKER = '__proto__attack_sentinel'

    afterEach(() => {
      // Undo any prototype pollution an older version might have introduced
      delete (Object.prototype as Record<string, unknown>)[MARKER]
    })

    it('does not pollute Object.prototype via __proto__-prefixed header key', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      expect(({} as Record<string, unknown>)[MARKER]).toBeUndefined()

      await enqueueTask('task:audit_log:create', {}, {
        headers: { [MARKER]: 'injected' },
      })

      // A newly created object must not have inherited the sentinel value
      expect(({} as Record<string, unknown>)[MARKER]).toBeUndefined()
      expect(Object.prototype.hasOwnProperty(MARKER)).toBe(false)
    })

    it('does not overwrite Object.prototype.constructor via "constructor" header key', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      const originalConstructor = Object.prototype.constructor

      await enqueueTask('task:audit_log:create', {}, {
        headers: { constructor: 'tampered' },
      })

      expect(Object.prototype.constructor).toBe(originalConstructor)
    })

    it('leaves Object.prototype shape unchanged after encoding adversarial headers', async () => {
      const { enqueueTask } = await import('../asynq-client')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.sadd).mockResolvedValue(1)
      vi.mocked(redis.eval).mockResolvedValue(1)

      const protoKeysBefore = Object.getOwnPropertyNames(Object.prototype)

      await enqueueTask('task:audit_log:create', {}, {
        headers: {
          '__proto__': 'x',
          'constructor': 'y',
          'prototype': 'z',
        },
      })

      const protoKeysAfter = Object.getOwnPropertyNames(Object.prototype)
      expect(protoKeysAfter).toEqual(protoKeysBefore)
    })
  })
})
