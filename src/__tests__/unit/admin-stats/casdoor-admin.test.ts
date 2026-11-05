import { describe, it, expect, vi, beforeEach } from 'vitest'

const queryCasdoor = vi.fn()
vi.mock('@/infrastructure/database/casdoor/pool', () => ({
  queryCasdoor: (...a: unknown[]) => queryCasdoor(...a),
}))

import { isCasdoorAdmin } from '@/core/services/casdoor-admin.service'

/**
 * Cổng quyền của endpoint thống kê toàn hệ thống. Sai theo hướng "cho qua" là lộ số liệu của cả
 * nền tảng cho bất kỳ ai đăng nhập — nên mọi ca mơ hồ ở đây phải trả `false`.
 */
describe('isCasdoorAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('id khớp và is_admin = true → cho qua', async () => {
    queryCasdoor.mockResolvedValueOnce([{ is_admin: true }])
    expect(await isCasdoorAdmin('user-1', 'a@b.c')).toBe(true)
  })

  it('id khớp và is_admin = false → CHẶN, không rơi xuống tra email', async () => {
    queryCasdoor.mockResolvedValueOnce([{ is_admin: false }])
    expect(await isCasdoorAdmin('user-1', 'a@b.c')).toBe(false)
    // Tìm thấy hàng rồi thì xong — tra tiếp bằng email là mở đường vòng qua câu trả lời đã có.
    expect(queryCasdoor).toHaveBeenCalledTimes(1)
  })

  /**
   * LiHi đã từng có **hai tài khoản Casdoor trùng email**. Khi email trỏ tới nhiều hàng thì không
   * biết hàng nào là người đang gọi, và đoán ở một cổng quyền là cấp quyền cho nhầm người.
   */
  it('email trùng nhiều hàng → CHẶN, kể cả khi có hàng là admin', async () => {
    queryCasdoor
      .mockResolvedValueOnce([]) // không tìm thấy theo id
      .mockResolvedValueOnce([{ is_admin: true }, { is_admin: false }])
    expect(await isCasdoorAdmin('unknown', 'trung@email.com')).toBe(false)
  })

  it('email trỏ đúng một hàng admin → cho qua', async () => {
    queryCasdoor.mockResolvedValueOnce([]).mockResolvedValueOnce([{ is_admin: true }])
    expect(await isCasdoorAdmin('unknown', 'duy-nhat@email.com')).toBe(true)
  })

  it('không id, không email → CHẶN', async () => {
    expect(await isCasdoorAdmin(undefined, undefined)).toBe(false)
    expect(queryCasdoor).not.toHaveBeenCalled()
  })

  it('không tìm thấy ai → CHẶN', async () => {
    queryCasdoor.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    expect(await isCasdoorAdmin('ghost', 'ghost@nowhere.io')).toBe(false)
  })

  /** `is_admin` về dạng khác `true` (null, chuỗi, thiếu cột) không được coi là có quyền. */
  it('giá trị is_admin không phải boolean true → CHẶN', async () => {
    for (const value of [null, undefined, 0, '', 'true', 1]) {
      queryCasdoor.mockReset()
      queryCasdoor.mockResolvedValueOnce([{ is_admin: value }])
      expect(await isCasdoorAdmin('user-1')).toBe(false)
    }
  })

  it('pool chưa cấu hình (trả mảng rỗng) → CHẶN, không cho qua', async () => {
    queryCasdoor.mockResolvedValue([])
    expect(await isCasdoorAdmin('user-1', 'a@b.c')).toBe(false)
  })
})
