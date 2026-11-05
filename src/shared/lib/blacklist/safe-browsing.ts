import 'server-only'
import { redis } from '@/infrastructure/cache/redis'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'safe-browsing' })

const CACHE_PREFIX = 'safebrowsing:url:'
const API_BASE = 'https://safebrowsing.googleapis.com/v5'
const REQUEST_TIMEOUT_MS = 3000
const MAX_URLS_PER_REQUEST = 50

export type SafetyResult = {
  safe: boolean
  threatTypes: string[]
}

// Parsed from protobuf SearchUrlsResponse
type ParsedResponse = {
  threats: Array<{
    url: string
    threatTypes: string[]
  }>
  cacheDurationSeconds: number
}

// ThreatType enum values from google.security.safebrowsing.v5
const THREAT_TYPE_NAMES: Record<number, string> = {
  0: 'THREAT_TYPE_UNSPECIFIED',
  1: 'MALWARE',
  2: 'SOCIAL_ENGINEERING',
  3: 'UNWANTED_SOFTWARE',
  4: 'POTENTIALLY_HARMFUL_APPLICATION',
}

// ── Minimal protobuf decoder for SearchUrlsResponse ──
// The v5 urls.search endpoint only returns protobuf (no JSON option).
// Schema (from google.security.safebrowsing.v5):
//   SearchUrlsResponse { repeated ThreatUrl threats = 1; Duration cache_duration = 2; }
//   ThreatUrl { string url = 1; repeated ThreatType threat_types = 2; }
//   ThreatType enum: 0=UNSPECIFIED, 1=MALWARE, 2=SOCIAL_ENGINEERING, 3=UNWANTED_SOFTWARE, 4=PHA

function readVarint(buf: Uint8Array, offset: number): [number, number] {
  let result = 0
  let shift = 0
  let pos = offset
  while (pos < buf.length) {
    const byte = buf[pos]
    result |= (byte & 0x7f) << shift
    pos++
    if ((byte & 0x80) === 0) break
    shift += 7
  }
  return [result, pos]
}

function decodeThreatUrl(buf: Uint8Array): { url: string; threatTypes: string[] } {
  let offset = 0
  let url = ''
  const threatTypes: string[] = []

  while (offset < buf.length) {
    const [tag, newOffset] = readVarint(buf, offset)
    offset = newOffset
    const fieldNumber = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 2) {
      // length-delimited
      const [length, dataOffset] = readVarint(buf, offset)
      offset = dataOffset
      const data = buf.slice(offset, offset + length)
      offset += length

      if (fieldNumber === 1) {
        url = new TextDecoder().decode(data)
      } else if (fieldNumber === 2) {
        // packed repeated enum
        let enumOffset = 0
        while (enumOffset < data.length) {
          const [enumVal, nextOffset] = readVarint(data, enumOffset)
          enumOffset = nextOffset
          const name = THREAT_TYPE_NAMES[enumVal] ?? `UNKNOWN_${enumVal}`
          if (!threatTypes.includes(name)) threatTypes.push(name)
        }
      }
    } else if (wireType === 0) {
      // varint
      const [value, nextOffset] = readVarint(buf, offset)
      offset = nextOffset

      if (fieldNumber === 2) {
        // non-packed repeated enum (one varint per entry)
        const name = THREAT_TYPE_NAMES[value] ?? `UNKNOWN_${value}`
        if (!threatTypes.includes(name)) threatTypes.push(name)
      }
    }
  }

  return { url, threatTypes }
}

function decodeDuration(buf: Uint8Array): number {
  let offset = 0
  let seconds = 0
  while (offset < buf.length) {
    const [tag, newOffset] = readVarint(buf, offset)
    offset = newOffset
    const fieldNumber = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 0) {
      const [value, nextOffset] = readVarint(buf, offset)
      offset = nextOffset
      if (fieldNumber === 1) seconds = value
    } else if (wireType === 2) {
      const [length, dataOffset] = readVarint(buf, offset)
      offset = dataOffset + length
    }
  }
  return seconds
}

function decodeSearchUrlsResponse(buf: Uint8Array): ParsedResponse {
  let offset = 0
  const threats: ParsedResponse['threats'] = []
  let cacheDurationSeconds = 300

  while (offset < buf.length) {
    const [tag, newOffset] = readVarint(buf, offset)
    offset = newOffset
    const fieldNumber = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 2) {
      const [length, dataOffset] = readVarint(buf, offset)
      offset = dataOffset
      const data = buf.slice(offset, offset + length)
      offset += length

      if (fieldNumber === 1) {
        threats.push(decodeThreatUrl(data))
      } else if (fieldNumber === 2) {
        cacheDurationSeconds = decodeDuration(data) || 300
      }
    } else if (wireType === 0) {
      const [, nextOffset] = readVarint(buf, offset)
      offset = nextOffset
    }
  }

  return { threats, cacheDurationSeconds }
}

// ── Public API ──

function cacheKey(url: string): string {
  return `${CACHE_PREFIX}${url}`
}

// The API key travels as a query parameter, so it can surface in a fetch error message or in an
// error body echoed back by Google. Strip it before anything reaches the logs.
function redactKey(text: string, apiKey: string): string {
  if (!apiKey) return text
  return text.split(apiKey).join('[redacted]')
}

