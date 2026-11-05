import { FunnelEdit } from '@/ee/features/funnels/components/funnel-edit'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Edit Funnel',
}

export default function FunnelEditPage({ params }: { params: { org_id: string } }) {
  if (disabledFeatures.BEHAVIOR_ANALYTICS) redirect(`/org/${params.org_id}`)

  return <FunnelEdit />
}
