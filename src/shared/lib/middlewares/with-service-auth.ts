import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { requestContext, RequestRole, ServiceAuthContext } from '@/shared/types/request'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { logRequest } from './log-request'

type RouteHandler = (request: NextRequest, context: ServiceAuthContext) => Promise<NextResponse>

const log = logger.child({ service: 'with-service-auth' })

export const withServiceAuth = (handler: RouteHandler) => {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    let response: NextResponse

    try {
      const { ip, apiKey, host } = getServiceContext()
      if (!apiKey || apiKey !== process.env.APP_API_KEY) throw new UnauthorizedError()

      const requestId = `req_service_${uuidv4()}`
      const context: ServiceAuthContext = {
        host,
        ipAddress: ip,
        requestId,
        role: RequestRole.SERVICE,
      }
      requestContext.enterWith(context)

      response = await handler(request, context)
    } catch (error: any) {
      if (error instanceof BaseError) {
        if (!(error instanceof UnauthorizedError)) {
          const isClientError = error.status >= 400 && error.status < 500
          if (isClientError) {
            log.warn({ route: request.url, err: error, duration_ms: Date.now() - startTime })
          } else {
            log.error({ route: request.url, err: error, duration_ms: Date.now() - startTime })
          }
        }
        response = error.toResponse()
      } else {
        log.error({ route: request.url, err: error, duration_ms: Date.now() - startTime })
        response = new AppError(error instanceof Error ? error.message : 'Unknown error').toResponse()
      }
    }

    logRequest(request, response.status, startTime)
    return response
  }
}

export const getServiceContext = () => {
  const host = headers().get('x-forwarded-host') || headers().get('host') || 'Unknown'
  const forwarded = headers().get('x-forwarded-for')
  const rawIp = forwarded?.split(',')[0].trim() || headers().get('x-real-ip')
  const ip = rawIp?.startsWith('::ffff:') ? rawIp.replace('::ffff:', '') : rawIp || 'Unknown'
  const apiKey = headers().get('x-api-key')
  return { host, ip, apiKey }
}
