import { CampaignList } from '@/ee/features/campaigns/components/campaign-list'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Metadata } from 'next'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export const metadata: Metadata = {
  title: 'Chiến dịch',
}

export default async function CampaignsPage() {
  const { t } = await initServerI18n()
  return (
    <ContentLayout title={t('common:module.campaigns')}>
      <CampaignList />
    </ContentLayout>
  )
}
