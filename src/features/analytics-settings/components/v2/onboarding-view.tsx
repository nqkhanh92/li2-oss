'use client'

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useGetOnboardingState } from '@/features/analytics-settings/hooks/use-onboarding-state'
import { useGetAnalyticsSettings } from '../../hooks/queries'
import { type ProductType } from '@/features/analytics-settings/types/types'
import {
  ProductSelectStep,
  ProductSelectStepSkeleton,
} from '../link-attribution-onboarding-v2/step-product-select'
import { LinkAttributionWizardV2 } from '../link-attribution-onboarding-v2/wizard'
import { BehaviorAnalyticsWizard } from './behavior-analytics-wizard/wizard'

type Phase = 'product-select' | 'stepper'

export const OnboardingView = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const { isLoading: isOnboardingLoading } = useGetOnboardingState(org_id)
  const { data: settings, isLoading: isSettingsLoading } = useGetAnalyticsSettings(org_id)

  const [phase, setPhase] = useState<Phase>('product-select')
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null)

  // TODO: restore saved product from previous session → skip straight to stepper
  // useEffect(() => {
  //   if (onboardingState?.product_type) {
  //     setSelectedProduct(onboardingState.product_type)
  //     setPhase('stepper')
  //   }
  // }, [onboardingState?.product_type])

  if (isOnboardingLoading || isSettingsLoading || !settings)
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ProductSelectStepSkeleton />
      </div>
    )

  // ── Phase 1: choose product ──────────────────────────────────────────────
  if (phase === 'product-select') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Suspense fallback={<ProductSelectStepSkeleton />}>
          <ProductSelectStep
            org_id={org_id}
            onSelect={(type) => {
              setSelectedProduct(type)
              setPhase('stepper')
            }}
          />
        </Suspense>
      </div>
    )
  }

  // ── Phase 2: stepper ─────────────────────────────────────────────────────
  if (selectedProduct === 'link_attribution') {
    return (
      <div className="max-w-7xl mx-auto sm:h-full">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-16 h-16 animate-spin" />
            </div>
          }
        >
          <LinkAttributionWizardV2
            org_id={org_id}
            onChangeProduct={() => setPhase('product-select')}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto sm:h-full">
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-16 h-16 animate-spin" />
          </div>
        }
      >
        <BehaviorAnalyticsWizard
          org_id={org_id}
          settings={settings}
          onChangeProduct={() => setPhase('product-select')}
        />
      </Suspense>
    </div>
  )
}
