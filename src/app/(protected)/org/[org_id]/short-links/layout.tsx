import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.short_link'),
  }
}

export default function ShortLinksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
