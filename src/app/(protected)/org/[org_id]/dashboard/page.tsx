import DashboardView from '@/features/dashboard/components/dashboard'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.dashboard'),
  }
}

export default async function DashboardPage() {
  const { t } = await initServerI18n()
  return (
    <ContentLayout title={t('common:module.dashboard')} isBackable={false} navBarEnabled={false}>
      <DashboardView />
    </ContentLayout>
  )
}
