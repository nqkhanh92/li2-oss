import { FunnelCreate } from '@/ee/features/funnels/components/funnel-create'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Create Funnel',
}

export default function FunnelCreatePage({ params }: { params: { org_id: string } }) {
  if (disabledFeatures.BEHAVIOR_ANALYTICS) redirect(`/org/${params.org_id}`)

  return <FunnelCreate />
}
