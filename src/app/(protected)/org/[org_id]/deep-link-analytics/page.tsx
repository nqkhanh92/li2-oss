import { DeepLinkAnalyticsView } from '@/ee/features/deep-link-analytics/components/deep-link-analytics-view'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { notFound } from 'next/navigation'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.deepLinkAnalytics'),
  }
}

export default async function DeepLinkAnalyticsPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params

  // Ẩn mục khỏi sidebar không chặn được ai gõ thẳng URL, mà org gói Pro thì
  // `ensureOrgPlan` dưới đây cho qua. Trả 404 để cờ tắt có nghĩa thật.
  if (disabledFeatures.DEEP_LINK_ANALYTICS) notFound()

  let blocked = false

  try {
    await ensureOrgPlan(org_id, ADVANCED_FEATURE_KEYS.DEEP_LINK_ATTRIBUTION)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  const { t } = await initServerI18n()
  return (
    <ContentLayout title={t('common:module.deepLinkAnalytics')} isBackable={false}>
      <DeepLinkAnalyticsView blocked={blocked} />
    </ContentLayout>
  )
}
