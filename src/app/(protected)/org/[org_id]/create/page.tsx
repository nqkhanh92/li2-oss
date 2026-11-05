import { UnifiedCreate } from '@/features/short-links/components/unified-create'
import { ensureOrgPlan, getOrgQuota } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'

/**
 * `/org/<org>/create` — trình tạo chung, trung tính về loại.
 *
 * Route riêng chứ không gắn thêm tham số vào `/short-links/create`: cả việc này sinh ra là để
 * trang thôi trông như trang link, mà một đường dẫn có chữ `short-links` thì vẫn nói ra điều đó
 * ngay trên thanh địa chỉ — và nó là chỗ người dùng copy đi gửi cho nhau.
 *
 * Hai route cũ **vẫn sống**, không chuyển hướng: bookmark và link sâu không đổi theo refactor.
 *
 * Kiểm tra hạn mức giống hệt `/short-links/create` vì nhánh link ở đây dùng chung component đó.
 * Nhánh artifact có hạn mức riêng của nó (`…/artifacts/quota`) và tự lo lấy, nên `blocked` ở đây
 * chỉ áp cho nhánh link — đúng như khi vào thẳng route cũ.
 */
export default async function UnifiedCreatePage({ params }: { params: { org_id: string } }) {
  const { org_id } = params
  let blocked = false
  try {
    await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_TPS_PER_ORG)
    await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_TPS_PER_MONTH)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  const orgQuota = await getOrgQuota(org_id)

  return <UnifiedCreate blocked={blocked} orgQuota={orgQuota ?? undefined} />
}
