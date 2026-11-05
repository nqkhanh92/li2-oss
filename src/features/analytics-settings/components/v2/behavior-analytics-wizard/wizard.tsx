'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Check, PartyPopper, Info, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { ConfettiCanvas } from '@/shared/components/ui/confetti-canvas'
import { SmartSetupResults } from '@/features/smart-setup/components/smart-setup-results'
import { StepSiteUrl } from './step-site-url'
import { StepScriptInstall } from './step-script-install'
import { StepVerify } from './step-verify'
import { StepFeatures, type FeatureKey } from './step-features'
import { StepTest } from './step-test'
import { BehaviorGoalSelect, type BehaviorGoal } from './step-goal-select'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import type { AnalyticsSettings } from '@/features/analytics-settings/hooks/queries'

export type BehaviorPlatform = 'html' | 'wordpress'

type BehaviorView = 'goal-select' | 'installation' | 'smart-setup'

const STEPS = [
  { id: 0, key: 'site_url' },
  { id: 1, key: 'install' },
  { id: 2, key: 'verify' },
  { id: 3, key: 'features' },
  { id: 4, key: 'test' },
] as const

interface Props {
  org_id: string
  settings: AnalyticsSettings
  onChangeProduct: () => void
}

interface InstallationWizardProps {
  org_id: string
  settings: AnalyticsSettings
  onBack: () => void
}

const REDIRECT_COUNTDOWN = 3

