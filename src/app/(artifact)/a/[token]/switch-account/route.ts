import { NextRequest, NextResponse } from 'next/server'
import { logout } from '@/app/actions/auth'
import { SERVE_TOKEN_PATTERN } from '@/core/helpers/serve-token'
import { ARTIFACT_COMMON_HEADERS } from '@/core/helpers/artifact-csp'

/**
 * `POST /a/<token>/switch-account` — the button on the 403 page (spec R7).
 *
 * The app has NEVER logged a user out of Casdoor: `logout()` clears the app's cookies and nothing
 * else. Doing only that here and bouncing to `/auth/login` would send the visitor straight back to
 * Casdoor, which still holds its own session and would sign them in as the SAME account — the one
 * that was just refused. So the redirect goes to Casdoor's `/api/logout`, with a
 * `post_logout_redirect_uri` that lands on our login page carrying `redirect_to=/a/<token>`.
 *
 * Two layers of encoding, on purpose: `redirect_to` is a query of `/auth/login`, which is itself the
 * value of `post_logout_redirect_uri`. `searchParams.set` encodes once per layer; Casdoor decodes one,
 * `/auth/login` decodes the other (the same lesson as `server-utils.ts`).
 *
 * `id_token_hint` IS sent, and it is the `casdoor_access_token` cookie read BEFORE `logout()` wipes
 * it. Measured on LiHi 2026-10-06: its Casdoor build (source at ~/lihi/casdoor/src, image of
 * 2026-07-29) answers `{"status":"error","msg":"Missing parameter: id_token_hint"}` to any
 * `/api/logout` that carries `post_logout_redirect_uri` without a hint — upstream only relaxed this
 * later. In that build the hint is read straight into a variable named `accessToken` and resolved
 * with `ExpireTokenByAccessToken`, so the app's access token is exactly what it expects; it also
 * expires that token server-side, which is the point of signing out. `client_id` stays so a newer
 * Casdoor can still find the application when the session is already gone.
 *
 * No cookie (session already dead) → skip Casdoor and go straight to our login page: there is
 * nothing to sign out of, and Casdoor would only answer with the JSON error above.
 *
 * ⚠ OPERATIONS: Casdoor refuses a `post_logout_redirect_uri` that is not in the application's
 * Redirect URLs. `<APP_BASE_URL>/auth/login` must be added there (prod AND dev) or the visitor sees
 * Casdoor's JSON error instead of a login form. Acceptance A14 measures exactly this.
 *
 * POST only. The action has a side effect (cookies are deleted), so it must not be reachable by a
 * link, an image or a prefetch. The token is checked against the pattern but NOT looked up: whether
 * the artifact exists is irrelevant to signing out, and a lookup would be one more database read on
 * an unauthenticated path.
 */
export async function POST(_request: NextRequest, { params }: { params: { token: string } }) {
  if (!SERVE_TOKEN_PATTERN.test(params.token))
    return new NextResponse('Not found', { status: 404, headers: ARTIFACT_COMMON_HEADERS })

  const appBase = process.env.NEXT_PUBLIC_APP_BASE_URL
  const casdoorBase = process.env.NEXT_PUBLIC_CASDOOR_APP_URL
  const clientId = process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID
  if (!appBase || !casdoorBase || !clientId)
    return new NextResponse(null, { status: 503, headers: ARTIFACT_COMMON_HEADERS })

  // Read before logout(): that call deletes this very cookie.
  const casdoorAccessToken = _request.cookies.get('casdoor_access_token')?.value

  // Clears casdoor_access_token / casdoor_refresh_token (with the prod `domain=.<root>`), the
  // supabase token and the demo cookie — the same function the logout endpoint uses. `redirect_to:
  // null` because the redirect below is ours, not `next/navigation`'s.
  await logout({ redirect_to: null })

  const backToLogin = new URL('/auth/login', appBase)
  backToLogin.searchParams.set('redirect_to', `/a/${params.token}`)

  if (!casdoorAccessToken) {
    return new NextResponse(null, {
      status: 303,
      headers: { ...ARTIFACT_COMMON_HEADERS, Location: backToLogin.toString() },
    })
  }

  const casdoorLogout = new URL('/api/logout', casdoorBase)
  casdoorLogout.searchParams.set('id_token_hint', casdoorAccessToken)
  casdoorLogout.searchParams.set('post_logout_redirect_uri', backToLogin.toString())
  casdoorLogout.searchParams.set('client_id', clientId)

  return new NextResponse(null, {
    status: 303,
    headers: { ...ARTIFACT_COMMON_HEADERS, Location: casdoorLogout.toString() },
  })
}

export const dynamic = 'force-dynamic'
