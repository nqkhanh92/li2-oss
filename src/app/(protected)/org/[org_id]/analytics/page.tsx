import AnalyticView from '@/features/analytics/components/views/analytic-view'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.analytics'),
  }
}

export default async function AnalyticsPage() {
  return <AnalyticView />
}
