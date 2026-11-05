'use client'

import { useState } from 'react'
import { GoalSelectStep, type LinkAttributionGoal } from './step-goal-select'
import { ConversionTrackingEnvironmentSelect } from './step-conversion-tracking'
import { WordPressConversionGuide } from './step-conversion-tracking/wordpress-conversion-guide'
import { ManualConversionGuide } from './step-conversion-tracking/manual-conversion-guide'
import { StepDomainSetupV2 } from './step-domain-setup'
import { StepDomainReady } from './step-domain-ready'
import {
  ConversionTrackingProvider,
  useConversionTracking,
  type ConversionEnvironment,
} from './step-conversion-tracking/context'
import { useAddHostname } from '@/features/analytics-settings/hooks/mutations'

type WizardView =
  | 'goal-select'
  | 'domain-setup'
  | 'domain-ready'
  | 'conversion-tracking'
  | 'wordpress-guide'
  | 'manual-guide'

interface Props {
  org_id: string
  onChangeProduct: () => void
}

function WizardContent({ org_id, onChangeProduct }: Props) {
  const [view, setView] = useState<WizardView>('goal-select')
  const { setSelectedEnv, normalizedSiteUrl } = useConversionTracking()
  const { mutate: addHostname } = useAddHostname(org_id, true)

  const handleGoalSelect = (goal: LinkAttributionGoal) => {
    if (goal === 'track_conversions') setView('conversion-tracking')
    if (goal === 'setup_domain') setView('domain-setup')
  }

  const handleEnvSelect = (env: ConversionEnvironment) => {
    setSelectedEnv(env)
    if (normalizedSiteUrl) {
      try {
        const hostname = new URL(normalizedSiteUrl).hostname
        if (hostname) addHostname(hostname)
      } catch {
        // invalid URL — skip
      }
    }
    if (env === 'wordpress') setView('wordpress-guide')
    else if (env === 'manual') setView('manual-guide')
  }

  if (view === 'domain-setup') {
    return (
      <StepDomainSetupV2
        onBack={() => setView('goal-select')}
        onComplete={() => setView('domain-ready')}
      />
    )
  }

  if (view === 'domain-ready') {
    return <StepDomainReady onBack={() => setView('domain-setup')} />
  }

  if (view === 'conversion-tracking') {
    return (
      <ConversionTrackingEnvironmentSelect
        onBack={() => setView('goal-select')}
        onSelect={handleEnvSelect}
      />
    )
  }

  if (view === 'manual-guide') {
    return (
      <ManualConversionGuide
        org_id={org_id}
        onBack={() => setView('conversion-tracking')}
        onComplete={() => setView('goal-select')}
      />
    )
  }

  if (view === 'wordpress-guide') {
    return (
      <WordPressConversionGuide
        org_id={org_id}
        onBack={() => setView('conversion-tracking')}
        onComplete={() => setView('goal-select')}
      />
    )
  }

  return <GoalSelectStep onBack={onChangeProduct} onSelect={handleGoalSelect} />
}

export function LinkAttributionWizardV2({ org_id, onChangeProduct }: Props) {
  return (
    <ConversionTrackingProvider>
      <WizardContent org_id={org_id} onChangeProduct={onChangeProduct} />
    </ConversionTrackingProvider>
  )
}
