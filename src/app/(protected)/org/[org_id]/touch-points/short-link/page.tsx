import { redirect } from 'next/navigation'

export default async function TouchPointShortLinkPage({
  params,
}: {
  params: { org_id: string }
}) {
  redirect(`/org/${params.org_id}/short-links`)
}

// import { LinkList } from '@/features/touch-points/components/touch-point-list/link-list'
// import { ContentLayout } from '@/shared/components/layout/content-layout'
// import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
// import { TouchPointNavTabs } from '@/features/touch-points/components/touch-point-nav-tabs'
//
// export async function generateMetadata() {
//   const i18n = await initServerI18n('common')
//   return {
//     title: i18n.t('label.short_link'),
//   }
// }
//
// export default async function TouchPointsPage() {
//   const { t } = await initServerI18n()
//   return (
//     <ContentLayout
//       title={t('common:module.short_link_list')}
//       isBackable={false}
//       extra={<TouchPointNavTabs activeTab="short-link" />}
//     >
//       <LinkList />
//     </ContentLayout>
//   )
// }
