import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const setAccess = vi.fn()
const publish = vi.fn()
const availableAccessModes = vi.fn(() => ['public', 'private', 'password'])

vi.mock('@/core/services/artifact.service', () => ({
  artifactService: {
    setAccess: (...args: any[]) => setAccess(...args),
    publish: (...args: any[]) => publish(...args),
    availableAccessModes: () => availableAccessModes(),
  },
}))
vi.mock('@/shared/lib/permission/permissions', () => ({
  getPermissionScopeOrThrow: vi.fn(async () => 'ALL'),
}))
vi.mock('@/shared/lib/auth/session', () => ({
  getSession: vi.fn(async () => ({ id: 'user-1', email: 'user@example.com' })),
}))
vi.mock('@/shared/lib/logs/system-logger', () => ({ systemLogger: { logEvent: vi.fn() } }))
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { PATCH } from '@/app/api/organizations/[org_id]/artifacts/[artifact_id]/route'
import { GET as accessModesGET } from '@/app/api/organizations/[org_id]/artifacts/access-modes/route'
import { POST as publishPOST } from '@/app/api/organizations/[org_id]/artifacts/[artifact_id]/publish/route'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'

const ORG = 'org-1'
const ID = 'artifact-1'
const URL = `https://app.li2.ai/api/organizations/${ORG}/artifacts/${ID}`

const patch = (body: unknown) =>
  PATCH(
    new NextRequest(URL, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: { org_id: ORG, artifact_id: ID } }
  )

beforeEach(() => {
  vi.clearAllMocks()
  setAccess.mockResolvedValue({
    id: ID,
    access_mode: 'password',
    password_set_at: '2026-10-06T00:00:00Z',
  })
  publish.mockResolvedValue({ id: ID })
})

/** R2a — PATCH …/{artifact_id} {access_mode, password}. */
describe('PATCH …/artifacts/[artifact_id]', () => {
  it('⭐ A4: 200, chuyển đúng body cho service với userId của session, i18n updated_field', async () => {
    const res = await patch({ access_mode: 'password', password: 'Abcdefgh1' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(setAccess).toHaveBeenCalledWith(ORG, 'user-1', ID, {
      access_mode: 'password',
      password: 'Abcdefgh1',
    })
    expect(json.data.access_mode).toBe('password')
    expect(JSON.stringify(json)).not.toContain('hash')
    expect(json.i18nMessage.key).toBe('common:messages.success.updated_field')
  })

  it('password không phải string → undefined, service tự quyết', async () => {
    await patch({ access_mode: 'public', password: 123 })
    expect(setAccess).toHaveBeenCalledWith(ORG, 'user-1', ID, {
      access_mode: 'public',
      password: undefined,
    })
  })

  it('⭐ A3: body rỗng / không JSON / thiếu access_mode → 400 BAD_REQUEST, service không được gọi', async () => {
    for (const body of ['', 'not json', {}, { password: 'Abcdefgh1' }, { access_mode: 5 }]) {
      const res = await patch(body)
      expect(res.status).toBe(400)
      // `BaseError.toResponse()` gửi `{ error, message, i18nMessage }` — không có `code` (A3 của spec
      // ghi `code: BAD_REQUEST`; hình dạng này có từ trước, ghi report).
      expect(await res.json()).toMatchObject({ error: true })
    }
    expect(setAccess).not.toHaveBeenCalled()
  })

  it('lỗi service đi qua nguyên mã: 400 / 404 / 409', async () => {
    setAccess.mockRejectedValueOnce(new BadRequestError('bad'))
    expect((await patch({ access_mode: 'x' })).status).toBe(400)
    setAccess.mockRejectedValueOnce(new NotFoundError('nf'))
    expect((await patch({ access_mode: 'public' })).status).toBe(404)
    setAccess.mockRejectedValueOnce(new ConflictError('held'))
    expect((await patch({ access_mode: 'public' })).status).toBe(409)
  })

  it('A2: không session → 401', async () => {
    const { getSession } = await import('@/shared/lib/auth/session')
    ;(getSession as any).mockResolvedValueOnce(null)
    expect((await patch({ access_mode: 'public' })).status).toBe(401)
    expect(setAccess).not.toHaveBeenCalled()
  })
})

/** R2b — publish nhận thêm access_mode/password; bỏ trống = không đụng. */
describe('POST …/publish nhận access_mode + password', () => {
  const call = (body: unknown) =>
    publishPOST(
      new NextRequest(`${URL}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: { org_id: ORG, artifact_id: ID } }
    )

  it('chuyển access_mode + password vào service cùng slug', async () => {
    await call({ slug: 'abc', access_mode: 'password', password: 'Abcdefgh1' })
    expect(publish).toHaveBeenCalledWith(ORG, 'user-1', ID, {
      slug: 'abc',
      domain_id: undefined,
      access_mode: 'password',
      password: 'Abcdefgh1',
    })
  })

  it('không gửi → undefined, không phải chuỗi rỗng', async () => {
    await call({})
    expect(publish).toHaveBeenCalledWith(
      ORG,
      'user-1',
      ID,
      expect.objectContaining({ access_mode: undefined, password: undefined })
    )
  })
})

/** §9 — dashboard hỏi server chế độ nào được chọn, thay vì đọc một env public thứ hai. */
describe('GET …/artifacts/access-modes', () => {
  it('trả { modes } từ service, 200', async () => {
    const res = await accessModesGET(
      new NextRequest(`https://app.li2.ai/api/organizations/${ORG}/artifacts/access-modes`),
      { params: { org_id: ORG } }
    )
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({ modes: ['public', 'private', 'password'] })
  })
})
