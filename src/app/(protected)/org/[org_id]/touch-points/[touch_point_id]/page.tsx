// import { TouchPointDetailWrapper } from '@/features/touch-points/components/touch-point-details/wrapper'

// export default function TouchPointDetailPage() {
//   return <TouchPointDetailWrapper />
// }

import { redirect } from 'next/navigation'

export default async function TouchPointDetailPage({
  params,
}: {
  params: { org_id: string; touch_point_id: string }
}) {
  redirect(`/org/${params.org_id}/short-links/${params.touch_point_id}`)
}
