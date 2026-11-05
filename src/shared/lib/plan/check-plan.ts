import {
  OrganizationPlan,
  OrgPlanLimitKey,
  Plan,
  PlanLimitKey,
  OrgAdvancedFeatureKey,
} from '@/shared/types/plan-permission'

export function hasPlan(
  userPlan: Plan,
  key: Exclude<PlanLimitKey, OrgAdvancedFeatureKey>,
  currentValue: number | string
): boolean {
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
