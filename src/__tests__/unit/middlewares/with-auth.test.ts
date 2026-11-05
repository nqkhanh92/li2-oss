import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockLog = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }))

vi.mock('server-only', () => ({}))

vi.mock('@/shared/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: vi.fn(() => mockLog) },
}))

vi.mock('@/shared/lib/logs/system-logger', () => ({
  systemLogger: { logEvent: vi.fn() },
}))

vi.mock('@/infrastructure/cache/redis', () => ({
  redis: { lpush: vi.fn() },
}))

import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getSession } from '@/shared/lib/auth/session'
import {
  AppError,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'

const mockSession = { id: 'user-123', email: 'user@example.com', sub: 'sub-123', exp: 9999999999 }

function makeRequest(url = 'https://example.com/api/test') {
  return new NextRequest(url)
}

function makeParams(params: Record<string, string> = {}) {
  return { params }
}

function jsonHandler(data: object, status = 200) {
  return vi.fn().mockResolvedValue(NextResponse.json(data, { status }))
}

function rawHandler(response: Response) {
  return vi.fn().mockResolvedValue(response)
}

function throwingHandler(error: unknown) {
  return vi.fn().mockRejectedValue(error)
}

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('returns 401 when session is missing', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      const handler = jsonHandler({ ok: true })
      const wrapped = withAuth(handler)

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.status).toBe(401)
      expect(handler).not.toHaveBeenCalled()
    })

    it('calls handler when session is valid', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const handler = jsonHandler({ ok: true })
      const wrapped = withAuth(handler)

      await wrapped(makeRequest(), makeParams())
      expect(handler).toHaveBeenCalledOnce()
    })

    it('passes correct context to handler', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const handler = vi.fn().mockResolvedValue(NextResponse.json({}))
      const wrapped = withAuth(handler)

      await wrapped(makeRequest(), makeParams({ org_id: 'org-1' }))

      const [, ctx] = handler.mock.calls[0]
      expect(ctx.context.userId).toBe('user-123')
      expect(ctx.context.email).toBe('user@example.com')
      expect(ctx.context.requestId).toBe('req_test-uuid-1234')
      expect(ctx.params).toEqual({ org_id: 'org-1' })
    })
  })

  describe('response enhancement', () => {
    it('injects requestId and processing_time_ms into JSON responses', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const handler = jsonHandler({ data: 'hello' })
      const wrapped = withAuth(handler)

      const res = await wrapped(makeRequest(), makeParams())
      const body = await res.json()

      expect(body.data).toBe('hello')
      expect(body.requestId).toBe('req_test-uuid-1234')
      expect(typeof body.processing_time_ms).toBe('number')
    })

    it('strips Content-Length from enhanced response headers', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const original = new Response(JSON.stringify({ x: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'content-length': '7' },
      })
      const handler = rawHandler(original)
      const wrapped = withAuth(handler)

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.headers.get('content-length')).toBeNull()
    })

    it('forwards non-Content-Length headers from original response', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const original = new Response(JSON.stringify({}), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'keep-me',
          'content-length': '2',
        },
      })
      const wrapped = withAuth(rawHandler(original))

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.headers.get('x-custom-header')).toBe('keep-me')
    })

    it('returns non-JSON responses unchanged', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const original = new Response('plain text', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
      const wrapped = withAuth(rawHandler(original))

      const res = await wrapped(makeRequest(), makeParams())
      expect(await res.text()).toBe('plain text')
    })
  })

  describe('error handling', () => {
    it('returns 500 and logs error for AppError', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const wrapped = withAuth(throwingHandler(new AppError('server exploded')))

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.status).toBe(500)
      expect(mockLog.error).toHaveBeenCalledOnce()
    })

    it('returns 401 and does not log for UnauthorizedError', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const wrapped = withAuth(throwingHandler(new UnauthorizedError()))

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.status).toBe(401)
      expect(mockLog.warn).not.toHaveBeenCalled()
      expect(mockLog.error).not.toHaveBeenCalled()
    })

    it('returns correct status and logs warn for 4xx BaseError', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const wrapped = withAuth(throwingHandler(new NotFoundError('missing')))

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.status).toBe(404)
      expect(mockLog.warn).toHaveBeenCalledOnce()
      expect(mockLog.error).not.toHaveBeenCalled()
    })

    it('returns correct status and logs error for 5xx BaseError', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const wrapped = withAuth(throwingHandler(new BadRequestError('bad')))

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.status).toBe(400)
      expect(mockLog.warn).toHaveBeenCalledOnce()
    })

    it('returns 500 for plain Error', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const wrapped = withAuth(throwingHandler(new Error('unexpected')))

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.message).toBe('unexpected')
    })

    it('returns 500 with Unknown error for non-Error throws', async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession)
      const wrapped = withAuth(throwingHandler('string error'))

      const res = await wrapped(makeRequest(), makeParams())
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.message).toBe('Unknown error')
    })
  })
})
