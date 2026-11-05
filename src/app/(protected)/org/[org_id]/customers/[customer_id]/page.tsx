import { ContentLayout } from '@/shared/components/layout/content-layout'
import { CustomerDetailV2 } from '@/features/customers/components/customer-detail-v2'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await initServerI18n('customers')
  return { title: t('detail.page_title', 'Customer Detail') }
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ org_id: string }>
}) {
  const { org_id } = await params
  // `CUSTOMERS`, không phải `ATTRIBUTION` — phải khớp với gate ở `menu-list.tsx`. Ẩn menu mà
  // để guard đọc cờ khác là cách sinh ra đúng lỗi deep-link đã sửa ở `724d3d61`.
  if (disabledFeatures.CUSTOMERS) redirect(`/org/${org_id}`)

  const { t } = await initServerI18n('customers')

  return (
    <ContentLayout title={t('detail.page_title', 'Customer Detail')} backPath={`/org/${org_id}/customers`}>
      <CustomerDetailV2 />
    </ContentLayout>
  )
}
