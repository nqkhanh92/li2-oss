import { logger } from '@/infrastructure/logging/logger'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { logRequest } from './log-request'

type NextRouteContext = { params: Record<string, string | string[]> }
type RouteHandler = (req: NextRequest, ctx: NextRouteContext) => Promise<NextResponse | Response>

const log = logger.child({ service: 'router' })

export const withLogger = (handler: RouteHandler) => {
  return async (request: NextRequest, ctx: NextRouteContext): Promise<NextResponse> => {
    const startTime = Date.now()
    const requestId = `req_${uuidv4()}`
    let response: NextResponse

    try {
      const raw = await handler(request, ctx)

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
            { ...originalData, requestId: originalData.requestId ?? requestId, processing_time_ms: Date.now() - startTime },
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
      log.error({ route: request.url, err: error, duration_ms: Date.now() - startTime })
      throw error
    }

    logRequest(request, response.status, startTime)
    return response
  }
}
