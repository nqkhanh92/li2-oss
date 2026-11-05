import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { casdoorConfig } from '@/shared/lib/casdoor'
import { setGlobalCookie } from '@/app/actions/auth'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { logger } from '@/infrastructure/logging/logger'

const DEMO_SESSION_TTL = 7200 // 2 hours

const log = logger.child({ module: 'api/public/demo' })

/**
 * GET /api/public/demo
 * Swaps any visitor into the demo account and redirects to the app.
 *
 * - Logged-in user: original tokens are saved to Redis so exitDemoMode
 *   can restore them, identical to the enterDemoMode server action.
 * - Unauthenticated user: no tokens to save; exitDemoMode finds no Redis
 *   entry and calls logout() — correct for a user with no prior account.
 */
export async function GET(request: NextRequest) {
  const email = process.env.DEMO_ACCOUNT_EMAIL
  const password = process.env.DEMO_ACCOUNT_PASSWORD

  log.info({ ip: request.headers.get('x-forwarded-for') ?? 'unknown' }, 'Demo entry requested')

  if (process.env.NEXT_PUBLIC_DEMO_ENABLED !== 'true' || !email || !password) {
    log.warn('Demo mode is disabled or credentials are missing')
    return NextResponse.redirect(
      new URL('/auth/login?error=demo_unavailable', process.env.NEXT_PUBLIC_APP_BASE_URL)
    )
  }

  try {
    const tokenRes = await fetch(`${casdoorConfig.endpoint}/api/login/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        client_id: casdoorConfig.clientId,
        client_secret: casdoorConfig.clientSecret,
        username: email,
        password,
        scope: 'openid',
      }),
    })

    const data = await tokenRes.json()
    if (!data.access_token || !data.refresh_token) {
      log.error({ status: tokenRes.status }, 'Casdoor token exchange failed for demo account')
      return NextResponse.redirect(
        new URL('/auth/login?error=demo_unavailable', process.env.NEXT_PUBLIC_APP_BASE_URL)
      )
    }

    const cookieStore = await cookies()

    // If the visitor is already logged in, preserve their tokens so exitDemoMode
    // can restore them (same behaviour as the enterDemoMode server action).
    const originalAccessToken = cookieStore.get('casdoor_access_token')?.value
    const originalRefreshToken = cookieStore.get('casdoor_refresh_token')?.value

    const sessionId = crypto.randomUUID()
    const isAuthenticatedUser = !!(originalAccessToken && originalRefreshToken)

    if (isAuthenticatedUser) {
      await redis.set(
        REDIS_KEYS.DEMO.SESSION(sessionId),
        JSON.stringify({ access_token: originalAccessToken, refresh_token: originalRefreshToken }),
        'EX',
        DEMO_SESSION_TTL
      )
      log.info({ sessionId }, 'Authenticated user entering demo — original tokens preserved in Redis')
    } else {
      log.info({ sessionId }, 'Anonymous user entering demo — no tokens to preserve')
    }

    const demoExpires = new Date(Date.now() + DEMO_SESSION_TTL * 1000)
    await setGlobalCookie('casdoor_access_token', data.access_token, { expires: demoExpires })
    await setGlobalCookie('casdoor_refresh_token', data.refresh_token, { expires: demoExpires })

    cookieStore.set('demo_session_id', sessionId, {
      sameSite: 'lax',
      path: '/',
      maxAge: DEMO_SESSION_TTL,
    })

    const redirectTo = request.nextUrl.searchParams.get('redirect_to')

    /*
    Vuln 1: Open Redirect: src/app/api/public/demo/route.ts:90-96

    - Severity: Medium
    - Category: open_redirect
    - Description: The public, unauthenticated demo entry route reads a user-controlled redirect_to query parameter and guards it with a same-origin check that only tests startsWith('/') && !startsWith('//'). This guard does not account for backslashes. A payload such as /\evil.com passes the guard (second character is \, not /), and new URL('/\evil.com', 'https://app.li2.ai') resolves off-origin to https://evil.com/ because the WHATWG URL spec treats backslash as a path separator for special (http/https) schemes, parsing /\evil.com as the protocol-relative //evil.com. The resolved off-origin URL is then emitted directly in a 307 Location header via NextResponse.redirect. Next.js middleware does not run on this route (the matcher excludes api), and no CSP mitigates it.
    - Exploit Scenario: An attacker distributes a link like https://app.li2.ai/api/public/demo?redirect_to=/\evil.com. A victim clicking it lands on the genuine app.li2.ai origin, where the handler establishes real session cookies (casdoor_access_token, casdoor_refresh_token, demo_session_id), and is then immediately 307-redirected to https://evil.com/. Because the victim was just on the real, trusted domain and had a session created there, this is a trust-transfer/phishing amplification: the attacker's landing page inherits credibility from the legitimate app.li2.ai link, increasing the success rate of credential-harvesting or malware phishing. (Requires demo mode enabled via NEXT_PUBLIC_DEMO_ENABLED.)
    - Recommendation: Reject backslashes in the guard and/or re-verify the resolved origin. Minimal fix at route.ts:90-93:
    const isSafeRelativePath = (path: string | null): path is string =>
      !!path && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
    const safePath = isSafeRelativePath(redirectTo) ? redirectTo : '/'
    - More robustly, build const target = new URL(safePath, base) and assert target.origin === new URL(process.env.NEXT_PUBLIC_APP_BASE_URL!).origin before redirecting, falling back to / otherwise — this closes the entire class of encoding-based bypasses.
    */
    const safePath =
      redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : '/'

    log.info({ sessionId, isAuthenticatedUser, safePath }, 'Demo session created, redirecting to app')
    return NextResponse.redirect(new URL(safePath, process.env.NEXT_PUBLIC_APP_BASE_URL))
  } catch (err) {
    log.error({ err }, 'Unexpected error during demo entry')
    return NextResponse.redirect(
      new URL('/auth/login?error=demo_unavailable', process.env.NEXT_PUBLIC_APP_BASE_URL)
    )
  }
}
