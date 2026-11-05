import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const replaceContent = vi.fn()

vi.mock('@/core/services/artifact.service', () => ({
  artifactService: { replaceContent: (...args: any[]) => replaceContent(...args) },
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

import { POST } from '@/app/api/organizations/[org_id]/artifacts/[artifact_id]/replace/route'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
} from '@/infrastructure/response/errors/domain.errors'

const ORG = 'org-1'
const ID = 'artifact-1'
const URL = `https://app.li2.ai/api/organizations/${ORG}/artifacts/${ID}/replace`

const call = (request: NextRequest) => POST(request, { params: { org_id: ORG, artifact_id: ID } })

const withDeclaredLength = (contentLength: string, contentType?: string) =>
  new NextRequest(URL, {
    method: 'POST',
    headers: {
      'content-length': contentLength,
      ...(contentType ? { 'content-type': contentType } : {}),
    },
  })

const withFile = (name = 'v2.pdf') => {
  const form = new FormData()
  form.set('file', new File([new Uint8Array(16)], name, { type: 'application/pdf' }))
  return new NextRequest(URL, { method: 'POST', body: form })
}

const withJson = (body: unknown) =>
  new NextRequest(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  replaceContent.mockResolvedValue({ id: ID, previous_size_bytes: 11 })
})

/**
 * Lớp 0 chạy cho CẢ HAI nhánh body: `formData()` của undici nhân bộ nhớ ~5×, và `json()` của một
 * body 100MB cũng đọc hết vào RAM trước khi parse. Spy là trọng tâm của test, không phải mã trạng
 * thái — một bản parse xong rồi mới 413 vẫn thoả assert `res.status`.
 */
describe('POST …/replace — lớp 0: Content-Length, trước khi parse', () => {
  it('multipart 100MB → 413, formData() KHÔNG được gọi', async () => {
    const request = withDeclaredLength(String(100 * 1024 * 1024))
    const formData = vi.spyOn(request, 'formData')

    const res = await call(request)

    expect(res.status).toBe(413)
    expect(formData).not.toHaveBeenCalled()
    expect(replaceContent).not.toHaveBeenCalled()
  })

  it('JSON 100MB → 413, json() KHÔNG được gọi', async () => {
    const request = withDeclaredLength(String(100 * 1024 * 1024), 'application/json')
    const json = vi.spyOn(request, 'json')

    const res = await call(request)

    expect(res.status).toBe(413)
    expect(json).not.toHaveBeenCalled()
    expect(replaceContent).not.toHaveBeenCalled()
  })

  it('413 mang khoá i18n dùng chung với create và con số 10', async () => {
    const res = await call(withDeclaredLength(String(100 * 1024 * 1024)))
    const body = await res.json()
    expect(body.i18nMessage.key).toBe('common:messages.error.field_exceed_limit')
    expect(body.i18nMessage.params.limit).toBe(10)
  })
})

describe('POST …/replace — multipart (UI)', () => {
  it('trường file đi tới service với đúng org, user, artifact', async () => {
    const res = await call(withFile())

    expect(res.status).toBe(200)
    expect(replaceContent).toHaveBeenCalledOnce()
    const [orgId, userId, artifactId, input] = replaceContent.mock.calls[0]
    expect(orgId).toBe(ORG)
    expect(userId).toBe('user-1')
    expect(artifactId).toBe(ID)
    expect(input.file).toBeInstanceOf(File)
    expect(input.file.name).toBe('v2.pdf')
  })

  it('thiếu trường file → 400 field_required, service không được gọi', async () => {
    const form = new FormData()
    form.set('name', 'không phải file')
    const res = await call(new NextRequest(URL, { method: 'POST', body: form }))

    expect(res.status).toBe(400)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.field_required')
    expect(replaceContent).not.toHaveBeenCalled()
  })

  it('không có name nào được chuyển sang service — tên không đổi qua thay file (R9)', async () => {
    const form = new FormData()
    form.set('file', new File([new Uint8Array(16)], 'v2.pdf'))
    form.set('name', 'tên mới')
    await call(new NextRequest(URL, { method: 'POST', body: form }))

    expect(Object.keys(replaceContent.mock.calls[0][3])).toEqual(['file'])
  })

  it('200 mang khoá updated_field như publish', async () => {
    const res = await call(withFile())
    const body = await res.json()
    expect(body.i18nMessage.key).toBe('common:messages.success.updated_field')
    expect(body.data.previous_size_bytes).toBe(11)
  })
})

/**
 * Đường của MCP `update_artifact`: back-hop chỉ phát POST+JSON, nên `{ html }` phải được bọc thành
 * một file ở đây và đi vào CÙNG `replaceContent()` — không có nhánh service riêng cho JSON.
 */
describe('POST …/replace — JSON (MCP)', () => {
  it('{ html } → service nhận file index.html, size = byte UTF-8, arrayBuffer trả đúng byte', async () => {
    const html = '<h1>Xin chào</h1>'
    const res = await call(withJson({ html }))

    expect(res.status).toBe(200)
    const file = replaceContent.mock.calls[0][3].file
    expect(file.name).toBe('index.html')
    // Chữ có dấu: byte > ký tự. `html.length` sẽ cho 17, UTF-8 cho 20.
    expect(file.size).toBe(Buffer.byteLength(html, 'utf8'))
    expect(file.size).not.toBe(html.length)
    expect(Buffer.from(await file.arrayBuffer()).toString('utf8')).toBe(html)
  })

  it('thiếu html → 400 field_required', async () => {
    const res = await call(withJson({}))
    expect(res.status).toBe(400)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.field_required')
    expect(replaceContent).not.toHaveBeenCalled()
  })

  it('html không phải chuỗi → 400', async () => {
    const res = await call(withJson({ html: 42 }))
    expect(res.status).toBe(400)
  })

  it('body không parse được → 400, không phải 500', async () => {
    const res = await call(withJson('{not json'))
    expect(res.status).toBe(400)
  })

  it('html rỗng vẫn tới service (service trả 400 "file rỗng" bằng câu của nó)', async () => {
    replaceContent.mockRejectedValue(new BadRequestError('empty'))
    const res = await call(withJson({ html: '' }))
    expect(res.status).toBe(400)
    expect(replaceContent.mock.calls[0][3].file.size).toBe(0)
  })
})

/**
 * Hợp đồng mã lỗi (R5) đi qua `withAuth` → `toResponse()`. Service quyết định class; route chỉ
 * không được nuốt hay đổi mã. Một route bọc lỗi trong try/catch rồi trả 500 sẽ làm cả bảng này đỏ.
 */
describe('POST …/replace — mã lỗi từ service đi thẳng ra', () => {
  it.each([
    [404, () => new NotFoundError('gone')],
    [409, () => new ConflictError('held', { key: 'artifact:update.status_refuses' })],
    [403, () => new ForbiddenError('quota')],
    [413, () => new PayloadTooLargeError('big')],
    [400, () => new BadRequestError('bad ext')],
  ] as [number, () => Error][])('%s', async (status, make) => {
    replaceContent.mockRejectedValue(make())
    const res = await call(withFile())
    expect(res.status).toBe(status)
    expect((await res.json()).i18nMessage.key).toBeTruthy()
  })
})
