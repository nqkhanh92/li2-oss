import { Suspense } from 'react'
import { CustomersView } from '@/features/customers'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  const i18n = await initServerI18n('customers')
  return {
    title: i18n.t('title'),
  }
}

export default async function CustomersPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params
  // `CUSTOMERS`, không phải `ATTRIBUTION` — phải khớp với gate ở `menu-list.tsx`. Ẩn menu mà
  // để guard đọc cờ khác là cách sinh ra đúng lỗi deep-link đã sửa ở `724d3d61`.
  if (disabledFeatures.CUSTOMERS) redirect(`/org/${org_id}`)

  let blocked = false

  try {
    await ensureOrgPlan(org_id, ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  const { t } = await initServerI18n('customers')
  return (
    <ContentLayout title={t('title')} isBackable={false}>
      <Suspense fallback={null}>
        <CustomersView blocked={blocked} />
      </Suspense>
    </ContentLayout>
  )
}
