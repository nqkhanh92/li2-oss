// import { ContentLayout } from '@/shared/components/layout/content-layout'
// import { TouchPointCreate } from '@/features/touch-points/components/touch-point-create'
// import { ensureOrgPlan, getOrgQuota } from '@/shared/lib/plan/plans'
// import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
// import { ContentBlock } from '@/shared/components/customize/content-block'
// import Link from 'next/link'
// import { initServerI18n } from '@/shared/lib/i18n/i18n-server'

// export default async function TouchPointCreatePage({
//   params,
//   searchParams,
// }: {
//   params: { org_id: string }
//   searchParams: { [key: string]: string | string[] | undefined }
// }) {
//   const { org_id } = params
//   let blocked = false
//   try {
//     await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_TPS_PER_ORG)
//     await ensureOrgPlan(org_id, PLAN_LIMIT_KEYS.MAX_TPS_PER_MONTH)
//   } catch (error) {
//     blocked = true
//   }

//   const orgQuota = await getOrgQuota(params.org_id)

//   // const isQrTab = searchParams?.type === 'qr-code'
//   // const type = isQrTab ? 'qr' : 'link'

//   return <TouchPointCreate blocked={blocked} orgQuota={orgQuota || undefined} />
// }

import { redirect } from 'next/navigation'

export default async function TouchPointCreatePage({ params }: { params: { org_id: string } }) {
  redirect(`/org/${params.org_id}/short-links/create`)
}
