import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const listArtifacts = vi.fn()
const isCasdoorAdmin = vi.fn()
const getSession = vi.fn()
const isCasdoorDbConfigured = vi.fn(() => true)
const warn = vi.fn()

/**
 * Chỉ thay `listArtifacts`, giữ nguyên phần còn lại của module: `artifact-query.ts` nhập
 * `ARTIFACT_SORT_FIELDS` **từ chính module này**, nên mock thay cả module sẽ làm hằng đó thành
 * `undefined` và parser nổ ở `.includes` — route trả 500 vì lỗi của test, không của code.
 */
vi.mock('@/core/services/admin-artifacts.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/services/admin-artifacts.service')>()),
  listArtifacts: (...args: any[]) => listArtifacts(...args),
}))
vi.mock('@/core/services/casdoor-admin.service', () => ({
  isCasdoorAdmin: (...args: any[]) => isCasdoorAdmin(...args),
}))
vi.mock('@/infrastructure/database/casdoor/pool', () => ({
  isCasdoorDbConfigured: () => isCasdoorDbConfigured(),
}))
vi.mock('@/shared/lib/auth/session', () => ({
  getSession: (...args: any[]) => getSession(...args),
}))
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}))

const call = async (qs = '') => {
  const { GET } = await import('@/app/api/admin/artifacts/route')
  return GET(
    new NextRequest(`https://app.li2.ai/api/admin/artifacts${qs}`) as any,
    {
      params: {},
    } as any
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  isCasdoorDbConfigured.mockReturnValue(true)
  getSession.mockResolvedValue({ id: 'user-1', email: 'an@example.com' })
  isCasdoorAdmin.mockResolvedValue(true)
  listArtifacts.mockResolvedValue({ data: [], total: 0 })
})

describe('GET /api/admin/artifacts — tham số ngày', () => {
  /**
   * ⭐ Ca trung tâm của cả file. Lỗi thật 2026-11-02: Inside gửi `2026-10-26T17:00:00.000Z`,
   * `parseDateOnly` từ chối, `range` thành `undefined`, và endpoint **200 kèm toàn bộ thời gian**.
   * Nút "Best Performance (7 days)" chạy nhiều ngày mà không lọc gì, không ai biết.
   *
   * Siết lên 400 ngày 2026-11-03 sau khi Inside prod lên `196c97b`.
   */
  it('⭐ ISO đầy đủ → 400, và service KHÔNG được gọi', async () => {
    const res = await call('?start_date=2026-10-26T17:00:00.000Z&end_date=2026-11-02T16:59:59.999Z')

    expect(res.status).toBe(400)
    expect(listArtifacts).not.toHaveBeenCalled()
  })

  /**
   * ⭐ Đây là ca sẽ ĐỎ nếu ai đó "dọn" bằng cách đổi warn thành 400 thay vì thêm 400 cạnh warn.
   *
   * 400 nói cho bên gọi; warn nói cho chúng ta. Warn là thứ duy nhất cho biết còn bên gọi nào
   * KHÁC Inside từng gửi sai — bỏ nó thì một bên thứ ba vỡ mà ta chỉ biết qua báo lỗi người dùng.
   */
  it('⭐ 400 rồi VẪN phải log.warn kèm nguyên văn hai giá trị', async () => {
    await call('?start_date=2026-10-26T17:00:00.000Z&end_date=rác')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toEqual({
      start_date: '2026-10-26T17:00:00.000Z',
      end_date: 'rác',
    })
  })

  it('⭐ thân 400 trả lại nguyên văn cái đã nhận, để bên gọi không phải đoán chỗ nào sai', async () => {
    const res = await call('?start_date=hôm-qua&end_date=2026-11-02')
    const body = await res.json()

    expect(body.received).toEqual({ start_date: 'hôm-qua', end_date: '2026-11-02' })
    expect(body.error).toMatch(/YYYY-MM-DD/)
  })

  /**
   * Một đầu hợp lệ, đầu kia thiếu → vẫn 400. Trước đây bị bỏ qua im lặng, mà khoảng thu được khi
   * chỉ có một đầu là thứ bên gọi không hề yêu cầu.
   */
  it.each([
    ['chỉ có start_date', '?start_date=2026-10-26'],
    ['chỉ có end_date', '?end_date=2026-11-02'],
  ])('%s → 400', async (_ten, qs) => {
    const res = await call(qs)

    expect(res.status).toBe(400)
    expect(listArtifacts).not.toHaveBeenCalled()
  })

  it('cả hai đúng dạng → 200 và service nhận range', async () => {
    const res = await call('?start_date=2026-10-26&end_date=2026-11-02')

    expect(res.status).toBe(200)
    expect(listArtifacts).toHaveBeenCalledTimes(1)
    expect(listArtifacts.mock.calls[0][0].range).toBeDefined()
    expect(warn).not.toHaveBeenCalled()
  })

  /**
   * ⭐ KHÔNG gửi ngày là ca gọi phổ biến nhất của endpoint — và nó KHÔNG được thành 400.
   *
   * `dateParamsRejected` là `(start || end) && !range`; bỏ mệnh đề đầu là biến mọi lời gọi không
   * lọc ngày thành lỗi, tức làm vỡ trang chính thay vì sửa nó.
   */
  it('⭐ không gửi ngày nào → 200, không lọc ngày, không warn', async () => {
    const res = await call('?page=1&limit=10')

    expect(res.status).toBe(200)
    expect(listArtifacts.mock.calls[0][0].range).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/artifacts — quyền', () => {
  it('chưa đăng nhập thì không qua được, service không được gọi', async () => {
    getSession.mockResolvedValue(null)
    const res = await call()

    expect(res.status).toBe(401)
    expect(listArtifacts).not.toHaveBeenCalled()
  })

  it('không phải admin bị chặn 403', async () => {
    isCasdoorAdmin.mockResolvedValue(false)
    const res = await call()

    expect(res.status).toBe(403)
    expect(listArtifacts).not.toHaveBeenCalled()
  })

  /**
   * ⭐ Quyền kiểm TRƯỚC tham số, nên 403 thắng 400.
   *
   * Không phải chuyện thẩm mỹ: nếu 400 ra trước, người chưa có quyền dùng được endpoint này làm
   * máy dò tham số — gửi thử từng tên tham số và đọc mã trạng thái để suy ra hợp đồng API.
   * Thứ tự này hiện do `withAdmin` bọc ngoài bảo đảm; ca test giữ nó khỏi bị đảo khi ai đó dọn
   * lại route và đưa phần đọc tham số lên trước middleware.
   */
  it('⭐ không có quyền + ngày hỏng → 403, KHÔNG phải 400', async () => {
    isCasdoorAdmin.mockResolvedValue(false)
    const res = await call('?start_date=rác&end_date=rác')

    expect(res.status).toBe(403)
  })
})
