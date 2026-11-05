import { Metadata } from 'next'

import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { ArtifactList } from '@/features/artifacts/components/artifact-list'
import { ArtifactHeaderActions } from '@/features/artifacts/components/artifact-list/artifact-header-actions'

export const metadata: Metadata = {
  title: 'Artifacts',
}

export default async function ArtifactsPage() {
  const { t } = await initServerI18n('artifact')
  return (
    <ContentLayout
      title={<div className="max-w-7xl mx-auto">{t('artifact:list.title')}</div>}
      isBackable={false}
      extra={<ArtifactHeaderActions />}
    >
      <ArtifactList />
    </ContentLayout>
  )
}
