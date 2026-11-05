import { profileService } from '@/core/services/profile.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { getSession } from '@/shared/lib/auth/session'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getCasdoorLoginUrl } from '@/shared/lib/server-utils'
import { getQueryParams } from '@/shared/lib/utils'
import * as jose from 'jose'
import { NextRequest } from 'next/server'

export const GET = async (request: NextRequest) => {
  const cannyPrivateKey = process.env.CANNY_PRIVATE_KEY
  if (!cannyPrivateKey) {
    return Response.json({ error: 'Canny private key not found' }, { status: 500 })
  }

  const queryParams = getQueryParams(request) as {
    redirect: string
    companyID: string
  }

  if (!queryParams.redirect || !queryParams.companyID) {
    return Response.json({ error: 'Missing redirect or companyID' }, { status: 400 })
  }
  const session = await getSession()

  if (!session) {
    //If user is not logged in, redirect them into casdoor login page, then after login, they will be redirected
    // back to auth-callback page, after come to auth-callback page, they will be redirected to this page via callbackUrl
    const callbackUrl = new URL('/auth/sso/canny', process.env.NEXT_PUBLIC_APP_BASE_URL)
    callbackUrl.searchParams.set('redirect', queryParams.redirect)
    callbackUrl.searchParams.set('companyID', queryParams.companyID)

    const loginPath = getCasdoorLoginUrl(callbackUrl.toString())
    return Response.redirect(loginPath)
  }

  const user = await profileService.getProfileByEmail(session.email)
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const payload = {
    email: user.email,
    id: user.id,
    name: user.display_name || user.name || user.email,
  }

  const ssoToken = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(Buffer.from(cannyPrivateKey))

  const redirectUrl = new URL('https://canny.io/api/redirects/sso')
  redirectUrl.searchParams.set('companyID', queryParams.companyID)
  redirectUrl.searchParams.set('ssoToken', ssoToken)
  redirectUrl.searchParams.set('redirect', queryParams.redirect)

  return Response.redirect(redirectUrl.toString())
}

export const POST = withAuth(async (request, { context }) => {
  const cannyPrivateKey = process.env.CANNY_PRIVATE_KEY
  if (!cannyPrivateKey) {
    return Response.json({ error: 'Canny private key not found' }, { status: 500 })
  }

  const user = await profileService.getProfileByEmail(context.email)
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }
  const payload = {
    email: user.email,
    id: user.id,
    name: user.display_name || user.name || user.email,
  }
  const ssoToken = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(Buffer.from(cannyPrivateKey))

  return APIResponse.ok({ data: { ssoToken } })
})
