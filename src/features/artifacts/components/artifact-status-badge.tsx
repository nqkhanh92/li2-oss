'use client'

import { useTranslation } from 'react-i18next'

import type { ArtifactStatus } from '@/core/types/artifact.type'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'

import { getArtifactBadgeClass, getArtifactStatusView } from '../utils/artifact-status'

export const ArtifactStatusBadge = ({
  status,
  className,
}: {
  status: ArtifactStatus | (string & {})
  className?: string
}) => {
  const { t } = useTranslation('artifact')
  const { badge } = getArtifactStatusView(status)

  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        getArtifactBadgeClass(badge.tone),
        className
      )}
    >
      {t(badge.labelKey)}
    </Badge>
  )
}

export const ArtifactStatusNote = ({
  status,
  className,
}: {
  status: ArtifactStatus | (string & {})
  className?: string
}) => {
  const { t } = useTranslation('artifact')
  const { noteKey } = getArtifactStatusView(status)
  if (!noteKey) return null
  return <p className={cn('text-xs text-slate-500', className)}>{t(noteKey)}</p>
}
