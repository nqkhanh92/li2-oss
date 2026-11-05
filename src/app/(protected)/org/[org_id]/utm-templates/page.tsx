import { ContentLayout } from '@/shared/components/layout/content-layout'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { UTMTemplatesList } from '@/features/touch-points/components/utm-templates/utm-templates-list'

export default async function UtmTemplatesPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params
  let blocked = false
  try {
    await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_UTM_TEMPLATES_PER_ORG)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }
  const { t } = await initServerI18n()
  return (
    <ContentLayout title={t('common:module.utmTemplates')} isBackable={false}>
      <UTMTemplatesList blocked={blocked} />
    </ContentLayout>
  )
}