// Warn once per process, not once per request: a request-scoped warning would be drowned out, and
// total silence is how this layer stayed dead for months without anyone noticing.
let missingKeyWarned = false

function warnMissingKeyOnce(): void {
  if (missingKeyWarned) return
  missingKeyWarned = true
  log.warn(
    'URL blacklist checking is disabled: GOOGLE_SAFE_BROWSING_API_KEY is not set. Destination URLs are not checked against Google Safe Browsing.'
  )
}

// Test seam only: the warning is once-per-process, so tests that assert it need to clear the flag.
export function __resetMissingKeyWarningForTests(): void {
  missingKeyWarned = false
}

export async function checkUrlSafety(url: string): Promise<SafetyResult> {
  const results = await checkUrlsSafety([url])
  return results.get(url) ?? { safe: true, threatTypes: [] }
}

/**
 * Batch-check URLs against Google Safe Browsing v5 urls.search endpoint.
 *
 * Flow:
 * 1. Check Redis cache for each URL
 * 2. Send uncached URLs to Google (max 50 per request)
 * 3. Decode protobuf response
 * 4. Cache results with TTL from Google's cache_duration
 *
 * Fail-open: returns safe=true on any error (API down, timeout, missing key).
 *
 * WHY FAIL-OPEN HERE (and fail-closed for the ClamAV upload scan — the difference is deliberate):
 * what this checks is a destination URL typed by a customer, not content li2 will serve. If Google's
 * API goes down — outside our control — and we failed closed, every short link creation would stop:
 * one incident at Google becomes an incident at li2. And this is only one of three layers (admin
 * regex blacklist + domain bloom filter + Safe Browsing), guarding content li2 does not host. The
 * ClamAV scan is the opposite case: failing closed blocks a single upload, and that content would
 * end up served from li2's own domain.
 *
 * DO NOT extend this to artifact `serve_url`: that URL is generated by li2 and points back at li2,
 * so checking it against Safe Browsing asks Google about ourselves.
 */
export async function checkUrlsSafety(urls: string[]): Promise<Map<string, SafetyResult>> {
  const results = new Map<string, SafetyResult>()
  const uncachedUrls: string[] = []

  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY
  if (!apiKey) {
    // No API key — fail open, but say so once so the dead layer is visible in the logs
    warnMissingKeyOnce()
    for (const url of urls) {
      results.set(url, { safe: true, threatTypes: [] })
    }
    return results
  }

  // Step 1: Check Redis cache
  for (const url of urls) {
    try {
      const cached = await redis.get(cacheKey(url))
      if (cached) {
        results.set(url, JSON.parse(cached))
      } else {
        uncachedUrls.push(url)
      }
    } catch {
      uncachedUrls.push(url)
    }
  }

  if (uncachedUrls.length === 0) return results

  // Step 2: Call Google Safe Browsing v5 API
  try {
    for (let i = 0; i < uncachedUrls.length; i += MAX_URLS_PER_REQUEST) {
      const batch = uncachedUrls.slice(i, i + MAX_URLS_PER_REQUEST)
      const params = new URLSearchParams()
      for (const url of batch) {
        params.append('urls', url)
      }
      params.append('key', apiKey)

      // Call v5 API

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const response = await fetch(`${API_BASE}/urls:search?${params.toString()}`, {
        method: 'GET',
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'could not read body')
        // Fail open without caching: a transient 5xx must not freeze "safe" into Redis for 5 minutes
        log.error(
          { status: response.status, body: redactKey(errorBody, apiKey), urlCount: batch.length },
          'Safe Browsing API returned an error — failing open'
        )
        for (const url of batch) {
          results.set(url, { safe: true, threatTypes: [] })
        }
        continue
      }

      // Step 3: Decode protobuf response
      const arrayBuffer = await response.arrayBuffer()
      const buf = new Uint8Array(arrayBuffer)

      // Empty response (no threats) = all safe
      if (buf.length === 0) {
        for (const url of batch) {
          results.set(url, { safe: true, threatTypes: [] })
          try {
            await redis.set(cacheKey(url), JSON.stringify({ safe: true, threatTypes: [] }), 'EX', 300)
          } catch { /* non-fatal */ }
        }
        continue
      }

      const data = decodeSearchUrlsResponse(buf)

      // Build threat lookup — Google may strip the scheme from response URLs,
      // so we normalize both sides by removing https:// or http:// for matching
      const stripScheme = (u: string) => u.replace(/^https?:\/\//, '')
      const threatMap = new Map<string, string[]>()
      for (const threat of data.threats) {
        threatMap.set(stripScheme(threat.url), threat.threatTypes)
      }

      // Step 4: Cache results
      const cacheTtl = data.cacheDurationSeconds || 300
      for (const url of batch) {
        const threatTypes = threatMap.get(stripScheme(url)) ?? []
        const result: SafetyResult = {
          safe: threatTypes.length === 0,
          threatTypes,
        }
        results.set(url, result)

        try {
          await redis.set(cacheKey(url), JSON.stringify(result), 'EX', cacheTtl)
        } catch {
          // Cache write failure is non-fatal
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    log.error(
      { err: redactKey(message, apiKey), urlCount: uncachedUrls.length },
      'Safe Browsing request failed — failing open'
    )
    for (const url of uncachedUrls) {
      if (!results.has(url)) {
        results.set(url, { safe: true, threatTypes: [] })
      }
    }
  }

  return results
}
