import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

const logMock = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => logMock },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ── Protobuf encoder helpers ──
// Encodes test data into the same protobuf format that Google Safe Browsing v5 returns.
// Schema: SearchUrlsResponse { repeated ThreatUrl threats=1; Duration cache_duration=2; }
//         ThreatUrl { string url=1; repeated ThreatType threat_types=2; }
//         ThreatType enum: 1=MALWARE, 2=SOCIAL_ENGINEERING, 3=UNWANTED_SOFTWARE, 4=PHA

function encodeVarint(value: number): number[] {
  const bytes: number[] = []
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80)
    value >>>= 7
  }
  bytes.push(value & 0x7f)
  return bytes
}

function encodeString(fieldNumber: number, value: string): number[] {
  const encoded = new TextEncoder().encode(value)
  return [
    ...encodeVarint((fieldNumber << 3) | 2), // wire type 2 = length-delimited
    ...encodeVarint(encoded.length),
    ...encoded,
  ]
}

function encodeSubmessage(fieldNumber: number, data: number[]): number[] {
  return [
    ...encodeVarint((fieldNumber << 3) | 2),
    ...encodeVarint(data.length),
    ...data,
  ]
}

function encodeThreatUrl(url: string, threatTypeEnums: number[]): number[] {
  const urlField = encodeString(1, url)
  // Pack threat types as repeated varint in field 2
  const packedData: number[] = []
  for (const t of threatTypeEnums) {
    packedData.push(...encodeVarint(t))
  }
  const threatField = encodeSubmessage(2, packedData)
  return [...urlField, ...threatField]
}

function encodeDuration(seconds: number): number[] {
  // Duration { int64 seconds = 1; }
  return encodeVarint((1 << 3) | 0).concat(encodeVarint(seconds))
}

function encodeSearchUrlsResponse(
  threats: Array<{ url: string; threatTypes: number[] }>,
  cacheDurationSeconds: number,
): ArrayBuffer {
  const parts: number[] = []
  for (const t of threats) {
    const threatUrlBytes = encodeThreatUrl(t.url, t.threatTypes)
    parts.push(...encodeSubmessage(1, threatUrlBytes))
  }
  const durationBytes = encodeDuration(cacheDurationSeconds)
  parts.push(...encodeSubmessage(2, durationBytes))
  return new Uint8Array(parts).buffer
}

function mockProtobufResponse(
  threats: Array<{ url: string; threatTypes: number[] }>,
  cacheDurationSeconds = 300,
) {
  const buffer = encodeSearchUrlsResponse(threats, cacheDurationSeconds)
  return {
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(buffer),
    headers: new Map([['content-type', 'application/x-protobuf']]),
    text: () => Promise.resolve(''),
  }
}

function mockEmptyResponse() {
  return {
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Map([['content-type', 'application/x-protobuf']]),
    text: () => Promise.resolve(''),
  }
}

