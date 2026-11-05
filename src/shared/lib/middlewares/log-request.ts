import { logger } from '@/infrastructure/logging/logger'
import { requestContext } from '@/shared/types/request'
import { NextRequest } from 'next/server'

const log = logger.child({ service: 'router' })

export function logRequest(req: NextRequest, status: number, startTime: number) {
  const ctx = requestContext.getStore()
  log.info({
    method: req.method,
    pathname: req.nextUrl.pathname,
    status,
    duration_ms: Date.now() - startTime,
    role: ctx?.role,
    requestId: ctx?.requestId,
  })
}
