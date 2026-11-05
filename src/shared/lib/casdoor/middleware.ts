export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { orgHomePath, protectedDefaultPath } from '@/shared/constants'
import { getSession, refreshAccessToken } from '../auth/session'
import { setCasdoorToken } from '@/app/actions/auth'
import { validate } from 'uuid'
// import { getOrganizationSlugById } from '@/app/actions/organization'

const authPath = ['auth/login', 'auth/register', 'auth/callback']

/**
 * Exported so a test can hold the list without booting the middleware itself (the real function
 * resolves a Casdoor session). It is read-only by convention — nothing outside this file writes it.
 */
export const publicPath = [
  'auth/login',
  'auth/register',
  'auth/callback',
  'auth/sso/canny',
  '/contact',
  '/invitation',
  '/pricing',
  '/subscriptions',
  /**
   * ⭐ P0.5 — the legal pages. `op_policy_uri` and `op_tos_uri` in
   * `.well-known/oauth-authorization-server` point here, and both a connector directory and a
   * consent screen fetch them with no session at all: behind a login they would answer a redirect
   * to `/auth/login`, which reads as "this product has no policy".
   *
   * `/support` is here for the same reason: `supportURL` in `plugin/chatgpt/plugin.json` points at
   * it and OpenAI's metadata check fetches it with no session.
   *
   * ⚠️ Matched by `request.url.includes(path)` over the WHOLE url, so these three entries are as
   * long as they can be made. Short entries are what makes this list dangerous — see the `/a/`
   * warning in `middleware.ts`.
   */
  '/privacy',
  '/terms',
  '/support',
]
const blockedPath = ['/pricing', '/payment']
/**
 * Paths whose ORIGINAL URL must survive the trip through login.
 *
 * `/mcp/consent` is here because it is the one page in the app whose query string IS the request:
 * strip `client_id`, `redirect_uri`, `code_challenge` and `state` and the user comes back to a
 * consent screen that cannot say which client is asking or issue a code anyone can redeem. Every
 * other protected page is still meaningful at its bare path, which is why the list is short.
 */
const saveRedirectPath = ['/invitation', '/mcp/consent']

export const casdoor_middleware = async (request: NextRequest): Promise<Response> => {
  const response = await _casdoor_middleware(request)
  if (
    !request.cookies.get('i18next') &&
    request.headers.get('cf-ipcountry') === 'VN' &&
    response instanceof NextResponse
  ) {
    response.cookies.set('i18next', 'vi', {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'none',
      secure: true,
    })
  }
  return response
}

