'use client'

import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

export function AiBadge() {
  const { t } = useTranslation('smart_setup')

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #4c1d95, #1e3a5f)',
        color: '#c4b5fd',
      }}
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
      {t('badge.ai')}
    </span>
  )
}
