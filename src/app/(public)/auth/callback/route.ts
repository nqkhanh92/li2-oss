import { NextResponse } from 'next/server'
import { protectedDefaultPath } from '@/shared/constants'
import { logger } from '@/infrastructure/logging/logger'
import { v4 as uuidv4 } from 'uuid'
import { hybridAuditLogger } from '@/shared/lib/logs/hybrid-audit-logger'
import { availableEvents } from '@/features/bootstrap/stores/bootstrap-store'
import { setCasdoorToken } from '@/app/actions/auth'
import { authService } from '@/core/services/auth.service'
import { profileService } from '@/core/services/profile.service'
import { bootstrapService } from '@/core/services/bootstrap.service'
import { dubService } from '@/infrastructure/external/dub'
import { facebookTrackingService } from '@/infrastructure/external/facebook/tracking-service'
import { li2TrackingService } from '@/infrastructure/external/li2'
import { cookies } from 'next/headers'
import { ga4TrackingService } from '@/infrastructure/external/ga4'
const log = logger.child({
  module: 'auth/callback',
})

/**
 * Resolve `redirect_to` into a URL we are willing to send a freshly-authenticated browser to.
 *
 * ⚠️ THIS GUARD IS LOAD-BEARING AS OF THE `server-utils.ts` ENCODING FIX. While `redirect_to` was
 * double-encoded it always resolved to a garbage relative path, which broke every legitimate return
 * hop AND, by accident, made an attacker-supplied absolute URL harmless. Now that the value arrives
 * intact, `new URL(redirect_to, base)` would happily resolve `https://evil.example` off-origin and
 * hand it a user who has just logged in — a textbook post-authentication open redirect, and a
 * convincing one because the phishing page is reached from our own domain.
 *
 * Absolute URLs cannot simply be rejected: the Canny SSO hop passes one deliberately. The test is
 * therefore the resolved ORIGIN, which covers both forms — a relative path inherits the base origin
 * and passes, anything else falls back to the default landing page rather than failing the login.
 */
function resolveRedirectTarget(redirect_to: string | null): URL {
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL
  const fallback = new URL(protectedDefaultPath, base)
  if (!redirect_to) return fallback

  try {
    const target = new URL(redirect_to, base)
    if (target.origin !== new URL(base!).origin) {
      log.warn({ redirect_to }, 'auth/callback: refusing off-origin redirect_to')
      return fallback
    }
    return target
  } catch {
    return fallback
  }
}

export async function GET(request: Request) {
  //** Get the searchParams then get the code of auth callback */
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL(
        '/auth/error?error=No+authorization+code+provided',
        process.env.NEXT_PUBLIC_APP_BASE_URL
      )
    )
  }
  try {
    //** Get the access_token and refresh_token from the code */
    const { access_token, refresh_token } = await authService.getAuthToken(code)

    const { data: profile, isNew, avatar } = await authService.verifyAndUpdateProfile(access_token)

    /**Dub tracking section - REMOVE THIS IF NOT USE ANYMORE */
    if (isNew && profile.email && process.env.NEXT_PUBLIC_APP_ENV === 'production') {
      const clickId = (await cookies()).get('dub_id')?.value
      if (clickId) {
        dubService.trackLead({
          clickId: clickId,
          eventName: 'Sign up',
          customerExternalId: profile.id,
          customerName: profile.email,
          customerEmail: profile.email,
        })
      }

      log.info({ userId: profile.id, email: profile.email, clickId }, 'li2 track lead')
      li2TrackingService
        .trackLead({
          eventName: 'Sign up',
          customerExternalId: profile.email,
          customerName: profile.email,
          customerEmail: profile.email,
          metadata: {
            userId: profile.id,
          },
        })
        .catch((err) => log.error({ err, userId: profile.id }, 'li2 track lead failed'))
      facebookTrackingService.trackSignUp(profile.email, undefined, request)
      const signupMethod: 'google' | 'email' = avatar?.includes('googleusercontent.com')
        ? 'google'
        : 'email'
      ga4TrackingService.trackSignUp({
        userId: profile.id,
        email: profile.email,
        method: signupMethod,
      })
    }

    if (isNew) {
      const forwarded = request.headers.get('x-forwarded-for')
      const rawIp = forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip')
      const ip = rawIp?.startsWith('::ffff:') ? rawIp.replace('::ffff:', '') : rawIp || 'Unknown'
      const fp = searchParams.get('uid') || 'Unknown'
      const requestId = `req_${uuidv4()}`
      const userAgent = request.headers.get('user-agent') || 'Unknown'

      profileService.updateProfile(profile.id, {
        signup_ip: ip,
        signup_fp: fp,
      })
      hybridAuditLogger.logEvent('auth/callback', {
        eventType: 'USER_REGISTRATION',
        userId: profile.id,
        timestamp: new Date(),
        requestId,
        ipAddress: ip,
        userAgent,
        result: 'SUCCESS',
        reason: '',
        metadata: {
          email: profile.email,
          name: profile.display_name,
          ip,
          fp,
        },
      })
      // await bootstrapService.attemptPremiumGrant(profile, {
      //   requestId,
      //   ip,
      //   fp,
      //   userAgent,
      // })
    }
    //** END CAMPAIGN: 200 FREE PREMIUM */

    const target_url = resolveRedirectTarget(searchParams.get('redirect_to'))
    target_url.searchParams.set(availableEvents.LOGIN_COMPLETED, 'true')

    await setCasdoorToken(access_token, refresh_token)
    await cookies().delete('demo_session_id')

    const response = NextResponse.redirect(target_url)
    return response
  } catch (error: any) {
    log.error({ error })

    const errorUrl = new URL('/auth/error', process.env.NEXT_PUBLIC_APP_BASE_URL)
    errorUrl.searchParams.set('error', error?.message || 'Authentication failed. Please try again.')

    return NextResponse.redirect(errorUrl)
  }
}
