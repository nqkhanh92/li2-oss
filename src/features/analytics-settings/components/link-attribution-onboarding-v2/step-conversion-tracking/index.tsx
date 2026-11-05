'use client'

import { ArrowLeft, Loader2, Globe, Code2, CheckCircle2, FileCode2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/components/ui/input'
import { useConversionTracking, type ConversionEnvironment } from './context'

interface EnvironmentConfig {
  key: ConversionEnvironment
  icon: React.ElementType
  enabled: boolean
}

const ENVIRONMENTS: EnvironmentConfig[] = [
  { key: 'wordpress', icon: Globe, enabled: true },
  { key: 'manual', icon: FileCode2, enabled: true },
  { key: 'api', icon: Code2, enabled: false },
]

interface Props {
  onBack: () => void
  onSelect: (env: ConversionEnvironment) => void
}

function isValidUrl(value: string): boolean {
  try {
    const normalized = value.trim().replace(/\/$/, '')
    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`
    const { hostname } = new URL(withProtocol)
    return hostname.includes('.') && hostname.length > 3
  } catch {
    return false
  }
}

export function ConversionTrackingEnvironmentSelect({ onBack, onSelect }: Props) {
  const { t } = useTranslation('link_attribution_onboarding')
  const { siteUrl, setSiteUrl, framework, isDetecting } = useConversionTracking()

  const hasInput = siteUrl.trim() !== ''
  const urlValid = !hasInput || isValidUrl(siteUrl)
  const sectionsLocked = !hasInput || !urlValid || isDetecting

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-12 py-6 w-full sm:h-full">
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
          {t('v2.conversion_tracking.title')}
        </h1>
        <p className="text-s text-muted-foreground">{t('v2.conversion_tracking.subtitle')}</p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 shrink-0">
        {/* URL input */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Input
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder={t('v2.conversion_tracking.url_placeholder')}
              className={cn('pr-9', hasInput && !urlValid && 'border-destructive focus-visible:ring-destructive')}
            />
            {isDetecting && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {hasInput && !urlValid && (
            <p className="text-xs text-destructive">{t('v2.conversion_tracking.url_invalid')}</p>
          )}
          {hasInput && urlValid && !isDetecting && framework === 'wordpress' && (
            <div className="flex items-center gap-1.5 text-xs text-semantic-success">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {t('v2.conversion_tracking.wordpress_detected')}
            </div>
          )}
          {!hasInput && (
            <p className="text-xs text-muted-foreground">{t('v2.conversion_tracking.url_hint')}</p>
          )}
        </div>

        <div className="w-full h-px bg-border" />

        {/* Environment list */}
        <div className="flex flex-col gap-2">
          {[...ENVIRONMENTS]
            .sort((a, b) => Number(b.enabled) - Number(a.enabled))
            .map((env) => {
              const Icon = env.icon
              const isDetectedMatch = !sectionsLocked && framework === env.key
              const isClickable = env.enabled && !sectionsLocked

              if (!isClickable) {
                return (
                  <div
                    key={env.key}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-border bg-card p-4 select-none transition-opacity',
                      sectionsLocked
                        ? 'opacity-40 cursor-not-allowed'
                        : 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="mt-0.5 rounded-lg p-2 shrink-0 bg-slate-100 text-slate-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground leading-5">
                        {t(`v2.conversion_tracking.environments.${env.key}.title`)}
                      </span>
                      <span className="text-xs text-muted-foreground leading-4">
                        {t(`v2.conversion_tracking.environments.${env.key}.description`)}
                      </span>
                    </div>
                    {isDetecting && siteUrl.trim() && env.enabled ? (
                      <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                        {t('v2.conversion_tracking.detecting')}
                      </span>
                    ) : !env.enabled ? (
                      <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                        {t('v2.common.coming_soon')}
                      </span>
                    ) : null}
                  </div>
                )
              }

              return (
                <button
                  key={env.key}
                  type="button"
                  onClick={() => onSelect(env.key)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    isDetectedMatch
                      ? 'border-semantic-success bg-semantic-success/[0.04] shadow-sm'
                      : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 rounded-lg p-2 shrink-0 transition-colors',
                      isDetectedMatch
                        ? 'bg-semantic-success/10 text-semantic-success'
                        : 'bg-indigo-50 text-indigo-600'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground leading-5">
                      {t(`v2.conversion_tracking.environments.${env.key}.title`)}
                    </span>
                    <span className="text-xs text-muted-foreground leading-4">
                      {t(`v2.conversion_tracking.environments.${env.key}.description`)}
                    </span>
                  </div>
                  {isDetectedMatch && (
                    <span className="ml-auto shrink-0 rounded-full bg-semantic-success/10 px-2 py-0.5 text-xs font-semibold text-semantic-success">
                      {t('v2.conversion_tracking.detected')}
                    </span>
                  )}
                </button>
              )
            })}
        </div>
      </div>
    </div>
  )
}
