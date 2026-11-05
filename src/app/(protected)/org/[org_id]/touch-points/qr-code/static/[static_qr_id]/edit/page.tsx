import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { StaticQrEditView } from '@/features/touch-points/components/static-qr/views/static-qr-edit-view'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('common:buttons.edit', { field: i18n.t('label.qr_code') }),
  }
}

export default async function StaticQrEditPage({ params }: { params: { org_id: string } }) {
  const { t } = await initServerI18n(['common'])
  return (
    <ContentLayout
      title={t('common:buttons.edit', { field: t('label.qr_code') })}
      backPath={`/org/${params.org_id}/touch-points/qr-code/static`}
    >
      <StaticQrEditView />
    </ContentLayout>
  )
}
