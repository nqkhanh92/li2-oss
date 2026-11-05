import { ContentLayout } from '@/shared/components/layout/content-layout'
import { SiteAnalyticsPage } from '@/ee/features/site-analytics/components/site-analytics-page'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { disabledFeatures } from '@/shared/constants/disabled-features'

export const metadata: Metadata = { title: 'Site Analytics' }

export default async function SiteAnalyticsDashboardPage({
  params,
}: {
  params: { org_id: string }
}) {
  if (disabledFeatures.BEHAVIOR_ANALYTICS) redirect(`/org/${params.org_id}`)

  const { org_id } = params
  let blocked = false

  try {
    await ensureOrgPlan(org_id, ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  return (
    // <ContentLayout compact={false} className="p-0!" title="Site Analytics" isBackable={false}>
    <SiteAnalyticsPage blocked={blocked} />
    // </ContentLayout>
  )
}
