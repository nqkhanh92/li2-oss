import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import {
  AppError,
  BadRequestError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { parseDeepLinkConfig } from '@/shared/schemas/custom-domains'

interface PlatformCheck {
  ok: boolean
  error?: string
  url: string
}

interface VerifyResult {
  ios: PlatformCheck | null
  android: PlatformCheck | null
}

// 5 second timeout per fetch — don't block the user if the domain is unreachable.
// Apple/Google real fetchers will retry on their own schedule, so this check is
// informational only: we just need a signal within a few seconds for the UI.
const FETCH_TIMEOUT_MS = 5000

// 64 KiB is ~128x larger than any realistic AASA or assetlinks.json file.
// Bounding the body read prevents a malicious (or compromised) domain from
// streaming gigabytes into memory — the abort timeout only fires on header
// latency, not body-read duration, so we can't rely on it alone.
const MAX_BODY_BYTES = 64 * 1024

/**
 * Read a Response body with a hard byte cap. Throws if the body exceeds
 * `MAX_BODY_BYTES` before EOF. Uses the streaming reader so we reject early
 * instead of buffering the whole payload first.
 */
async function readBoundedText(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        total += value.length
        if (total > MAX_BODY_BYTES) {
          throw new Error(`Response body exceeds ${MAX_BODY_BYTES} byte limit`)
        }
        chunks.push(value)
      }
    }
  } finally {
    // Release the lock even if we threw — otherwise the reader leaks.
    reader.releaseLock()
  }
  // Concatenate chunks. For the small expected sizes this is simpler than
  // streaming decode.
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(merged)
}

/**
 * Fetch a deep-link well-known file and pass the parsed JSON body to a platform-specific
 * validator. Centralises the shared scaffolding (URL construction, abort-based timeout,
 * HTTP status check, bounded body read + JSON parse, error normalization) so `checkIos`
 * / `checkAndroid` only need to express what a valid response body looks like.
 *
 * Hardening notes:
 * - `redirect: 'error'` prevents SSRF amplification via a malicious redirect chain
 *   (Apple/Google never redirect `.well-known/` files in practice).
 * - `readBoundedText` caps the body read at 64 KiB so a slow-drip oversized response
 *   can't OOM the process even if headers arrive fast enough to dodge the 5s timeout.
 *
 * The validator returns `null` on success or an error message string on failure.
 */
async function probeWellKnown(
  url: string,
  validate: (body: unknown) => string | null
): Promise<PlatformCheck> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      // Reject any redirect — legitimate AASA/assetlinks files never redirect,
      // and following them would let a malicious domain probe internal networks.
      redirect: 'error',
      // Distinguish verify probes from real Apple/Google fetches in nginx access logs.
      headers: { 'User-Agent': 'li2-deep-link-verify/1.0' },
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} from ${url}`, url }
    }
    let body: unknown
    try {
      const text = await readBoundedText(res)
      body = JSON.parse(text)
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : 'Invalid JSON response'
      return { ok: false, error: msg, url }
    }
    const validationError = validate(body)
    if (validationError) {
      return { ok: false, error: validationError, url }
    }
    return { ok: true, url }
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : ''
    const message = err instanceof Error ? err.message : 'Fetch failed'
    return { ok: false, error: name === 'AbortError' ? 'Timeout (5s)' : message, url }
  } finally {
    clearTimeout(timeoutId)
  }
}

function checkIos(domain: string, expectedAppCount: number): Promise<PlatformCheck> {
  const url = `https://${domain}/.well-known/apple-app-site-association`
  return probeWellKnown(url, (body) => {
    const details = (body as { applinks?: { details?: unknown } })?.applinks?.details
    if (!Array.isArray(details) || details.length === 0) {
      return 'Response does not contain applinks.details array'
    }
    if (details.length < expectedAppCount) {
      return `Expected ${expectedAppCount} iOS app(s), got ${details.length}`
    }
    return null
  })
}

function checkAndroid(domain: string, expectedAppCount: number): Promise<PlatformCheck> {
  const url = `https://${domain}/.well-known/assetlinks.json`
  return probeWellKnown(url, (body) => {
    if (!Array.isArray(body) || body.length === 0) {
      return 'Response is not a non-empty statement array'
    }
    if (body.length < expectedAppCount) {
      return `Expected ${expectedAppCount} Android app(s), got ${body.length}`
    }
    for (const stmt of body as Array<{
      target?: { package_name?: unknown; sha256_cert_fingerprints?: unknown }
    }>) {
      if (
        !stmt?.target?.package_name ||
        !Array.isArray(stmt?.target?.sha256_cert_fingerprints)
      ) {
        return 'Statement missing target.package_name or fingerprints'
      }
    }
    return null
  })
}

export const GET = withAuth<{ org_id: string; domain_id: string }>(
  async (_request: NextRequest, { params }) => {
    try {
      await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)

      const supabase = await createServiceClient()
      const { data: domain, error: fetchError } = await supabase
        .from('domains')
        .select('id, domain, is_verified, is_subdomain_claimed, deep_link_apps, organization_id')
        .eq('id', params.domain_id)
        .single()

      if (fetchError || !domain) {
        throw new NotFoundError('Domain not found', {
          key: 'common:messages.error.not_found',
        })
      }

      // Defence in depth: ensurePolicy already validates org membership, but
      // confirm the domain row actually belongs to the requesting org so
      // cross-tenant probes return 404 (not a leak of "exists but forbidden").
      if (domain.organization_id !== params.org_id) {
        throw new NotFoundError('Domain not found', {
          key: 'common:messages.error.not_found',
        })
      }

      if (!domain.is_verified) {
        throw new BadRequestError('Domain is not verified', {
          key: 'domain:deepLink.errors.domain_not_verified',
        })
      }

      if (domain.is_subdomain_claimed) {
        throw new BadRequestError('Deep links are not available on claimed subdomains', {
          key: 'domain:deepLink.errors.subdomain_not_eligible',
        })
      }

      const config = parseDeepLinkConfig(domain.deep_link_apps)
      if (!config?.enabled || config.apps.length === 0) {
        throw new BadRequestError('Deep link configuration is not enabled', {
          key: 'domain:deepLink.errors.not_configured',
        })
      }

      const iosAppCount = config.apps.filter((a) => a.platform === 'ios').length
      const androidAppCount = config.apps.filter((a) => a.platform === 'android').length

      const [iosResult, androidResult] = await Promise.all([
        iosAppCount > 0 ? checkIos(domain.domain, iosAppCount) : Promise.resolve(null),
        androidAppCount > 0
          ? checkAndroid(domain.domain, androidAppCount)
          : Promise.resolve(null),
      ])

      const result: VerifyResult = { ios: iosResult, android: androidResult }

      return APIResponse.ok({ data: result })
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return new BadRequestError(error.message, {
          key: 'common:messages.error.validation_failed',
        }).toResponse()
      }
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
