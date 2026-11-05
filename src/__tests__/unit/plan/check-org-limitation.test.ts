import { describe, it, expect } from 'vitest'
import { checkOrgLimitation } from '@/shared/lib/plan/check-plan'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'

/**
 * `checkOrgLimitation` quyết định ai được tạo thêm thứ gì. Trước 2026-10-27 nó **không có test
 * nào** — và nó có một lỗi chặn đứng gói đắt nhất.
 *
 * Bảng `plans` trên LiHi: FREE `max_tps_per_org = 50`, PREMIUM `500`, ENTERPRISE **`-1`** — và
 * -1 ở cả 12 cột hạn mức số. Phép so cũ là `expectedValue <= planLimit`, nên Enterprise thành
 * `3 <= -1` → false → chặn. Đo thật: org Enterprise có 2 touch point, trình tạo báo
 * "You've reached your Link limit".
 *
 * Đây là chỗ sai theo hướng nào cũng tốn tiền: chặt quá thì khách trả tiền không dùng được, lỏng
 * quá thì gói miễn phí dùng chùa. Nên test đi cả hai chiều, không chỉ chiều vừa sửa.
 */

const planWith = (limit: number) =>
  ({ [PLAN_LIMIT_KEYS.MAX_TPS_PER_ORG]: limit }) as any

const KEY = PLAN_LIMIT_KEYS.MAX_TPS_PER_ORG

describe('checkOrgLimitation — hạn mức số', () => {
  describe('số âm = KHÔNG giới hạn (gói ENTERPRISE)', () => {
    it('cho qua dù giá trị lớn đến đâu', () => {
      expect(checkOrgLimitation(planWith(-1), KEY, 3)).toBe(true)
      expect(checkOrgLimitation(planWith(-1), KEY, 10_000)).toBe(true)
    })

    it('không phụ thuộc vào đúng số -1', () => {
      // Bảng `plans` hôm nay dùng -1, nhưng ý nghĩa nằm ở DẤU chứ không ở con số.
      expect(checkOrgLimitation(planWith(-5), KEY, 999)).toBe(true)
    })
  })

  describe('số dương vẫn so như cũ — đây là chiều dễ nới hỏng', () => {
    it('cho qua khi còn chỗ', () => {
      expect(checkOrgLimitation(planWith(50), KEY, 50)).toBe(true)
      expect(checkOrgLimitation(planWith(50), KEY, 49)).toBe(true)
    })

    it('CHẶN khi vượt', () => {
      expect(checkOrgLimitation(planWith(50), KEY, 51)).toBe(false)
      expect(checkOrgLimitation(planWith(50), KEY, 64)).toBe(false)
    })
  })

  it('0 vẫn là CHẶN, không phải "không giới hạn"', () => {
    // Phân biệt "gói không cho dùng thứ này" với "gói bỏ trần". Gộp hai thứ đó là mở cổng nhầm.
    expect(checkOrgLimitation(planWith(0), KEY, 1)).toBe(false)
  })

  it('thiếu giá trị cần kiểm thì KHÔNG mặc định cho qua', () => {
    expect(checkOrgLimitation(planWith(-1), KEY, undefined)).toBe(false)
    expect(checkOrgLimitation(planWith(50), KEY, undefined)).toBe(false)
  })
})

describe('checkOrgLimitation — các kiểu hạn mức khác không bị ảnh hưởng', () => {
  it('boolean trả thẳng giá trị của gói', () => {
    expect(checkOrgLimitation({ allow_custom_utm_tags: true } as any, 'allow_custom_utm_tags' as any, 1)).toBe(true)
    expect(checkOrgLimitation({ allow_custom_utm_tags: false } as any, 'allow_custom_utm_tags' as any, 1)).toBe(false)
  })

  it('mảng kiểm theo tư cách thành viên, không theo số', () => {
    const plan = { allowed_tp_types: ['URL', 'ARTIFACT'] } as any
    expect(checkOrgLimitation(plan, 'allowed_tp_types' as any, 'ARTIFACT')).toBe(true)
    expect(checkOrgLimitation(plan, 'allowed_tp_types' as any, 'NFC')).toBe(false)
    expect(checkOrgLimitation(plan, 'allowed_tp_types' as any, ['URL', 'ARTIFACT'])).toBe(true)
    expect(checkOrgLimitation(plan, 'allowed_tp_types' as any, ['URL', 'NFC'])).toBe(false)
  })
})