describe('safe-browsing', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.GOOGLE_SAFE_BROWSING_API_KEY = 'test-api-key'
    const { __resetMissingKeyWarningForTests } = await import(
      '@/shared/lib/blacklist/safe-browsing'
    )
    __resetMissingKeyWarningForTests()
  })

  describe('checkUrlSafety', () => {
    it('should return safe for clean URLs (empty protobuf response)', async () => {
      const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(null)
      mockFetch.mockResolvedValue(mockEmptyResponse())

      const result = await checkUrlSafety('https://example.com')
      expect(result.safe).toBe(true)
      expect(result.threatTypes).toEqual([])
    })

    it('should return unsafe with threat types for malicious URLs', async () => {
      const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(null)
      // Google strips scheme from URLs in response
      mockFetch.mockResolvedValue(
        mockProtobufResponse([
          { url: 'evil.com/', threatTypes: [1, 2] }, // MALWARE, SOCIAL_ENGINEERING
        ]),
      )

      const result = await checkUrlSafety('https://evil.com/')
      expect(result.safe).toBe(false)
      expect(result.threatTypes).toContain('MALWARE')
      expect(result.threatTypes).toContain('SOCIAL_ENGINEERING')
    })

    it('should return cached result if available', async () => {
      const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ safe: true, threatTypes: [] }),
      )

      const result = await checkUrlSafety('https://cached.com')
      expect(result.safe).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fail open on API error', async () => {
      const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(null)
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await checkUrlSafety('https://unreachable.com')
      expect(result.safe).toBe(true)
    })

    it('should fail open when API key is not configured', async () => {
      delete process.env.GOOGLE_SAFE_BROWSING_API_KEY
      vi.resetModules()
      vi.mock('server-only', () => ({}))
      vi.mock('@/infrastructure/cache/redis', () => ({
        redis: { get: vi.fn(), set: vi.fn() },
      }))
      vi.stubGlobal('fetch', mockFetch)

      const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const result = await checkUrlSafety('https://example.com')
      expect(result.safe).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fail open on non-200 response', async () => {
      const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      })

      const result = await checkUrlSafety('https://example.com')
      expect(result.safe).toBe(true)
    })
  })

  describe('checkUrlsSafety (batch)', () => {
    it('should check multiple URLs and return all results', async () => {
      const { checkUrlsSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(null)
      mockFetch.mockResolvedValue(
        mockProtobufResponse([
          { url: 'bad.com/', threatTypes: [1] }, // MALWARE
        ]),
      )

      const results = await checkUrlsSafety([
        'https://good.com/',
        'https://bad.com/',
      ])
      expect(results.get('https://good.com/')?.safe).toBe(true)
      expect(results.get('https://bad.com/')?.safe).toBe(false)
      expect(results.get('https://bad.com/')?.threatTypes).toContain('MALWARE')
    })

    it('should cache results in Redis with TTL from response', async () => {
      const { checkUrlsSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(null)
      mockFetch.mockResolvedValue(mockProtobufResponse([], 600))

      await checkUrlsSafety(['https://example.com'])

      expect(redis.set).toHaveBeenCalledWith(
        'safebrowsing:url:https://example.com',
        JSON.stringify({ safe: true, threatTypes: [] }),
        'EX',
        600,
      )
    })
  })

  describe('missing API key (silent no-op guard)', () => {
    beforeEach(() => {
      delete process.env.GOOGLE_SAFE_BROWSING_API_KEY
    })

    it('should warn exactly once across three consecutive calls and never hit the network', async () => {
      const { checkUrlSafety, __resetMissingKeyWarningForTests } = await import(
        '@/shared/lib/blacklist/safe-browsing'
      )
      const { redis } = await import('@/infrastructure/cache/redis')
      __resetMissingKeyWarningForTests()

      for (const url of ['https://a.com', 'https://b.com', 'https://c.com']) {
        const result = await checkUrlSafety(url)
        expect(result.safe).toBe(true)
      }

      expect(mockFetch).not.toHaveBeenCalled()
      expect(redis.get).not.toHaveBeenCalled()
      expect(logMock.warn).toHaveBeenCalledTimes(1)
      expect(logMock.warn.mock.calls[0][0]).toContain(
        'URL blacklist checking is disabled: GOOGLE_SAFE_BROWSING_API_KEY is not set',
      )
    })
  })

  describe('fail-open paths leave a log and no cache entry', () => {
    it('should fail open on API 500 without caching the result', async () => {
      const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal error'),
      })

      const result = await checkUrlSafety('https://example.com')
      expect(result.safe).toBe(true)
      // A transient 5xx must not freeze "safe" into Redis for the cache window
      expect(redis.set).not.toHaveBeenCalled()
      expect(logMock.error).toHaveBeenCalledTimes(1)
      expect(logMock.error.mock.calls[0][0]).toMatchObject({ status: 500 })
    })

    it('should not leak the API key into the log when Google echoes it back', async () => {
      const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
      const { redis } = await import('@/infrastructure/cache/redis')

      vi.mocked(redis.get).mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad key test-api-key supplied'),
      })

      await checkUrlSafety('https://example.com')

      const logged = JSON.stringify(logMock.error.mock.calls[0][0])
      expect(logged).not.toContain('test-api-key')
      expect(logged).toContain('[redacted]')
    })

    it('should fail open when the request exceeds the 3s timeout', async () => {
      vi.useFakeTimers()
      try {
        const { checkUrlSafety } = await import('@/shared/lib/blacklist/safe-browsing')
        const { redis } = await import('@/infrastructure/cache/redis')

        vi.mocked(redis.get).mockResolvedValue(null)
        mockFetch.mockImplementation(
          (_url: string, init: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener('abort', () =>
                reject(new DOMException('The operation was aborted.', 'AbortError')),
              )
            }),
        )

        const pending = checkUrlSafety('https://slow.com')
        await vi.advanceTimersByTimeAsync(3000)
        const result = await pending

        expect(result.safe).toBe(true)
        expect(redis.set).not.toHaveBeenCalled()
        expect(logMock.error).toHaveBeenCalledTimes(1)
        expect(logMock.error.mock.calls[0][0].err).toContain('AbortError')
      } finally {
        vi.useRealTimers()
      }
    })
  })

  afterEach(() => {
    process.env.GOOGLE_SAFE_BROWSING_API_KEY = 'test-api-key'
  })
})
