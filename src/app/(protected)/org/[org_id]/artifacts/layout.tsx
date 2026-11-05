import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export async function generateMetadata() {
  const i18n = await initServerI18n('artifact')
  return {
    title: i18n.t('artifact:module'),
  }
}

export default function ArtifactsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
