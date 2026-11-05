import { describe, it, expect } from 'vitest'
import {
  DOCK_COLLAPSED_PX,
  DOCK_MIN_OPEN_PX,
  DOCK_MAX_VH,
  clampDockHeight,
  defaultOpenHeight,
} from '@/features/agent-chat/utils/dock-size'

/**
 * Phép kẹp chiều cao dock.
 *
 * ★ Tách thành hàm thuần để kiểm được **màn hình thấp** — ca mà kéo tay không bao giờ dựng lại
 * được trên máy của người viết code, nhưng người dùng laptop 13" ở chế độ chia đôi màn hình thì
 * gặp hàng ngày.
 */

describe('kẹp vào khoảng dùng được', () => {
  const VH = 1000

  it('giá trị bình thường đi qua nguyên vẹn', () => {
    expect(clampDockHeight(500, VH)).toBe(500)
  })

  it('kéo xuống quá thấp → dừng ở trần dưới, không về 0', () => {
    expect(clampDockHeight(40, VH)).toBe(DOCK_MIN_OPEN_PX)
  })

  it('kéo lên quá cao → dừng ở 90% màn hình, còn chừa dải bảng', () => {
    expect(clampDockHeight(99999, VH)).toBe(VH * DOCK_MAX_VH)
  })

  /**
   * ⭐ Ca màn hình thấp: `260` (trần dưới) lớn hơn `0.9 × 200 = 180` (trần trên). Hai trần đảo
   * chiều, và một `Math.min(Math.max(...))` viết nhầm thứ tự sẽ cho ra **180** — dock thấp hơn
   * mức đọc được. Thứ tự đúng cho ra `260`: dock cao bằng màn hình còn hơn dock vô dụng.
   */
  it('⭐ màn hình thấp hơn cả trần dưới → vẫn trả trần dưới, không trả trần trên', () => {
    expect(clampDockHeight(500, 200)).toBe(DOCK_MIN_OPEN_PX)
  })

  it('không bao giờ trả về số nhỏ hơn trần dưới, với mọi đầu vào', () => {
    for (const [px, vh] of [
      [0, 1000],
      [-500, 1000],
      [10, 300],
      [1, 150],
    ]) {
      expect(clampDockHeight(px, vh)).toBeGreaterThanOrEqual(DOCK_MIN_OPEN_PX)
    }
  })
})

describe('chiều cao mở mặc định', () => {
  it('màn hình cao → chặn ở 720, không chiếm cả màn hình', () => {
    expect(defaultOpenHeight(1400)).toBe(720)
  })

  it('màn hình vừa → lấy 70% chứ không cố đủ 720', () => {
    expect(defaultOpenHeight(900)).toBe(630)
  })

  it('màn hình thấp → vẫn đọc được, không teo lại', () => {
    expect(defaultOpenHeight(300)).toBeGreaterThanOrEqual(DOCK_MIN_OPEN_PX)
  })
})

describe('thu gọn', () => {
  /**
   * `DOCK_COLLAPSED_PX` nay chỉ là **giá trị dự phòng** — chiều cao thật do panel tự đo
   * (`ResizeObserver` trên chính nó) rồi khai qua `--agent-dock-height`. Trước đây nó là con số
   * ép cứng, chép tay ở hai nơi, và lần bỏ một hàng khỏi dock đã làm nó cắt mất ô gõ.
   */
  it('thấp hơn hẳn trần dưới của trạng thái mở — hai trạng thái phải khác nhau rõ', () => {
    expect(DOCK_COLLAPSED_PX).toBeLessThan(DOCK_MIN_OPEN_PX)
  })

  it('vẫn là một số dương dùng được làm giá trị dự phòng', () => {
    expect(DOCK_COLLAPSED_PX).toBeGreaterThan(0)
  })
})
