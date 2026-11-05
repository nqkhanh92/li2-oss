import { ContentLayout } from '@/shared/components/layout/content-layout'
import { CollectionsList } from '@/features/collections/components/collections-list'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { Metadata } from 'next'
import { CollectionsListV2 } from '@/features/collections/components/collections-list-v2'

export const metadata: Metadata = {
  title: 'Spaces',
}

export default async function CollectionsPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params
  let blocked = false

  try {
    await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_COLLECTIONS_PER_ORG)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  const { t } = await initServerI18n(['collection'])

  return (
    <ContentLayout title={t('collection:module.collections')} isBackable={false}>
      <CollectionsListV2 blocked={blocked} />
    </ContentLayout>
  )
}
