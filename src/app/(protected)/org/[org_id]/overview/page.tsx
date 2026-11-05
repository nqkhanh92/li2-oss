import { OverviewView } from '@/features/overview/components/overview'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.overview'),
  }
}

export default async function OverviewPage() {
  const { t } = await initServerI18n('common')
  return (
    <ContentLayout title={t('module.overview')} isBackable={false} navBarEnabled={false}>
      <OverviewView />
    </ContentLayout>
  )
}
