import { setCasdoorToken } from '@/app/actions/auth'
import { redis } from '@/infrastructure/cache/redis'
import { logger } from '@/infrastructure/logging/logger'
import { casdoorConfig } from '@/shared/lib/casdoor'
import { NextRequest, NextResponse } from 'next/server'

const log = logger.child({ module: 'auth/impersonate' })

export const GET = async (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get('token')

  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_BASE_URL))
  }

  const key = `impersonation:${token}`

  try {
    const raw = await redis.get(key)
    if (!raw) {
      log.warn({ token: token.slice(0, 8) }, 'Impersonation token not found or expired')
      return NextResponse.redirect(new URL('/auth/login?error=invalid_token', request.url))
    }

    // Single-use: delete immediately
    await redis.del(key)

    const { user_name, email, admin_id } = JSON.parse(raw) as {
      user_id: string
      user_name: string
      email: string
      admin_id: string
    }

    log.info({ user_name, email, admin_id }, 'Admin impersonating user')

    // Exchange for a real Casdoor token server-side — password never leaves the server
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: casdoorConfig.clientId,
      client_secret: casdoorConfig.clientSecret,
      username: email,
      password: process.env.CASDOOR_MASTER_PASSWORD!,
      scope: 'read',
    })

    const tokenRes = await fetch(`${casdoorConfig.endpoint}/api/login/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      log.error({ status: tokenRes.status, body: errBody, username: `${casdoorConfig.orgName}/${user_name}` }, 'Casdoor token exchange failed')
      return NextResponse.redirect(new URL('/auth/login?error=impersonate_failed', request.url))
    }

    const { access_token, refresh_token } = await tokenRes.json()

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(new URL('/auth/login?error=impersonate_failed', request.url))
    }

    const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_BASE_URL))
    await setCasdoorToken(access_token, refresh_token, response)

    return response
  } catch (err) {
    log.error({ err }, 'Impersonation error')
    return NextResponse.redirect(new URL('/auth/login?error=impersonate_failed', request.url))
  }
}
