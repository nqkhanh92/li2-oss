'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { setCasdoorToken, setGlobalCookie, logout } from './auth'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { casdoorConfig } from '@/shared/lib/casdoor'
import { protectedDefaultPath } from '@/shared/constants'
import { logger } from '@/infrastructure/logging/logger'

const DEMO_SESSION_TTL = 7200 // 2 hours

const log = logger.child({ module: 'actions/demo' })

async function getDemoTokens(): Promise<{ access_token: string; refresh_token: string } | null> {
  const email = process.env.DEMO_ACCOUNT_EMAIL
  const password = process.env.DEMO_ACCOUNT_PASSWORD
  if (!email || !password) {
    log.warn('Demo credentials missing in environment')
    return null
  }

  try {
    const response = await fetch(`${casdoorConfig.endpoint}/api/login/oauth/access_token`, {
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
    const data = await response.json()
    if (!data.access_token || !data.refresh_token) {
      log.error({ status: response.status }, 'Casdoor token exchange failed for demo account')
      return null
    }
    log.debug('Demo tokens fetched from Casdoor')
    return { access_token: data.access_token, refresh_token: data.refresh_token }
  } catch (err) {
    log.error({ err }, 'Error fetching demo tokens from Casdoor')
    return null
  }
}

export const enterDemoMode = async (): Promise<{ error: string } | void> => {
  const cookieStore = await cookies()
  const originalAccessToken = cookieStore.get('casdoor_access_token')?.value
  const originalRefreshToken = cookieStore.get('casdoor_refresh_token')?.value
  if (!originalAccessToken || !originalRefreshToken) {
    log.warn('enterDemoMode called for unauthenticated user')
    return { error: 'not_authenticated' }
  }

  log.info('User entering demo mode — fetching demo tokens')
  const demoTokens = await getDemoTokens()
  if (!demoTokens) {
    log.error('Demo mode unavailable — token fetch failed')
    return { error: 'demo_unavailable' }
  }

  const sessionId = crypto.randomUUID()
  await redis.set(
    REDIS_KEYS.DEMO.SESSION(sessionId),
    JSON.stringify({ access_token: originalAccessToken, refresh_token: originalRefreshToken }),
    'EX',
    DEMO_SESSION_TTL
  )

  // Pin demo token cookies to the same 2h window as demo_session_id and Redis key.
  // Using setCasdoorToken would set a 1-day expiry in prod, leaving the user silently
  // authenticated as the demo account after the session expires.
  const demoExpires = new Date(Date.now() + DEMO_SESSION_TTL * 1000)
  await setGlobalCookie('casdoor_access_token', demoTokens.access_token, { expires: demoExpires })
  await setGlobalCookie('casdoor_refresh_token', demoTokens.refresh_token, { expires: demoExpires })

  cookieStore.set('demo_session_id', sessionId, {
    sameSite: 'lax',
    path: '/',
    maxAge: DEMO_SESSION_TTL,
  })

  log.info({ sessionId }, 'Demo session created — original tokens preserved in Redis')
  redirect(protectedDefaultPath)
}

export const exitDemoMode = async () => {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('demo_session_id')?.value
  if (!sessionId) {
    log.warn('exitDemoMode called with no demo_session_id cookie')
    return
  }

  log.info({ sessionId }, 'Exiting demo mode')
  const stored = await redis.get(REDIS_KEYS.DEMO.SESSION(sessionId))
  cookieStore.delete('demo_session_id')

  if (stored) {
    const { access_token, refresh_token } = JSON.parse(stored)
    await setCasdoorToken(access_token, refresh_token)
    await redis.del(REDIS_KEYS.DEMO.SESSION(sessionId))
    log.info({ sessionId }, 'Demo session ended — original tokens restored')
    redirect('/')
  } else {
    // Redis key lost (expired/flushed) — original tokens are gone.
    // Force full logout so the user re-authenticates instead of being stuck as demo account.
    log.warn({ sessionId }, 'Demo session not found in Redis (expired/flushed) — forcing logout')
    await logout({ redirect_to: '/auth/login' })
  }
}
