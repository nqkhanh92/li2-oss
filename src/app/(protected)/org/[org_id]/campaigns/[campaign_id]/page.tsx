import { UtmCampaignDetail } from '@/ee/features/utm-campaigns/components/detail'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chiến dịch',
}

export default async function CampaignsPage() {
  const { t } = await initServerI18n()
  return (
    <ContentLayout title={t('common:module.campaigns')}>
      <UtmCampaignDetail />
    </ContentLayout>
  )
}
