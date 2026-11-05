import { describe, it, expect } from 'vitest'
import { PLAN_KEYS, TIER_DEFAULT, type PlanKey } from '@/shared/types/plan-permission'

/**
 * "Mở AI chat cho toàn bộ gói" — chốt chủ sản phẩm 2026-10-29.
 *
 * Ca này khoá một **ghép nối mà kiểu dữ liệu không khoá được**. `TIER_DEFAULT` khai là
 * `Partial<Record<PlanKey, number>>`, nên thiếu gói nào cũng vẫn biên dịch sạch. Chỗ đọc nó —
 * `src/app/api/agent/session/route.ts:47-49` — lại **ném AppError** khi không giải được ngân sách:
 *
 *     const aiBudgetCents = quota?.ai_monthly_budget_cents ?? (planKey ? TIER_DEFAULT[planKey] : undefined)
 *     if (typeof aiBudgetCents !== 'number') throw new AppError(...)
 *
 * Trước 2026-10-29 bảng này chỉ có t1/t1_trial/t2, và điều đó ĐÚNG — vì `ensureOrgPlan(AI_CHAT)`
 * đứng trước đã chặn t0/t0_trial. Nhưng phép chặn đó đọc `plans.advanced_features_allowed` trong
 * **DB**, không phải code. Nên khi mở `ai_chat` cho t0 trong DB, cái chặn biến mất và t0 đi thẳng
 * vào chỗ ném lỗi.
 *
 * Hậu quả nếu để sót, và đây là lý do ca test này đáng tồn tại: gói FREE **đang** bị từ chối gọn
 * gàng bằng **403** → transport dịch thành `'not-entitled'` → UI mời nâng gói. Sót thì thành
 * **500** → `'generic'` → UI báo lỗi vô nghĩa. Mở quyền mà làm trải nghiệm tệ đi, và không có
 * dòng nào trong code nói cho người sửa biết hai thứ đó dính nhau.
 */
describe('TIER_DEFAULT phải phủ hết mọi gói', () => {
  const MOI_GOI = Object.values(PLAN_KEYS) as PlanKey[]

  it('⭐ không gói nào thiếu ngân sách mặc định', () => {
    const thieu = MOI_GOI.filter((k) => typeof TIER_DEFAULT[k] !== 'number')

    expect(thieu).toEqual([])
  })

  it.each(MOI_GOI)('gói %s có một con số dương', (planKey) => {
    const budget = TIER_DEFAULT[planKey]

    expect(typeof budget).toBe('number')
    // 0 cũng là number nên phép kiểm ở route sẽ cho qua, nhưng một hạn mức 0 nghĩa là "có quyền
    // mà không tiêu được đồng nào" — một trạng thái không ai cố ý tạo ra. Bắt nó ở đây.
    expect(budget).toBeGreaterThan(0)
  })

  /**
   * Khoá chiều ngược lại: thêm một gói mới vào `PLAN_KEYS` mà quên bảng này thì ca đầu đỏ. Còn ca
   * này bắt chiều kia — một khoá lạ trong `TIER_DEFAULT` không khớp gói nào, thường là dấu vết của
   * lần đổi tên gói làm nửa chừng.
   */
  it('không có khoá lạ nào ngoài danh sách gói', () => {
    const laKhoa = Object.keys(TIER_DEFAULT).filter((k) => !(MOI_GOI as string[]).includes(k))

    expect(laKhoa).toEqual([])
  })
})
