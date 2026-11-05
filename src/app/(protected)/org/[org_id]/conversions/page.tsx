import { ConversionsContainer } from '@/ee/features/conversions/components/conversions-container'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.conversions'),
  }
}

export default async function ConversionsPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params
  if (disabledFeatures.ATTRIBUTION) redirect(`/org/${org_id}`)

  let blocked = false

  try {
    await ensureOrgPlan(org_id, ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  const { t } = await initServerI18n()
  return (
    <ContentLayout title={t('common:module.conversions')} isBackable={false}>
      <ConversionsContainer blocked={blocked} />
    </ContentLayout>
  )
}
