import type { DeepLinkAppsConfig } from '@/shared/schemas/custom-domains'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckStatus = 'ok' | 'not_found' | 'invalid_json' | 'mismatch' | 'error' | 'timeout'

export interface CacheInfo {
  cache_control?: string
  age_seconds?: number
  /** Whether the CDN served a cached copy (true = HIT, false = MISS, undefined = unknown) */
  cdn_hit?: boolean
  /** Raw CDN cache header for display, e.g. "CF-Cache-Status: HIT" */
  cdn_cache_header?: string
}

export interface EndpointCheck {
  status: CheckStatus
  url: string
  latency_ms: number
  http_status?: number
  issues?: string[]
  cache_info?: CacheInfo
}

export interface DeepLinkVerificationResult {
  ios?: {
    /** Your origin server (what you control) */
    origin: EndpointCheck
    /** Apple's own CDN — what iOS devices actually read at install time */
    apple_cdn: EndpointCheck
  }
  android?: {
    /** Your origin server — Google fetches this at install + periodic revalidation */
    origin: EndpointCheck
  }
  checked_at: string
}

// ─── Internals ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000

interface FetchResult {
  ok: boolean
  status: number
  body: string
  latency_ms: number
  headers: Record<string, string>
}

async function fetchEndpoint(url: string): Promise<FetchResult | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const start = Date.now()

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'li2-deep-link-verifier/1.0',
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const body = await res.text()
    const latency_ms = Date.now() - start
    const headers: Record<string, string> = {}
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    return { ok: res.ok, status: res.status, body, latency_ms, headers }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return null // timeout sentinel
    return null
  } finally {
    clearTimeout(timer)
  }
}

function extractCacheInfo(headers: Record<string, string>): CacheInfo {
  const cache_control = headers['cache-control']
  const ageRaw = headers['age']
  const age_seconds = ageRaw !== undefined ? parseInt(ageRaw, 10) : undefined

  // CDN hit detection — covers Cloudflare, Akamai, Fastly, generic
  const cfCache = headers['cf-cache-status']   // Cloudflare
  const xCache = headers['x-cache']            // Akamai / generic CDNs
  const xServedBy = headers['x-served-by']     // Fastly

  let cdn_hit: boolean | undefined
  let cdn_cache_header: string | undefined

  if (cfCache) {
    cdn_hit = cfCache.toUpperCase() === 'HIT'
    cdn_cache_header = `CF-Cache-Status: ${cfCache}`
  } else if (xCache) {
    // Akamai uses "TCP_HIT" / "TCP_MISS"; generic uses "HIT" / "MISS"
    cdn_hit = xCache.toUpperCase().includes('HIT')
    cdn_cache_header = `X-Cache: ${xCache}`
  } else if (xServedBy) {
    cdn_cache_header = `X-Served-By: ${xServedBy}`
  }

  return {
    cache_control,
    age_seconds: !isNaN(age_seconds!) ? age_seconds : undefined,
    cdn_hit,
    cdn_cache_header,
  }
}

/**
 * Validate AASA JSON against the stored iOS config.
 * Handles both modern (appIDs array) and legacy (appID string) formats.
 */
function validateAasa(
  json: unknown,
  iosApp: { team_id: string; bundle_id: string }
): string[] {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return ['Response is not a JSON object']
  }

  const aasa = json as Record<string, unknown>
  if (!aasa.applinks) return ['Missing "applinks" key']

  const applinks = aasa.applinks as Record<string, unknown>
  const details = applinks.details

  if (!Array.isArray(details) || details.length === 0) {
    return ['Missing or empty "applinks.details" array']
  }

  const expectedAppId = `${iosApp.team_id}.${iosApp.bundle_id}`

  const found = (details as unknown[]).some((detail) => {
    const d = detail as Record<string, unknown>
    if (Array.isArray(d.appIDs)) return (d.appIDs as string[]).includes(expectedAppId)
    if (typeof d.appID === 'string') return d.appID === expectedAppId
    return false
  })

  if (!found) {
    return [`Expected appID "${expectedAppId}" not found in any details entry`]
  }

  return []
}

/**
 * Validate assetlinks.json against the stored Android config.
 * All configured fingerprints must be present in the live file.
 */
