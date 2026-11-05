import { describe, it, expect } from 'vitest'
import { GEO_BINS, binColorOf, bubbleDiameter } from '@/shared/components/customize/geo-color-scale'

/**
 * Thay cho `province-color-scale.test.ts`: thang PHÂN VỊ đã bị bỏ, bin nay TUYỆT ĐỐI theo bản
 * thiết kế gốc. Khác biệt đáng giữ nhất là tính so sánh được — một màu phải mang đúng một nghĩa,
 * không đổi theo bộ dữ liệu đang xem.
 */
describe('bin màu tuyệt đối', () => {
  it('đúng năm bin, ngưỡng và màu khớp bản thiết kế', () => {
    expect(GEO_BINS.map((b) => [b.max, b.color, b.label])).toEqual([
      [2, '#D7ECD3', '1–2'],
      [5, '#A3D39C', '3–5'],
      [15, '#64B261', '6–15'],
      [40, '#2E8744', '16–40'],
      [1e9, '#17592B', '41+'],
    ])
  })

  it('biên của từng bin: giá trị max thuộc về bin đó, max+1 rơi sang bin kế', () => {
    expect(binColorOf(1)).toBe('#D7ECD3')
    expect(binColorOf(2)).toBe('#D7ECD3')
    expect(binColorOf(3)).toBe('#A3D39C')
    expect(binColorOf(5)).toBe('#A3D39C')
    expect(binColorOf(6)).toBe('#64B261')
    expect(binColorOf(15)).toBe('#64B261')
    expect(binColorOf(16)).toBe('#2E8744')
    expect(binColorOf(40)).toBe('#2E8744')
    expect(binColorOf(41)).toBe('#17592B')
  })

  it('số rất lớn vẫn có màu, không rơi ra undefined', () => {
    expect(binColorOf(1_000_000_000)).toBe('#17592B')
    expect(binColorOf(9_999_999_999)).toBe('#17592B')
  })

  /**
   * Đây là điều thang phân vị cũ KHÔNG làm được, và là lý do đổi: với thang cũ, 12 lượt là "bậc
   * nhạt nhất" trong bộ dữ liệu này và "bậc đậm nhất" trong bộ khác. Nay nó luôn là `6–15`.
   */
  it('màu KHÔNG phụ thuộc bộ dữ liệu đang xem', () => {
    const lihi = [142, 12]
    const deu = [10, 11, 12, 13, 14]
    const motMinh = [12]
    for (const set of [lihi, deu, motMinh]) {
      expect(set.includes(12) && binColorOf(12)).toBe('#64B261')
    }
  })
})

describe('đường kính bong bóng', () => {
  it('tỷ lệ theo CĂN BẬC HAI, vì mắt đọc diện tích chứ không đọc bề ngang', () => {
    // 142 và 12 lượt: tuyến tính cho bề ngang gấp ~12 lần, tức diện tích gấp ~140 lần.
    const max = 142
    const to = bubbleDiameter(142, max)
    const nho = bubbleDiameter(12, max)
    expect(to).toBe(52) // 12 + sqrt(1) * 40
    expect(nho).toBe(24) // 12 + sqrt(12/142) * 40 ≈ 23,6
    expect(to / nho).toBeLessThan(3)
  })

  it('vùng ít lượt nhất vẫn đủ to để bấm được', () => {
    // Nền 12px là lý do có số 12 trong công thức; không có nó thì 1 lượt ra đường kính ~3px.
    expect(bubbleDiameter(1, 10_000)).toBeGreaterThanOrEqual(12)
  })

  it('luôn tăng khi số lượt tăng', () => {
    const max = 200
    const sizes = [1, 5, 20, 80, 200].map((n) => bubbleDiameter(n, max))
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeGreaterThan(sizes[i - 1])
    }
  })

  it('max = 0 không làm vỡ phép chia', () => {
    expect(Number.isFinite(bubbleDiameter(0, 0))).toBe(true)
  })
})
