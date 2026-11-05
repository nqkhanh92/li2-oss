import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import type { Metadata } from 'next'
import { NotificationsPage } from '@/features/notifications/components/notifications-page'

export const metadata: Metadata = {
  title: 'Notifications',
}

export default async function NotificationsPageRoute({ params }: { params: { org_id: string } }) {
  const { org_id } = params

  const { t } = await initServerI18n()

  return (
    <ContentLayout title={t('common:module.notification', 'Notifications')} isBackable={false}>
      <NotificationsPage orgId={org_id} />
    </ContentLayout>
  )
}
