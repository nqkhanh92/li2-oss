import { EventRuleCreate } from '@/ee/features/event-rules/components/event-rule-create'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Create Event Rule',
}

export default async function EventRuleCreatePage({ params }: { params: { org_id: string } }) {
  if (disabledFeatures.BEHAVIOR_ANALYTICS) redirect(`/org/${params.org_id}`)

  return <EventRuleCreate />
}
