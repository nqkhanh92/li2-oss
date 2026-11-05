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
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import {
  useGetAnalyticsSettings,
  type AnalyticsFeatures,
  type TrackingSettings,
  type AnalyticsSettings,
} from '../hooks/queries'
import { useUpdateFeatures, useUpdateOutboundDomains, useUpdateTracking } from '../hooks/mutations'
import { KeyDisplay } from './key-display'
import { KeyMetadata } from './key-metadata'
import { RegenerateDialog } from './regenerate-dialog'
import { AllowedHostnamesSection } from './allowed-hostnames-section'
import { DataCollectionRulesSection } from './data-collection-rules-section'
import { DebugModeSection } from './debug-mode-section'
import { ConversionScriptsSection } from './conversion-scripts-section'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { cn } from '@/shared/lib/utils'
import {
  DEFAULT_ANALYTICS_FEATURES,
  DEFAULT_TRACKING_SETTINGS,
} from '@/core/types/analytics-settings.type'

type FeatureKey = Exclude<keyof AnalyticsFeatures, 'visibility_tracking'>

const FEATURE_CONFIGS: {
  key: FeatureKey
  icon: React.ElementType
  iconBg: string
  iconColor: string
}[] = [
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

function FeaturesTab({ org_id, settings }: { org_id: string; settings: AnalyticsSettings }) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const { t: tSetting } = useTranslation('setting')
  const updateFeatures = useUpdateFeatures(org_id)
  const updateOutbound = useUpdateOutboundDomains(org_id)

  const initial = settings.features ?? DEFAULT_ANALYTICS_FEATURES
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    pageview_tracking: initial.pageview_tracking,
    click_tracking: initial.click_tracking,
    scroll_tracking: initial.scroll_tracking,
    form_tracking: initial.form_tracking,
    outbound_tracking: initial.outbound_tracking,
    session_recording: initial.session_recording,
  })
  const [outboundDomains, setOutboundDomains] = useState<string[]>(settings.outbound_domains ?? [])
  const [domainInput, setDomainInput] = useState('')

  const addDomain = () => {
    const trimmed = domainInput.trim()
    if (!trimmed || outboundDomains.includes(trimmed)) return
    setOutboundDomains((prev) => [...prev, trimmed])
    setDomainInput('')
  }

  const handleSave = async () => {
    await Promise.all([
      updateFeatures.mutateAsync({ ...features, visibility_tracking: true }),
      updateOutbound.mutateAsync(outboundDomains),
    ])
  }

  const isPending = updateFeatures.isPending || updateOutbound.isPending

  return (
    <div className="flex flex-col gap-4">
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
                  htmlFor={`panel-feature-${key}`}
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
              id={`panel-feature-${key}`}
              checked={features[key]}
              onCheckedChange={(v) => setFeatures((prev) => ({ ...prev, [key]: v }))}
            />
          </div>
        ))}
      </div>

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
                    onClick={() => setOutboundDomains((prev) => prev.filter((x) => x !== d))}
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

      <div className="flex justify-end pt-2 border-t border-border">
        <LoadingButton onClick={handleSave} isLoading={isPending}>
          <Check className="w-4 h-4 mr-1.5" />
          {tSetting('analytics_settings.save_btn')}
        </LoadingButton>
      </div>
    </div>
  )
}

function TrackingTab({ org_id, settings }: { org_id: string; settings: AnalyticsSettings }) {
  const { t } = useTranslation('setting')
  const { t: tOnboard } = useTranslation('behavior_analytics_onboarding')
  const updateTracking = useUpdateTracking(org_id)
  const [tracking, setTracking] = useState<TrackingSettings>(
    settings.tracking ?? DEFAULT_TRACKING_SETTINGS
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            {tOnboard('step_features.tracking_cookie_path')}
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
            {tOnboard('step_features.tracking_cookie_path_desc')}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            {tOnboard('step_features.tracking_cookie_domain')}
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
            {tOnboard('step_features.tracking_cookie_domain_desc')}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            {tOnboard('step_features.tracking_session_timeout')}
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
            {tOnboard('step_features.tracking_session_timeout_desc')}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            {tOnboard('step_features.tracking_cookie_expires')}
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
            {tOnboard('step_features.tracking_cookie_expires_desc')}
          </p>
        </div>
      </div>
      <div className="flex justify-end pt-2 border-t border-border">
        <LoadingButton
          onClick={() => updateTracking.mutate(tracking)}
          isLoading={updateTracking.isPending}
        >
          <Check className="w-4 h-4 mr-1.5" />
          {t('analytics_settings.save_btn')}
        </LoadingButton>
      </div>
    </div>
  )
}

export function AnalyticsSettingsPanel() {
  const { organization } = useOrganizationStoreProvider()
  const org_id = organization?.id || ''
  const { t } = useTranslation('setting')
  const { data: settings, isLoading } = useGetAnalyticsSettings(org_id)

  if (isLoading) {
    return <Skeleton className="h-[400px] rounded-2xl" />
  }

  if (!settings) return null

  return (
    <Tabs defaultValue="publishable_key" className="w-full">
      <TabsList variant="outline" className="mb-4 border-b border-border w-full justify-start rounded-none h-auto pb-0 gap-1">
        <TabsTrigger variant="outline" value="publishable_key">
          {t('analytics_settings.tabs.publishable_key')}
        </TabsTrigger>
        <TabsTrigger variant="outline" value="features">
          {t('analytics_settings.tabs.features')}
        </TabsTrigger>
        <TabsTrigger variant="outline" value="tracking">
          {t('analytics_settings.tabs.tracking')}
        </TabsTrigger>
        <TabsTrigger variant="outline" value="allowed_domains">
          {t('analytics_settings.tabs.allowed_domains')}
        </TabsTrigger>
        <TabsTrigger variant="outline" value="data_collection">
          {t('analytics_settings.tabs.data_collection')}
        </TabsTrigger>
        <TabsTrigger variant="outline" value="debug">
          {t('analytics_settings.tabs.debug')}
        </TabsTrigger>
        <TabsTrigger variant="outline" value="scripts">
          {t('analytics_settings.tabs.scripts')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="publishable_key" className="mt-0 pt-4">
        <div className="flex flex-col gap-4">
          <KeyDisplay publishableKey={settings.publishable_key} />
          <KeyMetadata createdAt={settings.publishable_key_created_at} />
          <RegenerateDialog org_id={org_id} />
        </div>
      </TabsContent>

      <TabsContent value="features" className="mt-0 pt-4">
        <FeaturesTab org_id={org_id} settings={settings} />
      </TabsContent>

      <TabsContent value="tracking" className="mt-0 pt-4">
        <TrackingTab org_id={org_id} settings={settings} />
      </TabsContent>

      <TabsContent value="allowed_domains" className="mt-0 pt-4">
        <AllowedHostnamesSection org_id={org_id} hostnames={settings.allowed_hostnames} />
      </TabsContent>

      <TabsContent value="data_collection" className="mt-0 pt-4">
        <DataCollectionRulesSection org_id={org_id} rules={settings.data_collection_rules} />
      </TabsContent>

      <TabsContent value="debug" className="mt-0 pt-4">
        <DebugModeSection org_id={org_id} debug_mode_enabled={settings.debug_mode_enabled} />
      </TabsContent>

      <TabsContent value="scripts" className="mt-0 pt-4">
        <ConversionScriptsSection org_id={org_id} scripts={settings.custom_scripts ?? []} />
      </TabsContent>
    </Tabs>
  )
}
