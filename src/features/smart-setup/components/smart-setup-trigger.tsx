'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Sparkles } from 'lucide-react'
import { useSmartSetupStatus } from '../hooks/queries'
import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { LockableSection } from '@/shared/components/customize/lockable-section'

interface SmartSetupTriggerProps {
  orgId: string
  variant: 'funnels' | 'event_rules'
  onClick: () => void
}

export function SmartSetupTrigger({ orgId, variant, onClick }: SmartSetupTriggerProps) {
  const { t } = useTranslation('smart_setup')
  const router = useRouter()
  const { data: status } = useSmartSetupStatus(orgId)
  const { checkAdvancedFeature } = usePlanFeatures()

  const isAllowed = checkAdvancedFeature(ADVANCED_FEATURE_KEYS.SMART_SETUP)

  const hasPending = status?.has_pending
  const count = variant === 'funnels' ? status?.funnel_count : status?.event_rule_count

  const label =
    hasPending && count
      ? t('trigger.view_suggestions', { count })
      : variant === 'funnels'
        ? t('trigger.suggest_funnels')
        : t('trigger.suggest_rules')

  const button = (
    <Button
      onClick={isAllowed ? onClick : undefined}
      className="gap-1.5 font-medium text-white shadow-md shadow-blue-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  )

  return (
    <div className="flex flex-col items-center gap-1.5">
      <LockableSection
        locked={!isAllowed}
        lockBy="plan"
        variant="block"
        action={() => router.push(`/org/${orgId}/settings/subscription`)}
      >
        {button}
      </LockableSection>
      <span className="text-[11px] text-slate-400">
        {t('trigger.beta')} &bull; {t('trigger.premium')}
      </span>
    </div>
  )
}
