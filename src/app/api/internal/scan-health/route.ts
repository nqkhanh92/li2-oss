import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { readClamavConfig } from '@/infrastructure/scan/config'
import { ping, version } from '@/infrastructure/scan/clamav-client'

/**
 * `GET /api/internal/scan-health` — is clamd reachable from INSIDE the app container?
 *
 * WHY IT EXISTS. The scan gate is fail-closed (spec §2.5): if clamd is down and `CLAMAV_ENABLED` is
 * on, every upload is refused. Without this route the first report of that is a customer. It also
 * answers the one question `docker compose ps` cannot: `li2-app` and `lihi-clamav` have to meet on
 * the `lihi-internal` network, and a healthy container on the wrong network looks fine from the host.
 *
 * It is also the gate in the ENABLE ORDER (§6.2): bring the container up, wait for `healthy`, call
 * this, and only then set `CLAMAV_ENABLED=true`. Setting the flag first means refusing every upload
 * until the ~1 GB signature database finishes loading.
 *
 * NOT a Next.js `/api/health` sibling: that one is public and says which build is running. This one
 * reaches a dependency, so it is authenticated and must never be cached.
 */
export const dynamic = 'force-dynamic'

const SECRET_HEADER = 'x-internal-secret'

/**
 * Constant-time, and length-aware. `timingSafeEqual` throws on a length mismatch, so the length
 * check has to come first — which does leak the secret's length, the one property that is not worth
 * a branchy hand-rolled comparison to hide.
 */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.byteLength !== b.byteLength) return false
  return timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  const expected = process.env.INTERNAL_API_SECRET

  /**
   * No secret configured → 503, not "open". An internal probe that answers to anyone once the
   * variable is missing is a probe that reports our infrastructure to the internet the first time an
   * env file is deployed incomplete.
   */
  if (!expected)
    return NextResponse.json(
      { error: 'INTERNAL_API_SECRET is not configured' },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    )

  if (!secretMatches(request.headers.get(SECRET_HEADER), expected))
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: { 'cache-control': 'no-store' } }
    )

  const headers = { 'cache-control': 'no-store' }

  let config
  try {
    config = readClamavConfig()
  } catch (error) {
    // A `ClamavConfigError` names the variable that is wrong. That message is the entire value of
    // this call in that state, and it is behind the secret, so it is safe to return verbatim.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'invalid ClamAV configuration' },
      { status: 500, headers }
    )
  }

  if (!config.enabled)
    return NextResponse.json(
      { enabled: false, reachable: false, version: null, latencyMs: null },
      { headers }
    )

  const startedAt = Date.now()
  const reachable = await ping()
  const latencyMs = Date.now() - startedAt

  // VERSION only when PING already worked: on an unreachable clamd the second call would just pay
  // the timeout a second time, doubling how long an operator waits for a "no".
  const engineVersion = reachable ? await version() : null

  return NextResponse.json(
    { enabled: true, reachable, version: engineVersion, latencyMs },
    { headers }
  )
}
