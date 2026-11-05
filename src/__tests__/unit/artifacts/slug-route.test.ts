import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const changeSlug = vi.fn()

vi.mock('@/core/services/artifact.service', () => ({
  artifactService: { changeSlug: (...args: any[]) => changeSlug(...args) },
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

import { POST } from '@/app/api/organizations/[org_id]/artifacts/[artifact_id]/slug/route'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'

const ORG = 'org-1'
const ID = 'artifact-1'
const URL = `https://app.li2.ai/api/organizations/${ORG}/artifacts/${ID}/slug`

const call = (request: NextRequest) => POST(request, { params: { org_id: ORG, artifact_id: ID } })

const withBody = (body: unknown) =>
  new NextRequest(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  changeSlug.mockResolvedValue({ id: ID, short_url: 'https://s.li2.ai/thuc-don-moi' })
})

/**
 * `POST …/artifacts/{id}/slug` (wave 4 B2). Route chỉ làm ba việc: lấy `slug` ra khỏi body, từ chối
 * body không có một string ở đó, và trả DTO của service. Mọi phép kiểm ĐỊNH DẠNG (6–64 ký tự, regex,
 * tiền tố `f-`) nằm ở service, cùng một `slugSchema` với `publish` — route không chép lại luật nào.
 */
describe('POST …/artifacts/{id}/slug — body', () => {
  it.each([
    ['thiếu hẳn slug', {}],
    ['slug là số', { slug: 42 }],
    ['slug là null', { slug: null }],
    ['slug là mảng', { slug: ['a'] }],
    ['JSON hỏng', '{ không phải json'],
  ])('⭐ %s → 400 field_required, service KHÔNG được gọi', async (_label, body) => {
    const res = await call(withBody(body))

    expect(res.status).toBe(400)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.field_required')
    expect(changeSlug).not.toHaveBeenCalled()
  })

  it('⭐ body hợp lệ → changeSlug(org, user, id, slug) và 200 với i18n updated_field', async () => {
    const res = await call(withBody({ slug: 'thuc-don-moi' }))

    expect(res.status).toBe(200)
    expect(changeSlug).toHaveBeenCalledTimes(1)
    expect(changeSlug).toHaveBeenCalledWith(ORG, 'user-1', ID, 'thuc-don-moi')

    const body = await res.json()
    expect(body.data.short_url).toBe('https://s.li2.ai/thuc-don-moi')
    expect(body.i18nMessage.key).toBe('common:messages.success.updated_field')
  })

  /**
   * Route KHÔNG được tự chặn một slug sai định dạng: nếu nó chặn thì có hai bản luật, và bản ở đây
   * là bản không ai cập nhật khi `slugSchema` đổi. Chuỗi rỗng vẫn là một string, nên nó đi tới
   * service và service trả 400.
   */
  it('slug sai định dạng vẫn ĐƯỢC chuyển cho service — một bản luật, không hai', async () => {
    changeSlug.mockRejectedValue(
      new BadRequestError('Invalid slug: ab', {
        key: 'common:messages.error.field_invalid',
        params: { field: 'slug' },
      })
    )

    const res = await call(withBody({ slug: 'ab' }))

    expect(changeSlug).toHaveBeenCalledWith(ORG, 'user-1', ID, 'ab')
    expect(res.status).toBe(400)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.field_invalid')
  })
})

describe('POST …/artifacts/{id}/slug — lỗi của service đi nguyên ra response', () => {
  it('⭐ BadRequestError slug_is_taken → 400 với đúng khoá i18n', async () => {
    changeSlug.mockRejectedValue(
      new BadRequestError('Slug is taken', { key: 'common:messages.error.slug_is_taken' })
    )

    const res = await call(withBody({ slug: 'da-co-nguoi-dung' }))

    expect(res.status).toBe(400)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.slug_is_taken')
  })

  it('NotFoundError (bia mộ hoặc org khác) → 404', async () => {
    changeSlug.mockRejectedValue(
      new NotFoundError('Artifact not found', { key: 'common:messages.error.not_found' })
    )

    expect((await call(withBody({ slug: 'thuc-don-moi' }))).status).toBe(404)
  })

  it('ConflictError (nháp đổi slug bằng publish, không bằng đây) → 409', async () => {
    changeSlug.mockRejectedValue(
      new ConflictError('status refuses', { key: 'artifact:update.status_refuses' })
    )

    const res = await call(withBody({ slug: 'thuc-don-moi' }))

    expect(res.status).toBe(409)
    expect((await res.json()).i18nMessage.key).toBe('artifact:update.status_refuses')
  })
})
