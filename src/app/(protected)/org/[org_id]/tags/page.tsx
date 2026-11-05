import { ContentLayout } from '@/shared/components/layout/content-layout'
import { TagsList } from '@/features/tags/components/tags-list'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tag',
}

export default async function TagsPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params
  let blocked = false
  try {
    const result = await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_TAGS_PER_ORG)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }
  const { t } = await initServerI18n()
  return (
    <ContentLayout title={t('common:module.tag')} isBackable={false}>
      <TagsList blocked={blocked} />
    </ContentLayout>
  )
}
