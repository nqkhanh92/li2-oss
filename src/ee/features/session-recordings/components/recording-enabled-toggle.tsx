'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { VideoOff } from 'lucide-react'
import { Switch } from '@/shared/components/ui/switch'
import { useGetAnalyticsSettings } from '@/features/analytics-settings/hooks/queries'
import { useUpdateFeatures } from '@/features/analytics-settings/hooks/mutations'

export function RecordingEnabledToggle() {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('session_recordings')

  const { data: settings } = useGetAnalyticsSettings(org_id)
  const updateFeatures = useUpdateFeatures(org_id)

  const enabled = settings?.features?.session_recording ?? true

  if (enabled) return null

  async function handleToggle(checked: boolean) {
    const current = settings?.features ?? {}
    await updateFeatures.mutateAsync({ ...current, session_recording: checked })
  }

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
      <VideoOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="text-xs text-amber-700 dark:text-amber-300 whitespace-nowrap">
        {t('recording_disabled', 'Recording disabled')}
      </span>
      <Switch
        checked={false}
        onCheckedChange={handleToggle}
        disabled={updateFeatures.isPending}
        className="scale-75 origin-right"
      />
    </div>
  )
}
