import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import SpaceAnalyticView from '@/features/analytics/components/views/space-analytic-view'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await initServerI18n('common')
  return {
    title: `${i18n.t('module.analytics')} - ${i18n.t('module.space')}`,
  }
}

export default async function SpaceAnalyticsPage() {

  notFound()

  return <SpaceAnalyticView />
}
