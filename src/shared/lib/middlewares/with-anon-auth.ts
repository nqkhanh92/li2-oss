import { setGlobalCookie } from '@/app/actions/auth'
import { AnonAuthContext, requestContext, RequestRole } from '@/shared/types/request'
import { cookies, headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { validate } from 'uuid'
import { v4 as uuidv4 } from 'uuid'
import { v7 as uuidv7 } from 'uuid'
import { logRequest } from './log-request'

type RouteHandler = (request: NextRequest, context: AnonAuthContext) => Promise<NextResponse>

export const withAnonAuth = (handler: RouteHandler) => {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    let response: NextResponse

    const { ip, anonId } = await getAnonContext()
    if (!anonId || !validate(anonId)) {
      response = NextResponse.json({ error: 'Invalid anon ID' }, { status: 401 })
      logRequest(request, response.status, startTime)
      return response
    }

    const requestId = `req_anon_${uuidv4()}`
    const context: AnonAuthContext = {
      anonId,
      ipAddress: ip,
      requestId,
      role: RequestRole.ANON,
    }
    requestContext.enterWith(context)

    response = await handler(request, context)
    logRequest(request, response.status, startTime)
    return response
  }
}

export const getAnonContext = async () => {
  const cookieStore = await cookies()

  const anonCookie = cookieStore.get('anon_id')?.value
  const anonId = anonCookie || uuidv7()

  if (!anonCookie) {
    await setGlobalCookie('anon_id', anonId, {
      expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    })
  }

  const forwarded = headers().get('x-forwarded-for')
  const rawIp = forwarded?.split(',')[0].trim() || headers().get('x-real-ip')
  const ip = rawIp?.startsWith('::ffff:') ? rawIp.replace('::ffff:', '') : rawIp || 'Unknown'
  return { anonId, ip }
}