function validateAssetLinks(
  json: unknown,
  androidApp: { package_name: string; sha256_fingerprints: string[] }
): string[] {
  if (!Array.isArray(json)) return ['Response is not a JSON array']

  const matchingEntry = (json as unknown[]).find((entry) => {
    const target = (entry as Record<string, unknown>)?.target as Record<string, unknown>
    return (
      target?.namespace === 'android_app' &&
      target?.package_name === androidApp.package_name
    )
  })

  if (!matchingEntry) {
    return [`No entry found for package "${androidApp.package_name}"  — check that the relation is "delegate_permission/common.handle_all_urls"`]
  }

  const target = (matchingEntry as Record<string, unknown>).target as Record<string, unknown>
  const liveFps = ((target.sha256_cert_fingerprints as string[]) ?? []).map((f) =>
    f.toUpperCase()
  )

  const missing = androidApp.sha256_fingerprints.filter(
    (fp) => !liveFps.includes(fp.toUpperCase())
  )

  if (missing.length > 0) {
    return [
      `${missing.length} fingerprint(s) missing from live file: ${missing.map((f) => f.slice(0, 11) + '…').join(', ')}`,
    ]
  }

  return []
}

async function checkEndpoint(
  url: string,
  validate: (json: unknown) => string[]
): Promise<EndpointCheck> {
  const result = await fetchEndpoint(url)

  if (result === null) {
    return { status: 'timeout', url, latency_ms: FETCH_TIMEOUT_MS }
  }

  const cache_info = extractCacheInfo(result.headers)

  if (result.status === 404) {
    return { status: 'not_found', url, latency_ms: result.latency_ms, http_status: 404, cache_info }
  }

  if (!result.ok) {
    return {
      status: 'error',
      url,
      latency_ms: result.latency_ms,
      http_status: result.status,
      issues: [`HTTP ${result.status}`],
      cache_info,
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(result.body)
  } catch {
    return {
      status: 'invalid_json',
      url,
      latency_ms: result.latency_ms,
      http_status: result.status,
      issues: ['Response is not valid JSON'],
      cache_info,
    }
  }

  const issues = validate(parsed)
  return {
    status: issues.length === 0 ? 'ok' : 'mismatch',
    url,
    latency_ms: result.latency_ms,
    http_status: result.status,
    issues: issues.length > 0 ? issues : undefined,
    cache_info,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

class DeepLinkVerificationService {
  async verify(domainName: string, config: DeepLinkAppsConfig): Promise<DeepLinkVerificationResult> {
    const iosApp = config.apps.find((a) => a.platform === 'ios') as
      | { platform: 'ios'; team_id: string; bundle_id: string }
      | undefined
    const androidApp = config.apps.find((a) => a.platform === 'android') as
      | { platform: 'android'; package_name: string; sha256_fingerprints: string[] }
      | undefined

    const checks: Promise<void>[] = []
    const result: DeepLinkVerificationResult = { checked_at: new Date().toISOString() }

    if (iosApp) {
      const originUrl = `https://${domainName}/.well-known/apple-app-site-association`
      const appleCdnUrl = `https://app-site-association.cdn-apple.com/a/v1/${domainName}`
      const validate = (json: unknown) => validateAasa(json, iosApp)

      checks.push(
        Promise.all([checkEndpoint(originUrl, validate), checkEndpoint(appleCdnUrl, validate)]).then(
          ([origin, apple_cdn]) => {
            result.ios = { origin, apple_cdn }
          }
        )
      )
    }

    if (androidApp) {
      const originUrl = `https://${domainName}/.well-known/assetlinks.json`
      const validate = (json: unknown) => validateAssetLinks(json, androidApp)

      checks.push(
        checkEndpoint(originUrl, validate).then((origin) => {
          result.android = { origin }
        })
      )
    }

    await Promise.all(checks)
    return result
  }
}

export const deepLinkVerificationService =
  (globalThis as unknown as { _deepLinkVerificationService?: DeepLinkVerificationService })
    ._deepLinkVerificationService ?? new DeepLinkVerificationService()

if (process.env.NODE_ENV !== 'production') {
  (globalThis as unknown as { _deepLinkVerificationService: DeepLinkVerificationService })
    ._deepLinkVerificationService = deepLinkVerificationService
}