function InstallationWizard({ org_id, settings, onBack }: InstallationWizardProps) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const { orgRouterPush } = useOrganizationStoreProvider()
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [siteUrl, setSiteUrl] = useState('')
  const [platform, setPlatform] = useState<BehaviorPlatform>('html')
  const [savedFeatures, setSavedFeatures] = useState<Record<FeatureKey, boolean> | null>(null)
  const [countdown, setCountdown] = useState(REDIRECT_COUNTDOWN)

  const allDone = completedSteps.size === STEPS.length

  useEffect(() => {
    if (!allDone) return
    setCountdown(REDIRECT_COUNTDOWN)
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id)
          orgRouterPush('site-analytics')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [allDone, orgRouterPush])

  const isStepLocked = (id: number) => {
    if (id >= 1 && !completedSteps.has(0)) return true
    if (id >= 3 && !completedSteps.has(2)) return true
    return false
  }

  const markCompleted = (id: number) => {
    setCompletedSteps((prev) => new Set([...prev, id]))
    const next = STEPS.find((s) => s.id > id && !completedSteps.has(s.id))
    if (next) setActiveStep(next.id)
  }

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-12 py-6 sm:h-full">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('common.back')}
        </button>
        <h1 className="text-xl font-semibold text-primary leading-7">
          {t('wizard.title')}
        </h1>
        <p className="text-s text-muted-foreground">{t('wizard.subtitle')}</p>
      </div>

      {/* Two-column stepper */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 min-h-0 rounded-xl border border-border bg-card overflow-hidden p-4 sm:p-6 relative">
        {allDone && (
          <>
            <ConfettiCanvas bursts={10} perBurst={15} interval={160} />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-card/90 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-semantic-success/10">
                  <PartyPopper className="h-8 w-8 text-semantic-success" />
                </div>
                <h2 className="text-xl font-semibold text-primary">{t('wizard.all_set_title')}</h2>
                <p className="text-s text-muted-foreground max-w-xs">{t('wizard.all_set_description')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('wizard.redirect_countdown', { count: countdown })}
                </p>
              </div>
              <Button onClick={() => orgRouterPush('site-analytics')}>
                {t('wizard.go_to_site_analytics')}
              </Button>
            </div>
          </>
        )}

        {/* Left: step list */}
        <div className="flex flex-col sm:w-52 sm:shrink-0 pt-1">
          {STEPS.map((step, index) => {
            const isActive = activeStep === step.id
            const isCompleted = completedSteps.has(step.id)
            const isLast = index === STEPS.length - 1

            return (
              <div key={step.id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => { if (!isStepLocked(step.id)) setActiveStep(step.id) }}
                  disabled={isStepLocked(step.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 -mx-3 transition-colors text-left',
                    isActive && 'bg-primary/[0.05]',
                    isStepLocked(step.id) && 'cursor-not-allowed opacity-40'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all',
                      isCompleted
                        ? 'border-semantic-success bg-semantic-success text-white'
                        : isActive
                          ? 'border-primary bg-white text-primary'
                          : 'border-slate-200 bg-white text-slate-400'
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id + 1}
                  </div>

                  <div>
                    <p
                      className={cn(
                        'text-sm font-medium transition-colors',
                        isActive ? 'text-primary' : isCompleted ? 'text-semantic-success' : 'text-slate-400'
                      )}
                    >
                      {t(`wizard.steps.${step.key}`)}
                    </p>
                    {isCompleted && (
                      <p className="text-xs font-medium text-semantic-success mt-0.5">{t('common.done')}</p>
                    )}
                    {isActive && !isCompleted && (
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">{t('common.in_progress')}</p>
                    )}
                  </div>
                </button>

                {!isLast && (
                  <div
                    className={cn(
                      'w-px self-start ml-[1.125rem] my-1 min-h-6 transition-colors',
                      isCompleted ? 'bg-semantic-success' : 'bg-slate-200'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="h-px w-full sm:h-auto sm:w-px bg-border shrink-0" />

        {/* Right: content */}
        <div className={cn('flex-1 min-w-0 pr-3', activeStep === 3 ? 'flex flex-col overflow-hidden' : 'overflow-y-auto pb-2 pr-3')}>
          {activeStep === 0 && (
            <StepSiteUrl
              org_id={org_id}
              onNext={(url, plt) => {
                setSiteUrl(url)
                setPlatform(plt)
                markCompleted(0)
              }}
            />
          )}
          {activeStep === 1 && (
            <StepScriptInstall
              platform={platform}
              settings={settings}
              siteUrl={siteUrl}
              onNext={() => markCompleted(1)}
            />
          )}
          {activeStep === 2 && (
            <StepVerify
              org_id={org_id}
              siteUrl={siteUrl}
              platform={platform}
              settings={settings}
              onComplete={() => markCompleted(2)}
            />
          )}
          {activeStep === 3 && (
            <StepFeatures
              org_id={org_id}
              settings={settings}
              onComplete={(features) => {
                setSavedFeatures(features)
                markCompleted(3)
              }}
            />
          )}
          {activeStep === 4 && (
            <StepTest
              org_id={org_id}
              siteUrl={siteUrl}
              features={savedFeatures ?? {} as Record<FeatureKey, boolean>}
              onComplete={() => markCompleted(4)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface SmartSetupViewProps {
  org_id: string
  onBack: () => void
  onGoToInstallation: () => void
}

function SmartSetupView({ org_id, onBack, onGoToInstallation }: SmartSetupViewProps) {
  const { t, i18n } = useTranslation('behavior_analytics_onboarding')
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-12 py-6 sm:h-full">
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('common.back')}
        </button>
        <h1 className="text-xl font-semibold text-primary leading-7">
          {t('goal_select.goals.ai_setup.title')}
        </h1>
        <p className="text-s text-muted-foreground">{t('goal_select.goals.ai_setup.description')}</p>
      </div>

      <div className="shrink-0 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-800">{t('smart_setup.no_script_title')}</p>
          <p className="text-xs text-blue-700 mt-0.5">{t('smart_setup.no_script_desc')}</p>
        </div>
        <button
          type="button"
          onClick={onGoToInstallation}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors whitespace-nowrap"
        >
          {t('smart_setup.no_script_cta')}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 pt-6">
            <SmartSetupResults
              orgId={org_id}
              locale={i18n.language as 'en' | 'vi'}
              onComplete={onBack}
              onSkip={onBack}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function BehaviorAnalyticsWizard({ org_id, settings, onChangeProduct }: Props) {
  const [view, setView] = useState<BehaviorView>('goal-select')

  const handleGoalSelect = (goal: BehaviorGoal) => {
    if (goal === 'installation') setView('installation')
    if (goal === 'ai_setup') setView('smart-setup')
  }

  if (view === 'installation') {
    return (
      <InstallationWizard
        org_id={org_id}
        settings={settings}
        onBack={() => setView('goal-select')}
      />
    )
  }

  if (view === 'smart-setup') {
    return (
      <SmartSetupView
        org_id={org_id}
        onBack={() => setView('goal-select')}
        onGoToInstallation={() => setView('installation')}
      />
    )
  }

  return <BehaviorGoalSelect onBack={onChangeProduct} onSelect={handleGoalSelect} />
}