const _casdoor_middleware = async (request: NextRequest): Promise<Response> => {
  const pathname = request.nextUrl.pathname

  /* Check blocked path, if user try to access to blocked path, we redirect they to home */
  if (blockedPath.some((path) => request.url.includes(path))) {
    console.log(JSON.stringify({ level: 'info', module: 'middleware', msg: 'Blocked path redirect', pathname }))
    return NextResponse.redirect(new URL('/', request.url))
  }

  /* Check user session */
  const valid = await getSession(request)

  /**
   * Try to refresh access token if it is not valid
   */
  if (!valid) {
    const refresh_token = request.cookies.get('casdoor_refresh_token')?.value
    if (refresh_token) {
      console.log(JSON.stringify({ level: 'info', module: 'middleware', msg: 'Access token invalid — attempting refresh', pathname }))
      const result = await refreshAccessToken(refresh_token)
      if (result) {
        const { access_token, refresh_token: new_refresh_token } = result
        const cookieResponse = NextResponse.redirect(request.url)
        await setCasdoorToken(access_token, new_refresh_token, cookieResponse)
        console.log(JSON.stringify({ level: 'info', module: 'middleware', msg: 'Token refreshed successfully', pathname }))
        return cookieResponse
      }
      console.log(JSON.stringify({ level: 'warn', module: 'middleware', msg: 'Token refresh failed', pathname }))
    }
  }

  /**
   * Home page handler
   * If User, redirect to default protected path
   * If Guest, let them access
   */
  if (pathname === '/') {
    if (valid) {
      console.log(JSON.stringify({ level: 'info', module: 'middleware', msg: 'Authenticated user at / — redirecting to app', pathname }))
      return NextResponse.redirect(new URL(protectedDefaultPath, request.url))
    } else {
      return NextResponse.next()
    }
  }

  /**
   * Public path handler
   * If User & try to access auth/login, redirect to protected default path
   * If Guest & try to access auth/login, let them access
   * Allow all to other public path
   */
  if (publicPath.some((path) => request.url.includes(path))) {
    //If the access token is valid, its mean user is logged in, so they cant go to auth/login, we redirect they to dashboard
    if (valid && authPath.some((path) => request.url.includes(path))) {
      console.log(JSON.stringify({ level: 'info', module: 'middleware', msg: 'Authenticated user accessing auth path — redirecting to app', pathname }))
      return NextResponse.redirect(new URL(protectedDefaultPath, request.url))
    }
    return NextResponse.next()
  }

  /**
   * Protected path handler
   * If User, let them access
   * If Guest, try to get refresh token from cookie, if have, try to refresh access token
   */
  if (valid) {
    // Check if URL contains org ID and rewrite to slug (only for pages, not API)
    if (!pathname.startsWith('/api/')) {
      const orgMatch = pathname.match(/^\/org\/([^\/]+)/)
      if (orgMatch && orgMatch[1]) {
        const orgIdentifier = orgMatch[1]

        // If URL has UUID and we have a slug in cookie, rewrite to slug
        if (validate(orgIdentifier)) {
          let orgSlug = null

          const slugMapping = request.cookies.get('slugMapping')?.value
          if (slugMapping) {
            const [id, slug] = slugMapping.split(':')
            if (id === orgIdentifier) {
              orgSlug = slug
            }
          }

          if (orgSlug) {
            const newPathname = pathname.replace(`/org/${orgIdentifier}`, `/org/${orgSlug}`)
            const url = request.nextUrl.clone()
            url.pathname = newPathname
            console.log(JSON.stringify({ level: 'info', module: 'middleware', msg: 'Rewriting org UUID to slug', from: pathname, to: newPathname }))
            return NextResponse.redirect(url)
          }
        }

        // Rewrite bare /org/${id} to home path (URL stays unchanged)
        // if (/^\/org\/[^/]+$/.test(pathname)) {
        //   const url = request.nextUrl.clone()
        //   url.pathname = orgHomePath(orgIdentifier)
        //   return NextResponse.rewrite(url)
        // }
      }
    }

    const search = request.nextUrl.search
    const fullPath = `${pathname}${search}`

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-full-path', fullPath)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  /**
   * If token session not valid, redirect to login page
   */
  if (saveRedirectPath.some((path) => request.url.includes(path))) {
    /**
     * ⚠️ `pathname` CARRIES NO QUERY STRING. Concatenating it alone silently dropped every parameter
     * the user arrived with — for `/mcp/consent` that is the entire OAuth authorization request.
     *
     * `searchParams.set` also replaces string concatenation: the raw `'?redirect_to=' + path` form
     * put an un-encoded `?`/`&` straight into the login URL, so the first parameter of the saved
     * path terminated `redirect_to` and became a parameter of `/auth/login` instead. Encoding here
     * is the ONLY encoding this value gets — `getCasdoorLoginUrl` used to add a second layer, and
     * removing that is the other half of this fix.
     */
    const redirectPath = `${pathname}${request.nextUrl.search}`
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect_to', redirectPath)
    console.log(JSON.stringify({ level: 'info', module: 'middleware', msg: 'Unauthenticated — redirecting to login with redirect_to', pathname }))
    return NextResponse.redirect(loginUrl)
  }

  console.log(JSON.stringify({ level: 'info', module: 'middleware', msg: 'Unauthenticated — redirecting to login', pathname }))
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
