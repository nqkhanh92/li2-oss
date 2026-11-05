import { ContentLayout } from '@/shared/components/layout/content-layout'
import { FunnelContainer } from '@/ee/features/funnels/components/funnel-container'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Funnels',
}

export default async function FunnelsPage({ params }: { params: { org_id: string } }) {
  if (disabledFeatures.BEHAVIOR_ANALYTICS) redirect(`/org/${params.org_id}`)

  const { org_id } = params
  let blocked = false

  const { t } = await initServerI18n('funnels')

  try {
    await ensureOrgPlan(org_id, ADVANCED_FEATURE_KEYS.FUNNEL_ANALYTICS)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  return (
    <ContentLayout title="Funnels" subTitle={t('page.subtitle')} isBackable={false}>
      <FunnelContainer blocked={blocked} />
    </ContentLayout>
  )
}
