'use client'

import { Loader2, MonitorPlay, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { useDemoMode } from '@/shared/hooks/use-demo-mode'
import { useEffect } from 'react'

export const DEMO_BANNER_HEIGHT = 32

export function DemoBanner() {
  const { isDemoMode, exitDemo, isPendingExit } = useDemoMode()
  const { t } = useTranslation(['layout', 'common'])

  if (!isDemoMode) return null

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-100 flex items-center justify-center gap-3 bg-amber-500/70 text-white px-4"
      style={{ height: DEMO_BANNER_HEIGHT }}
    >
      <MonitorPlay className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium">{t('layout:header.demoBanner.notice')}</span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-2 h-7 px-3 text-xs font-medium bg-white hover:bg-white/90 text-black hover:text-black rounded-full"
        onClick={exitDemo}
        disabled={isPendingExit}
      >
        {isPendingExit ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
        ) : (
          <XCircle className="w-3.5 h-3.5 mr-1.5" />
        )}
        {t('common:demo.exitDemo')}
      </Button>
    </div>
  )
}
