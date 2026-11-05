import RealtimeInteractionView from '@/features/realtime-data/components/views/realtime-view'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.realtime_interactions'),
  }
}

export default async function RealtimeInteractions() {
  return <RealtimeInteractionView />
}
