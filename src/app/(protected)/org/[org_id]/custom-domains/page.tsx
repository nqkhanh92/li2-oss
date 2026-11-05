import { ContentLayout } from '@/shared/components/layout/content-layout'
import { CustomDomains } from '@/features/custom-domains/components/custom-domains'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.custom_domains'),
  }
}

export default async function CustomDomainsPage() {
  const { t } = await initServerI18n(['domain', 'common'])
  return (
    <ContentLayout title={t('common:pageTitle.customDomains')} isBackable={false}>
      <CustomDomains />
    </ContentLayout>
  )
}
