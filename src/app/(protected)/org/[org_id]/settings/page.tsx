import { SettingsSection } from '@/features/settings/components/setting-section'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { getOrgQuota } from '@/shared/lib/plan/plans'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.settings'),
  }
}

export default async function SettingsPage({ params }: { params: { org_id: string } }) {
  const orgQuota = await getOrgQuota(params.org_id)
  const { t } = await initServerI18n()
  return (
    <ContentLayout
      title={t('common:module.settings', { defaultValue: 'Settings' })}
      isBackable={false}
      id="setting-section"
    >
      <SettingsSection orgQuota={orgQuota} />
    </ContentLayout>
  )
}
