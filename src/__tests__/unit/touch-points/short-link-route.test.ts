import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const ensureCanViewTouchPoint = vi.fn()
const ensureCanEditTouchPoint = vi.fn()
const updateTpSlug = vi.fn()
const getTpSlugs = vi.fn()

vi.mock('@/core/services/touch-point.service', () => ({
  touchPointService: {
    ensureCanViewTouchPoint: (...args: any[]) => ensureCanViewTouchPoint(...args),
    ensureCanEditTouchPoint: (...args: any[]) => ensureCanEditTouchPoint(...args),
    updateTpSlug: (...args: any[]) => updateTpSlug(...args),
  },
}))

vi.mock('@/core/services/slug.service', () => ({
  slugService: { getTpSlugs: (...args: any[]) => getTpSlugs(...args) },
}))

vi.mock('@/shared/lib/auth/session', () => ({
  getSession: vi.fn(async () => ({ id: 'user-1', email: 'user@example.com' })),
}))

vi.mock('@/shared/lib/middlewares/log-request', () => ({
  logRequest: vi.fn(),
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
  },
}))

import {
  GET,
  PATCH,
} from '@/app/api/organizations/[org_id]/touch-points/[touch_point_id]/short-link/route'
import { ForbiddenError } from '@/infrastructure/response/errors/domain.errors'

const ORG = 'org-1'
const TP = 'tp-1'
const URL = `https://app.li2.ai/api/organizations/${ORG}/touch-points/${TP}/short-link`

const params = { params: { org_id: ORG, touch_point_id: TP } }

const patch = (body: unknown) =>
  PATCH(
    new NextRequest(URL, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    params
  )

beforeEach(() => {
  vi.clearAllMocks()
  ensureCanViewTouchPoint.mockResolvedValue(undefined)
  ensureCanEditTouchPoint.mockResolvedValue(undefined)
  updateTpSlug.mockResolvedValue(undefined)
  getTpSlugs.mockResolvedValue([])
})

/**
 * PATCH `…/touch-points/{id}/short-link` đổi slug của một touch point, nên nó phải đi qua cùng cái
 * cổng quyền mà `updateAndReturn` đi qua. `updateTpSlug` trong service KHÔNG tự kiểm quyền (comment
 * ở đó nói rõ "caller đã kiểm"), nên nếu route quên gọi `ensureCanEditTouchPoint` thì bất kỳ thành
 * viên org nào — kể cả người chỉ có quyền xem — cũng đổi được slug của touch point người khác.
 */
describe('PATCH …/touch-points/{id}/short-link — cổng quyền sửa', () => {
  it('⭐ có quyền sửa → gate được gọi với (org, tp, user) rồi mới updateTpSlug', async () => {
    const res = await patch({ slug: 'thuc-don-moi' })

    expect(res.status).toBe(200)
    expect(ensureCanEditTouchPoint).toHaveBeenCalledTimes(1)
    expect(ensureCanEditTouchPoint).toHaveBeenCalledWith(ORG, TP, 'user-1')
    expect(updateTpSlug).toHaveBeenCalledTimes(1)
    expect(updateTpSlug).toHaveBeenCalledWith(ORG, TP, 'thuc-don-moi', 'user-1')
  })

  it('⭐ không có quyền sửa → 403 và updateTpSlug KHÔNG được gọi', async () => {
    ensureCanEditTouchPoint.mockRejectedValue(
      new ForbiddenError('You do not have permission to edit this touch-point')
    )

    const res = await patch({ slug: 'thuc-don-moi' })

    expect(res.status).toBe(403)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.forbidden')
    expect(updateTpSlug).not.toHaveBeenCalled()
  })

  /**
   * Cổng đứng trước cả chỗ đọc body: một request không mang `slug` vẫn là request vào endpoint sửa,
   * và người không có quyền sửa không được biết nó thành công.
   */
  it('không có quyền sửa, body không có slug → vẫn 403', async () => {
    ensureCanEditTouchPoint.mockRejectedValue(new ForbiddenError())

    const res = await patch({ content_value: 'https://example.com' })

    expect(res.status).toBe(403)
    expect(updateTpSlug).not.toHaveBeenCalled()
  })

  it('có quyền sửa nhưng body không có slug → không gọi updateTpSlug, vẫn 200', async () => {
    const res = await patch({ content_value: 'https://example.com' })

    expect(res.status).toBe(200)
    expect(ensureCanEditTouchPoint).toHaveBeenCalledTimes(1)
    expect(updateTpSlug).not.toHaveBeenCalled()
  })

  it('cổng sửa KHÁC cổng xem — PATCH không được đi qua ensureCanViewTouchPoint', async () => {
    await patch({ slug: 'thuc-don-moi' })

    expect(ensureCanViewTouchPoint).not.toHaveBeenCalled()
  })
})

describe('GET …/touch-points/{id}/short-link — cổng quyền xem giữ nguyên', () => {
  it('không có quyền xem → 403 và getTpSlugs KHÔNG được gọi', async () => {
    ensureCanViewTouchPoint.mockRejectedValue(new ForbiddenError())

    const res = await GET(new NextRequest(URL), params)

    expect(res.status).toBe(403)
    expect(getTpSlugs).not.toHaveBeenCalled()
  })
})
