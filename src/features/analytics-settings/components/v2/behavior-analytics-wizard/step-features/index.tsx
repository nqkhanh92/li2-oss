'use client'

import { useState } from 'react'
import {
  Eye,
  MousePointerClick,
  ChevronsDown,
  FileText,
  ExternalLink,
  Clapperboard,
  Check,
  Plus,
  X,
  Settings2,
  ChevronDown,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { cn } from '@/shared/lib/utils'
import { useUpdateOnboardingSettings } from '@/features/analytics-settings/hooks/mutations'
import {
  DEFAULT_ANALYTICS_FEATURES,
  DEFAULT_TRACKING_SETTINGS,
} from '@/core/types/analytics-settings.type'
import type {
  AnalyticsSettings,
  AnalyticsFeatures,
  TrackingSettings,
} from '@/features/analytics-settings/hooks/queries'

export type FeatureKey = Exclude<keyof AnalyticsFeatures, 'visibility_tracking'>

interface FeatureConfig {
  key: FeatureKey
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

const FEATURE_CONFIGS: FeatureConfig[] = [
  { key: 'pageview_tracking', icon: Eye, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
  {
    key: 'click_tracking',
    icon: MousePointerClick,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
  },
  {
    key: 'scroll_tracking',
    icon: ChevronsDown,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
  },
  { key: 'form_tracking', icon: FileText, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  {
    key: 'session_recording',
    icon: Clapperboard,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
  },
  {
    key: 'outbound_tracking',
    icon: ExternalLink,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
]

interface Props {
  org_id: string
  settings: AnalyticsSettings
  onComplete: (features: Record<FeatureKey, boolean>) => void
}

export function StepFeatures({ org_id, settings, onComplete }: Props) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const updateOnboardingSettings = useUpdateOnboardingSettings(org_id)

  const initialFeatures: AnalyticsFeatures = settings.features ?? DEFAULT_ANALYTICS_FEATURES

  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    pageview_tracking: initialFeatures.pageview_tracking,
    click_tracking: initialFeatures.click_tracking,
    scroll_tracking: initialFeatures.scroll_tracking,
    form_tracking: initialFeatures.form_tracking,
    outbound_tracking: initialFeatures.outbound_tracking,
    session_recording: initialFeatures.session_recording,
  })

  const [outboundDomains, setOutboundDomains] = useState<string[]>(settings.outbound_domains ?? [])
  const [domainInput, setDomainInput] = useState('')

  const initialTracking: TrackingSettings = settings.tracking ?? DEFAULT_TRACKING_SETTINGS
  const [tracking, setTracking] = useState<TrackingSettings>(initialTracking)
  const [trackingExpanded, setTrackingExpanded] = useState(false)

  const addDomain = () => {
    const trimmed = domainInput.trim()
    if (!trimmed || outboundDomains.includes(trimmed)) return
    setOutboundDomains((prev) => [...prev, trimmed])
    setDomainInput('')
  }

  const removeDomain = (d: string) => setOutboundDomains((prev) => prev.filter((x) => x !== d))

  const handleSave = async () => {
    await updateOnboardingSettings.mutateAsync({ features, outbound_domains: outboundDomains, tracking })
    onComplete(features)
  }

  const isPending = updateOnboardingSettings.isPending

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-base font-semibold text-foreground">{t('step_features.title')}</h2>
        <p className="text-s text-muted-foreground">{t('step_features.subtitle')}</p>
      </div>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pr-3 gap-4 pb-4 space-y-4">
        {/* Feature toggles */}
        <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
          {FEATURE_CONFIGS.map(({ key, icon: Icon, iconBg, iconColor }) => (
            <div
              key={key}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors',
                features[key] ? 'border-primary/20' : 'border-border'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn('rounded-md p-1.5 shrink-0', iconBg)}>
                  <Icon className={cn('h-3.5 w-3.5', iconColor)} />
                </div>
                <div>
                  <Label
                    htmlFor={`feature-${key}`}
                    className="cursor-pointer text-xs font-medium text-foreground"
                  >
                    {t(`step_features.${key}`)}
                  </Label>
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    {t(`step_features.${key}_desc`)}
                  </p>
                </div>
              </div>
              <Switch
                id={`feature-${key}`}
                checked={features[key]}
                onCheckedChange={(v: any) => setFeatures((prev) => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Outbound domains panel */}
        {features.outbound_tracking && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-4 py-3 flex flex-col gap-3">
            <p className="text-xs font-medium text-amber-800">
              {t('step_features.outbound_domains_label')}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addDomain()
                  }
                }}
                className="bg-white text-sm h-8"
              />
              <button
                type="button"
                onClick={addDomain}
                disabled={!domainInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 h-8 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('step_features.outbound_add_btn')}
              </button>
            </div>
            {outboundDomains.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {outboundDomains.map((d) => (
                  <span
                    key={d}
                    className="flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-0.5 font-mono text-xs text-amber-800"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeDomain(d)}
                      className="ml-0.5 text-amber-400 hover:text-amber-700 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-600/70">{t('step_features.outbound_empty')}</p>
            )}
          </div>
        )}

        {/* Tracking options — collapsible */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setTrackingExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                {t('step_features.tracking_options_title')}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                trackingExpanded && 'rotate-180'
              )}
            />
          </button>

          {trackingExpanded && (
            <div className="border-t border-border px-4 py-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('step_features.tracking_cookie_path')}
                  </Label>
                  <Input
                    value={tracking.cookie_path}
                    onChange={(e) =>
                      setTracking((prev) => ({ ...prev, cookie_path: e.target.value || '/' }))
                    }
                    placeholder="/"
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t('step_features.tracking_cookie_path_desc')}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('step_features.tracking_cookie_domain')}
                  </Label>
                  <Input
                    value={tracking.cookie_domain ?? ''}
                    onChange={(e) =>
                      setTracking((prev) => ({
                        ...prev,
                        cookie_domain: e.target.value.trim() || null,
                      }))
                    }
                    placeholder=".example.com"
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t('step_features.tracking_cookie_domain_desc')}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('step_features.tracking_session_timeout')}
                  </Label>
                  <Input
                    type="number"
                    min={60}
                    value={tracking.session_timeout}
                    onChange={(e) =>
                      setTracking((prev) => ({
                        ...prev,
                        session_timeout: Math.max(60, Number(e.target.value)),
                      }))
                    }
                    className="h-8 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t('step_features.tracking_session_timeout_desc')}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('step_features.tracking_cookie_expires')}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={tracking.cookie_expires_in_days}
                    onChange={(e) =>
                      setTracking((prev) => ({
                        ...prev,
                        cookie_expires_in_days: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="h-8 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t('step_features.tracking_cookie_expires_desc')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 pt-3 border-t border-border flex justify-end">
        <LoadingButton onClick={handleSave} isLoading={isPending}>
          <Check className="w-4 h-4 mr-1.5" />
          {t('step_features.save_btn')}
        </LoadingButton>
      </div>
    </div>
  )
}
