import { ContentLayout } from '@/shared/components/layout/content-layout'
import { TagDetail } from '@/features/tags/components/tag-detail'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tag',
}

export default async function TagDetailPage({ params }: { params: { org_id: string } }) {
  const { t } = await initServerI18n()
  const { org_id } = params
  return (
    <ContentLayout
      title={t('common:form.fields.detail_field', {
        field: t('common:module.tag'),
      })}
      backPath={`/org/${org_id}/tags`}
    >
      <TagDetail />
    </ContentLayout>
  )
}
