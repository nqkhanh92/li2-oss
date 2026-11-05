'use client'

import { CodeBlock } from '@/shared/components/customize/code-block'
import { useTranslation } from 'react-i18next'

const JS_SNIPPET = `// Step 1: User views pricing page
li2Analytics.trackEvent('funnel_step', {
  funnelName: 'checkout',
  step: 1,
  stepName: 'pricing_view',
})

// Step 2: User starts checkout
li2Analytics.trackEvent('funnel_step', {
  funnelName: 'checkout',
  step: 2,
  stepName: 'checkout_start',
})

// Step 3: User completes purchase
li2Analytics.trackEvent('funnel_step', {
  funnelName: 'checkout',
  step: 3,
  stepName: 'purchase_complete',
})`

const REACT_SNIPPET = `import { trackEvent } from '@li2/analytics'

// Call at each stage of your funnel
function PricingPage() {
  useEffect(() => {
    trackEvent('funnel_step', {
      funnelName: 'checkout',
      step: 1,
      stepName: 'pricing_view',
    })
  }, [])
  // ...
}`

export const FunnelSetupGuide = () => {
  const { t } = useTranslation('analytics_settings')
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        {t('onboarding.funnel.subtitle')}
      </p>

      <CodeBlock
        section="funnel"
        tabs={[
          { label: 'JavaScript', code: JS_SNIPPET },
          { label: 'React', code: REACT_SNIPPET },
        ]}
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-700 mb-2">{t('onboarding.funnel.tips_title')}</p>
        <ul className="flex flex-col gap-1.5 text-xs text-slate-600 list-disc list-inside">
          <li>{t('onboarding.funnel.tip_1')}</li>
          <li>{t('onboarding.funnel.tip_2')}</li>
          <li>{t('onboarding.funnel.tip_3')}</li>
        </ul>
      </div>
    </div>
  )
}
