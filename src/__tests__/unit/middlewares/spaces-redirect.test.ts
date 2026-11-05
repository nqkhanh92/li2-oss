import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * `/spaces` bị ẩn khỏi giao diện (chốt 2026-10-28). Thứ cần khoá KHÔNG phải "trang biến mất", mà
 * là ba điều cụ thể:
 *   1. mọi đường dưới `/org/<id>/spaces` đều chuyển hướng, kể cả đường con chưa ai viết;
 *   2. chuyển hướng giữ nguyên **org** — đá người dùng sang org khác còn tệ hơn trang bị chặn;
 *   3. KHÔNG chạm vào bất cứ đường nào khác, đặc biệt là `/short-links` (đích đến) và `/tags`
 *      (route anh em vẫn còn sống).
 */

const casdoorMock = vi.hoisted(() => vi.fn(() => 'ĐÃ QUA CASDOOR'))
vi.mock('@/shared/lib/casdoor/middleware', () => ({ casdoor_middleware: casdoorMock }))

const { middleware } = await import('@/middleware')

const run = (path: string) =>
  middleware(new NextRequest(`https://app.example.com${path}`, { method: 'GET' })) as any

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.ARTIFACT_LINK_URL
})

describe('/spaces bị chuyển hướng', () => {
  it.each([
    '/org/org-1/spaces',
    '/org/org-1/spaces/',
    '/org/org-1/spaces/col-9',
    '/org/org-1/spaces/col-9/analytics',
    '/org/org-1/spaces/duong/chua/ai/viet',
  ])('%s → danh sách gộp của CÙNG org', async (path) => {
    const res = await run(path)

    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/org/org-1/short-links')
    // Không rơi xuống casdoor: chuyển hướng xảy ra trước, nên không tốn một lần xác minh token.
    expect(casdoorMock).not.toHaveBeenCalled()
  })

  it('giữ ĐÚNG org, không đá sang org khác', async () => {
    const res = await run('/org/khach-hang-khac/spaces/col-1')

    expect(new URL(res.headers.get('location')!).pathname).toBe('/org/khach-hang-khac/short-links')
  })

  it('bỏ query của trang cũ — nó không có nghĩa ở trang đích', async () => {
    const res = await run('/org/org-1/spaces/col-9?tab=settings&page=3')

    expect(new URL(res.headers.get('location')!).search).toBe('')
  })
})

describe('KHÔNG chạm vào đường khác', () => {
  it.each([
    '/org/org-1/short-links',
    '/org/org-1/tags',
    '/org/org-1/artifacts/abc',
    '/org/org-1/analytics',
    '/spaces',
    '/org/org-1/spaces-khac',
  ])('%s đi tiếp như thường', async (path) => {
    expect(await run(path)).toBe('ĐÃ QUA CASDOOR')
  })

  /** `/short-links` là ĐÍCH của chuyển hướng: nếu nó cũng bị bắt thì thành vòng lặp vô hạn. */
  it('đích đến không tự chuyển hướng — không có vòng lặp', async () => {
    expect(await run('/org/org-1/short-links')).toBe('ĐÃ QUA CASDOOR')
  })
})
