'use client'

import { Suspense, useState } from 'react'
import { ArrowLeft, Loader2, Sparkles, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { ClaimSubdomainDialog } from '@/features/custom-domains/components/claim-subdomain-dialog'
import { AddCustomDomainStepper } from '@/features/custom-domains/components/add-stepper/add-stepper'
import { useDomainStore } from '@/shared/stores/domain-stepper-store'

type DomainMethod = 'claim_subdomain' | 'custom_domain'

interface OptionConfig {
  key: DomainMethod
  icon: React.ElementType
  iconBg: string
  iconColor: string
  selectedBorder: string
  selectedBg: string
  recommended?: boolean
}

const OPTIONS: OptionConfig[] = [
  {
    key: 'claim_subdomain',
    icon: Sparkles,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    selectedBorder: 'border-emerald-400',
    selectedBg: 'bg-emerald-50/60',
    recommended: true,
  },
  {
    key: 'custom_domain',
    icon: Settings2,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    selectedBorder: 'border-indigo-400',
    selectedBg: 'bg-indigo-50/60',
  },
]

interface Props {
  onBack: () => void
  onComplete: (domainId: string | null) => void
}

export function StepDomainSetupV2({ onBack, onComplete }: Props) {
  const { t } = useTranslation('link_attribution_onboarding')
  const [selectedMethod, setSelectedMethod] = useState<DomainMethod | null>(null)
  const domainId = useDomainStore((s) => s.domainId)

  const noop = () => {}

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-12 py-6 w-full sm:h-full sm:overflow-y-auto pr-3" style={{ scrollbarGutter: 'stable' }}>
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('v2.common.back')}
        </button>
        <h1 className="text-xl font-semibold text-primary leading-7">
          {t('domain_setup.title')}
        </h1>
        <p className="text-s text-muted-foreground">{t('domain_setup.description')}</p>
      </div>

      {/* Option cards */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const selected = selectedMethod === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedMethod(opt.key)}
              className={cn(
                'relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150',
                'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                selected
                  ? cn(opt.selectedBorder, opt.selectedBg, 'shadow-sm')
                  : 'border-border bg-card hover:border-slate-300'
              )}
            >
              {opt.recommended && (
                <span className="absolute -top-2.5 left-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                  {t('domain_setup.recommended_badge')}
                </span>
              )}
              {opt.key === 'claim_subdomain' && (
                <span className={cn(
                  'absolute top-3 right-3 rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                  selected
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-600'
                )}>
                  {t('domain_setup.free_badge')}
                </span>
              )}
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', opt.iconBg, opt.iconColor)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1 pr-10">
                <p className="text-sm font-semibold text-foreground">
                  {t(`domain_setup.${opt.key}`)}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t(`domain_setup.${opt.key}_description`)}
                </p>
                <p className={cn(
                  'mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[11px]',
                  selected ? cn(opt.iconBg, opt.iconColor) : 'bg-slate-100 text-slate-500'
                )}>
                  {t(`domain_setup.${opt.key}_example`)}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Expanded: claim free subdomain */}
      {selectedMethod === 'claim_subdomain' && (
        <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <Suspense
            fallback={
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            }
          >
            <ClaimSubdomainDialog
              onFinish={noop}
              onSuccess={(id) => onComplete(id)}
            />
          </Suspense>
        </div>
      )}

      {/* Expanded: add custom domain */}
      {selectedMethod === 'custom_domain' && (
        <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
          <AddCustomDomainStepper
            onFinish={() => onComplete(domainId)}
            setDialogSize={noop as never}
            setDialogTitle={noop as never}
            setDialogDescription={noop as never}
          />
        </div>
      )}
    </div>
  )
}
