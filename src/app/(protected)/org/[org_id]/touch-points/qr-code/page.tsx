import { redirect } from 'next/navigation'

export default async function TouchPointQRCodePage({
  params,
}: {
  params: { org_id: string }
}) {
  redirect(`/org/${params.org_id}/short-links`)
}

// import QrCodeView from '@/features/touch-points/components/views/qr-code-view'
// import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
//
// export async function generateMetadata() {
//   const i18n = await initServerI18n('common')
//   return {
//     title: i18n.t('label.qr_code'),
//   }
// }
//
// export default async function TouchPointQRCodePage() {
//   return <QrCodeView />
// }
