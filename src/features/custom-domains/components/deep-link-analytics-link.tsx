'use client'

import { BarChart3, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'

export function DeepLinkAnalyticsLink() {
  const { t } = useTranslation(['domain'])
  const { enableDeepLinkAttribution } = usePlanFeatures()

  if (!enableDeepLinkAttribution) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon">
              <Lock className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('domain:deepLink.attribution.analytics_locked')}: {t('domain:deepLink.attribution.upsell_body')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" disabled>
            <BarChart3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t('domain:deepLink.attribution.analytics_coming_soon')}: {t('domain:deepLink.attribution.analytics_phase_5_note')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
