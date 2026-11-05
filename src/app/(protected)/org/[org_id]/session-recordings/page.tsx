import { Suspense } from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { SessionRecordingsView } from '@/ee/features/session-recordings'
import { RecordingEnabledToggle } from '@/ee/features/session-recordings/components/recording-enabled-toggle'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'

export const metadata: Metadata = { title: 'Session Recordings' }

export default async function SessionRecordingsPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params

  if (disabledFeatures.BEHAVIOR_ANALYTICS || disabledFeatures.SESSION_RECORDING)
    redirect(`/org/${org_id}`)

  let blocked = false
  try {
    await ensureOrgPlan(org_id, ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  return (
    <ContentLayout
      title={
        <span className="flex items-center gap-2">
          Session Recordings
          <RecordingEnabledToggle />
        </span>
      }
      isBackable={false}
    >
      <Suspense fallback={null}>
        <SessionRecordingsView blocked={blocked} />
      </Suspense>
    </ContentLayout>
  )
}
