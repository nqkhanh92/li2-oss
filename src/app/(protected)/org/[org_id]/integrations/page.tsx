import { IntegrationTypeList } from '@/features/integrations/components/lists/integration-type-list'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { Metadata } from 'next'

export default async function IntegrationsPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params
  const { t } = await initServerI18n()

  return (
    <ContentLayout title={t('common:module.integration')}>
      <IntegrationTypeList org_id={org_id} />
    </ContentLayout>
  )
}
