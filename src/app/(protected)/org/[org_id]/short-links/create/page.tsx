import { ShortLinkCreate } from '@/features/short-links/components/short-link-create'
import { ensureOrgPlan, getOrgQuota } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'

export default async function ShortLinkCreatePage({
  params,
}: {
  params: { org_id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const { org_id } = params
  let blocked = false
  try {
    await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_TPS_PER_ORG)
    await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_TPS_PER_MONTH)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  const orgQuota = await getOrgQuota(params.org_id)

  return <ShortLinkCreate blocked={blocked} orgQuota={orgQuota ?? undefined} />
}
