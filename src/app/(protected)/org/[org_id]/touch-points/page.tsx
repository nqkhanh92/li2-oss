import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Metadata } from 'next'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { LinkList } from '@/features/touch-points/components/touch-point-list/link-list'

export const metadata: Metadata = {
  title: 'Touch Point',
}

export default async function TouchPointsPage() {
  const { t } = await initServerI18n()
  return (
    <ContentLayout title={t('common:module.touchpoint')} isBackable={false}>
      <LinkList />
    </ContentLayout>
  )
}
