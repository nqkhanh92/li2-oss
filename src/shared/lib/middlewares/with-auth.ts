import { AuthContext, requestContext, RequestRole } from '@/shared/types/request'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSession } from '../auth/session'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { logger } from '@/infrastructure/logging/logger'
import { logRequest } from './log-request'

type NextRouteContext = { params: Record<string, string | string[]> }

type HandlerCtx<P> = {
  params: P
  context: AuthContext
}

type RouteHandler<P> = (req: NextRequest, ctx: HandlerCtx<P>) => Promise<NextResponse | Response>

const log = logger.child({ service: 'with-auth' })

export const withAuth = <P>(handler: RouteHandler<P>) => {
  return async (request: NextRequest, params: NextRouteContext): Promise<NextResponse> => {
    const startTime = Date.now()
    let response: NextResponse

    try {
      const session = await getSession(request)
      if (!session) throw new UnauthorizedError()
      const requestId = `req_${uuidv4()}`

      const context: AuthContext = {
        userId: session.id,
        role: RequestRole.AUTH,
        requestId,
        email: session.email,
      }
      requestContext.enterWith(context)

      const raw = await handler(request, { params: params.params as P, context })

      if (raw instanceof Response) {
        const contentType = raw.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const originalData = await raw.json()
          const safeHeaders = new Headers()
          for (const [key, value] of raw.headers.entries()) {
            if (key.toLowerCase() === 'content-length') continue
            safeHeaders.set(key, value)
          }
          response = NextResponse.json(
            { ...originalData, requestId, processing_time_ms: Date.now() - startTime },
            { status: raw.status, headers: safeHeaders }
          )
        } else if (raw instanceof NextResponse) {
          response = raw
        } else {
          response = new NextResponse(raw.body, { status: raw.status, headers: raw.headers })
        }
      } else {
        response = raw
      }
    } catch (error: any) {
      const isAuthError = error instanceof UnauthorizedError
      const isBaseError = error instanceof BaseError

      if (isBaseError) {
        if (!isAuthError) {
          const isClientError = error.status >= 400 && error.status < 500
          if (isClientError) {
            log.warn({ route: request.url, err: error, duration_ms: Date.now() - startTime })
          } else {
            log.error({ route: request.url, err: error, duration_ms: Date.now() - startTime })
          }
        }
        response = (error as BaseError).toResponse()
      } else if (error instanceof AppError) {
        log.error({ route: request.url, err: error, duration_ms: Date.now() - startTime })
        response = error.toResponse()
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error'
        response = new AppError(message).toResponse()
      }
    }

    logRequest(request, response.status, startTime)
    return response
  }
}
