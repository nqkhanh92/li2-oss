import { redirect } from 'next/navigation'

export default async function TouchPointNfcPage({
  params,
}: {
  params: { org_id: string }
}) {
  redirect(`/org/${params.org_id}/short-links`)
}

// import { ContentLayout } from '@/shared/components/layout/content-layout'
// import { Metadata } from 'next'
// import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
// import { NfcList } from '@/features/touch-points/components/touch-point-list/nfc-list'
// import { TouchPointNavTabs } from '@/features/touch-points/components/touch-point-nav-tabs'
//
// export const metadata: Metadata = {
//   title: 'NFC Tags',
// }
//
// export default async function TouchPointsPage() {
//   const { t } = await initServerI18n()
//   return (
//     <ContentLayout
//       title={t('common:module.nfc_tags')}
//       isBackable={false}
//       extra={<TouchPointNavTabs activeTab="nfc" />}
//     >
//       <NfcList />
//     </ContentLayout>
//   )
// }
