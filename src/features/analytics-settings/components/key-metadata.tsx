'use client'

import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'

interface KeyMetadataProps {
  createdAt: string
}

export const KeyMetadata = ({ createdAt }: KeyMetadataProps) => {
  const { t } = useTranslation('analytics_settings')

  if (!createdAt) return null

  return (
    <p className="text-xs text-slate-500">
      {t('publishable_key.created_at')}: {format(new Date(createdAt), 'PPp')}
    </p>
  )
}
