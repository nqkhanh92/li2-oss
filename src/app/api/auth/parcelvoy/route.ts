import { ShlinkService } from '@/infrastructure/external/shlink/shlink.service'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'tldts'
import { logger } from '@/infrastructure/logging/logger'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'auth/parcelvoy' })

export const GET = withAuth(async (request: NextRequest, { context }) => {
  //Check if already have access token
  const res = NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_PARCELVOY_URL!))
  try {
    const parcelToken = JSON.parse((await cookies().get('oauth')?.value) || '{}')
    console.log({ parcelToken })
    if (
      parcelToken.expires_at &&
      parcelToken.access_token &&
      new Date(parcelToken.expires_at) > new Date(Date.now() - 1000 * 60 * 30)
    ) {
      console.log('Already have, skip create')
      return res
    }
  } catch (error) {}

  const shlinkService = new ShlinkService()
  const { data } = await shlinkService.getParcelvoyAccessToken(context.email, context.userId)
  const token = {
    access_token: `${data.token}`,
    expires_at: `${data.expires_at}`,
  }
  const host = process.env.NEXT_PUBLIC_APP_BASE_URL

  if (host) {
    const domain = parse(host).domain
    log.info({ domain })
    res.headers.set(
      'Set-Cookie',
      `oauth=${JSON.stringify(token)}; Domain=.${domain}; Path=/; HttpOnly; Secure; SameSite=None`
    )
  }
  return res
})
