import { setCasdoorToken } from '@/app/actions/auth'
import { logger } from '@/infrastructure/logging/logger'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { refreshAccessToken } from '@/shared/lib/auth/session'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
const log = logger.child({ module: 'auth/refresh' })
const POST_IMPL = async (request: NextRequest) => {
  try {
    const refresh_token =
      request.cookies.get('casdoor_refresh_token')?.value || headers().get('casdoor_refresh_token')
    if (!refresh_token) {
      throw new UnauthorizedError('Refresh token not found')
    }
    const result = await refreshAccessToken(refresh_token)
    if (result) {
      const { access_token, refresh_token: new_refresh_token } = result
      const cookieResponse = NextResponse.json({ access_token, refresh_token: new_refresh_token })

      await setCasdoorToken(access_token, new_refresh_token, cookieResponse)
      return cookieResponse
    } else {
      throw new UnauthorizedError('Refresh token is invalid')
    }
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    log.error({ error })
    return new AppError(error.message).toResponse()
  }
}

export const POST = withCors(POST_IMPL)

export const OPTIONS = withCors(async (request: NextRequest) => {
  const response = new NextResponse(null, { status: 204 })
  return response
})
