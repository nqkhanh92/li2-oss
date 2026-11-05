import { ContentLayout } from '@/shared/components/layout/content-layout'
import { EventRulesList } from '@/ee/features/event-rules/components/event-rules-list'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Event Rules',
}

export default async function EventRulesPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params

  if (disabledFeatures.BEHAVIOR_ANALYTICS) redirect(`/org/${org_id}`)

  let blocked = false

  try {
    await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_EVENT_RULES_PER_ORG, { onlyCheck: true })
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  return (
    <ContentLayout title="Event Rules" isBackable={false}>
      <EventRulesList blocked={blocked} />
    </ContentLayout>
  )
}
