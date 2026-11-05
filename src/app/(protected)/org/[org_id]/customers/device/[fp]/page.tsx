import { ContentLayout } from '@/shared/components/layout/content-layout'
import { DeviceDetail } from '@/features/customers/components/device-detail'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await initServerI18n('customers')
  return { title: t('device.page_title', 'Chi tiết thiết bị') }
}

/**
 * Chi tiết một thiết bị ẩn danh. Segment tĩnh `device` nên nó không đụng
 * `customers/[customer_id]` — `fp` không phải uuid của `customer_profiles` và không nên đi vào
 * route đó.
 */
export default async function CustomerDevicePage({
  params,
}: {
  params: Promise<{ org_id: string }>
}) {
  const { org_id } = await params
  // `CUSTOMERS` là công tắc duy nhất, giống hai trang Customers kia — xem `customers-gate.test.ts`.
  if (disabledFeatures.CUSTOMERS) redirect(`/org/${org_id}`)

  const { t } = await initServerI18n('customers')

  return (
    <ContentLayout
      title={t('device.page_title', 'Chi tiết thiết bị')}
      backPath={`/org/${org_id}/customers`}
    >
      <DeviceDetail />
    </ContentLayout>
  )
}
