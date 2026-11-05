import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const create = vi.fn()

vi.mock('@/core/services/artifact.service', () => ({
  artifactService: { create: (...args: any[]) => create(...args) },
}))

vi.mock('@/shared/lib/auth/session', () => ({
  getSession: vi.fn(async () => ({ id: 'user-1', email: 'user@example.com' })),
}))

vi.mock('@/shared/lib/logs/system-logger', () => ({
  systemLogger: { logEvent: vi.fn() },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { POST } from '@/app/api/organizations/[org_id]/artifacts/route'
import {
  ARTIFACT_BODY_HEADROOM_BYTES,
  artifactBodyExceedsLimit,
} from '@/core/helpers/artifact-upload-limit'
import { ARTIFACT_MAX_BYTES } from '@/core/types/artifact.type'

const ORG = 'org-1'
const URL = `https://app.li2.ai/api/organizations/${ORG}/artifacts`

const call = (request: NextRequest) => POST(request, { params: { org_id: ORG } })

const withDeclaredLength = (contentLength: string) =>
  new NextRequest(URL, { method: 'POST', headers: { 'content-length': contentLength } })

const withFile = () => {
  const form = new FormData()
  form.set('file', new File([new Uint8Array(16)], 'a.html', { type: 'text/html' }))
  return new NextRequest(URL, { method: 'POST', body: form })
}

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * Next's `Request` keeps the header we set. Worth pinning: if it did not, every assertion below
 * would still pass while testing nothing — the guard would see `null` and wave the request through.
 */
it('NextRequest giữ nguyên header content-length', () => {
  expect(withDeclaredLength('10486025').headers.get('content-length')).toBe('10486025')
})

describe('POST — lớp 0: Content-Length, trước khi parse', () => {
  /**
   * §4.1 / B9. `formData()` of undici multiplies memory ~5× — eng measured 10MB in, +50,7MB RSS —
   * so a check on `file.size` AFTER parsing has already paid for the thing it is refusing. Ten
   * parallel 10MB uploads are ~500MB resident before any of them is turned away.
   *
   * The spy is the point of the test, not the status code: a version that returned 413 after
   * parsing would satisfy the assertion on `res.status` alone.
   */
  it('thân request 100MB → 413, và formData() KHÔNG được gọi', async () => {
    const request = withDeclaredLength(String(100 * 1024 * 1024))
    const formData = vi.spyOn(request, 'formData')

    const res = await call(request)

    expect(res.status).toBe(413)
    expect(formData).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('thân request hợp lệ vẫn đi tới service', async () => {
    create.mockResolvedValue({ id: 'artifact-1' })

    const res = await call(withFile())

    expect(create).toHaveBeenCalledOnce()
    expect(res.status).toBe(201)
  })
})

/**
 * The boundary itself, away from HTTP. A test that had to build an 11MB body to reach the edge would
 * be slow enough that nobody runs it, and the edge is the only part of this that is easy to get
 * wrong — one byte either side of a constant that also has to leave room for multipart's overhead.
 */
describe('artifactBodyExceedsLimit', () => {
  const headroom = ARTIFACT_MAX_BYTES + ARTIFACT_BODY_HEADROOM_BYTES

  it('file 10MB đi kèm overhead multipart vẫn qua', () => {
    expect(artifactBodyExceedsLimit(String(ARTIFACT_MAX_BYTES + 265))).toBe(false)
  })

  it('đúng mức trần + biên thì chưa vượt; hơn một byte là vượt', () => {
    expect(artifactBodyExceedsLimit(String(headroom))).toBe(false)
    expect(artifactBodyExceedsLimit(String(headroom + 1))).toBe(true)
  })

  it('thiếu header (chunked) KHÔNG phải là từ chối — lớp 1 và 2 vẫn phải chạy', () => {
    expect(artifactBodyExceedsLimit(null)).toBe(false)
  })

  it('header rác không làm sập cổng', () => {
    expect(artifactBodyExceedsLimit('không-phải-số')).toBe(false)
  })
})
