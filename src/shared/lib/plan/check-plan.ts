import {
  OrganizationPlan,
  OrgPlanLimitKey,
  Plan,
  PlanLimitKey,
  OrgAdvancedFeatureKey,
} from '@/shared/types/plan-permission'
import { isOss } from '@/shared/constants/edition'

/**
 * ## Vì sao bản OSS bỏ hẳn cổng gói
 *
 * Bậc gói chỉ có nghĩa khi có chỗ để nâng cấp lên. Bản tự host không có ai bán gì cho ai, nên
 * mỗi lần cổng này trả `false` là một ngõ cụt: người dùng thấy "Upgrade now" và nút đó không dẫn
 * đi đâu. Đã nhìn thấy thật trên trang Customers của bản tự host.
 *
 * ## Vì sao chặn ở ĐÂY chứ không gỡ lời gọi
 *
 * **91 file** gọi `hasPlan` / `ensureOrgPlan` / `checkOrgLimitation`. Gỡ từng lời gọi là sửa 91
 * file và chắc chắn sót. Hai dòng `if (isOss) return true` dưới đây làm mọi đường dẫn — kể cả
 * `ensureUserPlan`, `ensureOrgPlan`, `PlanPolicy`, `OrgPlanPolicy`, vốn đều quy về hai hàm này —
 * trở nên dễ dãi cùng lúc.
 *
 * ## Vì sao KHÔNG gán tổ chức sang gói PREMIUM thay vì shim
 *
 * Hai trong bốn hằng ở `shared/constants/index.ts:131` trỏ vào hàng **không tồn tại**:
 * `PREMIUM = 8c337bdb…` nhưng hàng thật là `638acf5f…`, `FREE_TRIAL = 374e934f…` nhưng hàng thật
 * là `e3b16158…`. Gán sang PREMIUM là lặp lại đúng lỗi khoá ngoại 23503 đã làm hỏng lần đăng
 * nhập đầu tiên. Shim không quan tâm tổ chức đang mang hàng nào.
 *
 * ⚠ Đây là cơ chế **giao diện và luồng dùng**, không phải cơ chế cấp phép. Nó không mở khoá mã
 * nằm ở `src/ee/` — mã đó bị ẩn bằng `EDITION`, không bằng gói.
 */
export function hasPlan(
  userPlan: Plan,
  key: Exclude<PlanLimitKey, OrgAdvancedFeatureKey>,
  currentValue: number | string
): boolean {
  if (isOss) return true

  const planLimit = userPlan[key]
  if (typeof planLimit === 'boolean') return planLimit

  if (!planLimit) return false

  if (Array.isArray(planLimit)) {
    return typeof currentValue === 'string' && planLimit.includes(currentValue)
  }

  if (typeof currentValue === 'number' && typeof planLimit === 'number') {
    return currentValue < planLimit
  }
  return false
}

// export function hasOrgPlan(
//   orgPlan: OrgPlan,
//   key: PlanLimitKey,
//   currentValue: number | string
// ): boolean {
//   const planLimit = orgPlan[key as keyof OrgPlan];
//   if (typeof planLimit === "boolean") return planLimit;

//   if (!planLimit) return false;

//   if (Array.isArray(planLimit)) {
//     return typeof currentValue === "string" && planLimit.includes(currentValue);
//   }

//   if (typeof currentValue === "number" && typeof planLimit === "number") {
//     return currentValue < planLimit;
//   }
//   return false;
// }

export function checkOrgLimitation(
  orgPlan: OrganizationPlan,
  key: OrgPlanLimitKey,
  expectedValue?: number | string | string[]
): boolean {
  // Xem khối chú thích ở `hasPlan`: bản OSS không có bậc gói nào để chặn.
  if (isOss) return true

  const planLimit = orgPlan[key]

  // if plan limit is boolean, return plan limit
  if (typeof planLimit === 'boolean') return planLimit

  // if plan limit is array, return true if current value is in plan limit
  if (Array.isArray(planLimit)) {
    if (typeof expectedValue === 'string') return planLimit.includes(expectedValue)
    if (Array.isArray(expectedValue))
      return expectedValue.every((value) => planLimit.includes(value))
    return false
  }

  // if plan limit is number, return true if current value is less than plan limit
  if (typeof expectedValue === 'number' && typeof planLimit === 'number') {
    /**
     * Số ÂM nghĩa là KHÔNG GIỚI HẠN, không phải "hạn mức bằng số âm".
     *
     * Gói ENTERPRISE trong bảng `plans` đặt **-1 cho cả 12 cột hạn mức số**
     * (`max_tps_per_org`, `max_tags_per_org`, `max_domains_per_org`, `max_members_per_org`…),
     * trong khi FREE là 50/100 và PREMIUM là 500/1000. Một gói cao nhất mang hạn mức âm chỉ đọc
     * được theo một nghĩa: bỏ trần.
     *
     * Không có dòng này thì phép so thành `3 <= -1` → false → gói ĐẮT NHẤT bị chặn ở MỌI hạn mức
     * số. Đo thật trên LiHi 2026-10-27: org Enterprise có đúng 2 touch point, mở trình tạo ra
     * "You've reached your Link limit". Lỗi có sẵn, không ai thấy vì chưa ai mở trình tạo bằng
     * một tài khoản Enterprise.
     *
     * Chỉ nới đúng ca này: `0` vẫn là chặn (gói không cho dùng), số dương vẫn so như cũ.
     */
    if (planLimit < 0) return true
    return expectedValue <= planLimit
  }

  return false
}
