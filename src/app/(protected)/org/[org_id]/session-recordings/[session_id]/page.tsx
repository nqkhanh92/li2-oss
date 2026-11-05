import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { SessionReplayView } from '@/ee/features/session-recordings/components/session-replay-view'
import { disabledFeatures } from '@/shared/constants/disabled-features'

export const metadata: Metadata = { title: 'Session Replay' }

export default async function SessionReplayPage({
  params,
}: {
  params: Promise<{ org_id: string; session_id: string }>
}) {
  const { org_id } = await params

  if (disabledFeatures.BEHAVIOR_ANALYTICS || disabledFeatures.SESSION_RECORDING)
    redirect(`/org/${org_id}`)

  return (
    <ContentLayout title="Session Replay" backPath={`/org/${org_id}/session-recordings`}>
      <SessionReplayView />
    </ContentLayout>
  )
}
