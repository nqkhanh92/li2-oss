'use client'

import { useTranslation } from 'react-i18next'
import { useParams, useRouter } from 'next/navigation'
import { SessionRecordingsTable } from './session-recordings-table'
import { SessionRecording } from '../types'
import { FeatureUpgradeSection } from '@/shared/components/customize/feature-upgrade-section'

interface SessionRecordingsViewProps {
  blocked?: boolean
}

export function SessionRecordingsView({ blocked = false }: SessionRecordingsViewProps) {
  const { t } = useTranslation('session_recordings')
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()

  const handleRowClick = (row: SessionRecording) => {
    router.push(`/org/${org_id}/session-recordings/${row.session_id}`)
  }

  if (blocked) {
    return (
      <FeatureUpgradeSection
        title={t('plan_upgrade.title')}
        description={t('plan_upgrade.description')}
      />
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <SessionRecordingsTable onRowClick={handleRowClick} />
    </div>
  )
}
