'use client'

import { useState } from 'react'
import { Globe, FileCode2, CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import { useAddHostname } from '@/features/analytics-settings/hooks/mutations'
import { useDetectFramework } from '@/features/analytics-settings/components/link-attribution-onboarding-v2/step-conversion-tracking/hooks/use-detect-framework'
import type { BehaviorPlatform } from '../wizard'

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.hostname.includes('.') && url.hostname.length > 3
  } catch {
    return false
  }
}

interface PlatformOption {
  key: BehaviorPlatform
  icon: React.ElementType
  iconBg: string
  iconColor: string
  selectedBorder: string
  selectedBg: string
}

const PLATFORMS: PlatformOption[] = [
  {
    key: 'html',
    icon: FileCode2,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    selectedBorder: 'border-indigo-400',
    selectedBg: 'bg-indigo-50/50',
  },
  {
    key: 'wordpress',
    icon: Globe,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    selectedBorder: 'border-blue-400',
    selectedBg: 'bg-blue-50/50',
  },
]

interface Props {
  org_id: string
  onNext: (siteUrl: string, platform: BehaviorPlatform) => void
}

export function StepSiteUrl({ org_id, onNext }: Props) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const [siteUrl, setSiteUrl] = useState('')
  const addHostname = useAddHostname(org_id, true)

  const hasInput = siteUrl.trim() !== ''
  const urlValid = !hasInput || isValidUrl(siteUrl)
  const { framework, isDetecting } = useDetectFramework(hasInput && urlValid ? siteUrl : '')

  const canSelect = hasInput && urlValid && !isDetecting

  const handleSelect = (platform: BehaviorPlatform) => {
    if (!canSelect) return
    const trimmed = siteUrl.trim()
    try {
      const normalized = trimmed.includes('://') ? trimmed : `https://${trimmed}`
      const hostname = new URL(normalized).hostname
      if (hostname) addHostname.mutate(hostname)
    } catch {}
    onNext(trimmed, platform)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{t('step_site_url.title')}</h2>
        <p className="text-s text-muted-foreground">{t('step_site_url.subtitle')}</p>
      </div>

      {/* URL input */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Input
            placeholder="https://example.com"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            className={cn('pr-9', hasInput && !urlValid && 'border-destructive focus-visible:ring-destructive')}
          />
          {isDetecting && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {hasInput && !urlValid && (
          <p className="text-xs text-destructive">{t('step_site_url.invalid_url')}</p>
        )}
        {hasInput && urlValid && !isDetecting && framework === 'wordpress' && (
          <div className="flex items-center gap-1.5 text-xs text-semantic-success">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {t('step_site_url.wordpress_detected')}
          </div>
        )}
        {isDetecting && (
          <p className="text-xs text-muted-foreground">{t('step_site_url.detecting')}</p>
        )}
      </div>

      <div className="w-full h-px bg-border" />

      {/* Platform cards */}
      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map((opt) => {
          const Icon = opt.icon
          const isDetectedMatch = canSelect && framework === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleSelect(opt.key)}
              disabled={!canSelect}
              className={cn(
                'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                canSelect
                  ? isDetectedMatch
                    ? cn(opt.selectedBorder, opt.selectedBg, 'shadow-sm')
                    : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                  : 'border-border bg-card opacity-40 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'rounded-lg p-2 shrink-0 mt-0.5 transition-colors',
                isDetectedMatch ? cn(opt.iconBg, opt.iconColor) : 'bg-muted text-muted-foreground'
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-semibold text-foreground leading-5">
                  {t(`step_site_url.platform_${opt.key}`)}
                </span>
                <span className="text-xs text-muted-foreground leading-4">
                  {t(`step_site_url.platform_${opt.key}_desc`)}
                </span>
              </div>
              {isDetectedMatch && (
                <span className="ml-auto shrink-0 self-start rounded-full bg-semantic-success/10 px-2 py-0.5 text-xs font-semibold text-semantic-success whitespace-nowrap">
                  Detected
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!hasInput && (
        <p className="text-xs text-muted-foreground text-center">{t('step_site_url.platform_hint')}</p>
      )}
    </div>
  )
}
