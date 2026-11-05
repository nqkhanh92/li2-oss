'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import {
  Loader2,
  Link2,
  AlertTriangle,
  CheckCircle2,
  X,
  XCircle,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react'

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-164-39.3c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 126.4-317.9 250.8-317.9 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  )
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.523 15.341a.51.51 0 0 1-.508.508.51.51 0 0 1-.508-.508V9.4a.51.51 0 0 1 .508-.508.51.51 0 0 1 .508.508v5.941zm-10.546 0a.51.51 0 0 1-.508.508.51.51 0 0 1-.508-.508V9.4a.51.51 0 0 1 .508-.508.51.51 0 0 1 .508.508v5.941zM8.24 1.952l-.95-1.646a.198.198 0 0 0-.27-.073.198.198 0 0 0-.073.27l.96 1.66A6.2 6.2 0 0 0 5.6 4.498C4.596 5.5 4 6.883 4 8.411h16c0-1.528-.596-2.912-1.6-3.913a6.2 6.2 0 0 0-2.307-1.535l.96-1.66a.198.198 0 0 0-.073-.27.198.198 0 0 0-.27.073l-.95 1.646A7.9 7.9 0 0 0 12 2.077a7.9 7.9 0 0 0-3.76.875zM9.67 5.79a.588.588 0 1 1 0-1.176.588.588 0 0 1 0 1.176zm4.66 0a.588.588 0 1 1 0-1.176.588.588 0 0 1 0 1.176zM4 9.43v8.228c0 .76.617 1.377 1.377 1.377h.846v3.457A.51.51 0 0 0 6.73 23a.51.51 0 0 0 .508-.508v-3.457h9.524v3.457A.51.51 0 0 0 17.27 23a.51.51 0 0 0 .508-.508v-3.457h.845A1.377 1.377 0 0 0 20 17.658V9.43H4z" />
    </svg>
  )
}
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Switch } from '@/shared/components/ui/switch'
import { useUpdateCustomDomain } from '@/features/custom-domains/hooks/mutations'
import type { CustomDomain } from '@/features/custom-domains/hooks/queries'
import {
  deepLinkAppsConfigSchema,
  parseDeepLinkConfig,
  type DeepLinkAppsConfig,
} from '@/shared/schemas/custom-domains'
import { useVerifyDeepLinks } from '@/features/custom-domains/hooks/use-verify-deep-links'
import type {
  DeepLinkVerificationResult,
  EndpointCheck,
  CheckStatus,
} from '@/ee/core/services/deep-link-verification.service'
import React from 'react'

interface DeepLinkConfigPanelProps {
  domain: CustomDomain
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const EMPTY_CONFIG: DeepLinkAppsConfig = { enabled: false, apps: [] }

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  CheckStatus,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  ok: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    label: 'Live & correct',
  },
  not_found: {
    icon: WifiOff,
    color: 'text-red-500',
    bg: 'bg-red-50',
    label: 'Not found (404)',
  },
  invalid_json: {
    icon: AlertCircle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    label: 'Invalid JSON',
  },
  mismatch: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    label: 'Content mismatch',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    label: 'Error',
  },
  timeout: {
    icon: Clock,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    label: 'Timed out',
  },
}

// ─── Platform Tile ────────────────────────────────────────────────────────────

function PlatformTile({
  icon: Icon,
  label,
  accentColor,
  active,
  selected,
  onToggle,
  onSelect,
}: {
  icon: React.ElementType
  label: string
  accentColor: string
  active: boolean
  selected: boolean
  onToggle: () => void
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => (active ? onSelect() : onToggle())}
      className="group relative flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200"
      style={{
        borderColor: selected ? accentColor : active ? `${accentColor}55` : '#e2e8f0',
        background: selected ? `${accentColor}08` : active ? `${accentColor}04` : 'transparent',
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
          style={{ background: active ? `${accentColor}18` : '#f1f5f9' }}
        >
          <Icon
            className="h-4.5 w-4.5 transition-colors"
            style={{ color: active ? accentColor : '#94a3b8' }}
          />
        </div>
        {active ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: accentColor }} />
            <span className="text-xs font-medium" style={{ color: accentColor }}>
              Configured
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">+ Add</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{active ? 'Click to edit' : 'Not configured'}</p>
      </div>
      {active && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50"
        >
          <X className="h-3 w-3 text-slate-500 hover:text-red-500" />
        </button>
      )}
    </button>
  )
}

// ─── Single endpoint row in the verification panel ────────────────────────────

function EndpointRow({
  label,
  sublabel,
  url,
  check,
  isLoading,
}: {
  label: string
  sublabel?: string
  url: string
  check?: EndpointCheck
  isLoading: boolean
}) {
  const cfg = check ? STATUS_CONFIG[check.status] : null
  const StatusIcon = cfg?.icon

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {label}
            </span>
            {sublabel && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                {sublabel}
              </span>
            )}
          </div>
          <code className="mt-0.5 block truncate font-mono text-[11px] text-slate-500">{url}</code>
        </div>

        <div className="shrink-0">
          {isLoading ? (
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
              <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
              <span className="text-[11px] text-slate-400">Checking…</span>
            </div>
          ) : cfg && StatusIcon ? (
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${cfg.bg}`}>
              <StatusIcon className={`h-3 w-3 ${cfg.color}`} />
              <span className={`text-[11px] font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
              <Wifi className="h-3 w-3 text-slate-300" />
              <span className="text-[11px] text-slate-400">Not checked</span>
            </div>
          )}
        </div>
      </div>

      {/* Issues */}
      {check?.issues && check.issues.length > 0 && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
          {check.issues.map((issue, i) => (
            <p key={i} className="font-mono text-[11px] text-red-600">
              {issue}
            </p>
          ))}
        </div>
      )}

      {/* Cache info — show only when we have something meaningful */}
      {check?.cache_info && (check.cache_info.cdn_cache_header || check.cache_info.age_seconds !== undefined) && (
        <div className="flex flex-wrap gap-2">
          {check.cache_info.cdn_cache_header && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              {check.cache_info.cdn_cache_header}
            </span>
          )}
          {check.cache_info.age_seconds !== undefined && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              Age: {check.cache_info.age_seconds}s
            </span>
          )}
          {check.cache_info.cache_control && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              {check.cache_info.cache_control}
            </span>
          )}
          {check.latency_ms && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              {check.latency_ms}ms
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Verification panel ───────────────────────────────────────────────────────

function VerificationPanel({
  domain,
  hasIos,
  hasAndroid,
  result,
  isLoading,
  onRecheck,
}: {
  domain: string
  hasIos: boolean
  hasAndroid: boolean
  result?: DeepLinkVerificationResult
  isLoading: boolean
  onRecheck: () => void
}) {
  if (!hasIos && !hasAndroid) return null

  const checkedAt = result?.checked_at
    ? new Date(result.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          </div>
          <span className="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Live Endpoint Verification
          </span>
        </div>
        <div className="flex items-center gap-2">
          {checkedAt && (
            <span className="text-[10px] text-slate-400">checked at {checkedAt}</span>
          )}
          <button
            type="button"
            onClick={onRecheck}
            disabled={isLoading}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Re-check
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {/* iOS rows */}
        {hasIos && (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <AppleIcon className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-500">
                iOS — Apple App Site Association
              </span>
            </div>
            <EndpointRow
              label="Origin"
              url={`https://${domain}/.well-known/apple-app-site-association`}
              check={result?.ios?.origin}
              isLoading={isLoading}
            />
            <EndpointRow
              label="Apple CDN"
              sublabel="what iOS reads"
              url={`https://app-site-association.cdn-apple.com/a/v1/${domain}`}
              check={result?.ios?.apple_cdn}
              isLoading={isLoading}
            />
            {/* Warn when origin is ok but CDN is stale */}
            {result?.ios?.origin.status === 'ok' &&
              result?.ios?.apple_cdn.status !== 'ok' && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    Your origin is correct but Apple&apos;s CDN is serving a different version.
                    iOS devices won&apos;t deep-link until Apple&apos;s cache refreshes — this
                    can take up to 24 hours. No action needed on your side.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Android rows */}
        {hasAndroid && (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <AndroidIcon className="h-3.5 w-3.5 text-green-600" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-green-600">
                Android — Digital Asset Links
              </span>
            </div>
            <EndpointRow
              label="Origin"
              url={`https://${domain}/.well-known/assetlinks.json`}
              check={result?.android?.origin}
              isLoading={isLoading}
            />
            {/* Google cache note — no public CDN URL to probe */}
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p className="text-xs text-slate-500">
                Google doesn&apos;t expose a public CDN endpoint for assetlinks.json. Cache
                revalidation happens at app-install time and during periodic background checks
                (typically every few hours). If the origin above is correct, Android deep links
                will work once Google&apos;s cache expires.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Field Row (two-column) ───────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DeepLinkConfigPanel({
  domain,
  open,
  onOpenChange,
  onSuccess,
}: DeepLinkConfigPanelProps) {
  const { t } = useTranslation(['domain', 'common'])
  const { org_id } = useParams<{ org_id: string }>()
  const { mutate: updateDomain, isPending } = useUpdateCustomDomain(org_id, domain.id)

  const existingConfig = parseDeepLinkConfig(domain.deep_link_apps)

  const form = useForm<DeepLinkAppsConfig>({
    resolver: zodResolver(deepLinkAppsConfigSchema),
    defaultValues: existingConfig ?? EMPTY_CONFIG,
  })

  const [activeTab, setActiveTab] = useState<'ios' | 'android' | null>(null)

  // Auto-run verification when the modal opens and a config already exists
  const hasExistingConfig =
    existingConfig !== null && existingConfig.enabled && existingConfig.apps.length > 0

  const {
    data: verificationResult,
    isFetching: isVerifying,
    refetch: recheck,
  } = useVerifyDeepLinks(org_id, domain.id, open && hasExistingConfig)

  useEffect(() => {
    form.reset(existingConfig ?? EMPTY_CONFIG)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.id])

  const enabled = form.watch('enabled')
  const apps = form.watch('apps')

  const iosIndex = apps.findIndex((a) => a.platform === 'ios')
  const androidIndex = apps.findIndex((a) => a.platform === 'android')
  const hasIosApp = iosIndex >= 0
  const hasAndroidApp = androidIndex >= 0

  // Keep activeTab in sync when apps are removed
  useEffect(() => {
    if (activeTab === 'ios' && !hasIosApp) setActiveTab(hasAndroidApp ? 'android' : null)
    if (activeTab === 'android' && !hasAndroidApp) setActiveTab(hasIosApp ? 'ios' : null)
    if (activeTab === null) {
      if (hasIosApp) setActiveTab('ios')
      else if (hasAndroidApp) setActiveTab('android')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIosApp, hasAndroidApp])

  const addIosApp = () => {
    if (hasIosApp) return
    form.setValue('apps', [
      ...apps,
      { platform: 'ios', team_id: '', bundle_id: '', app_store_url: '', paths: ['/*'] },
    ])
    setActiveTab('ios')
  }

  const addAndroidApp = () => {
    if (hasAndroidApp) return
    form.setValue('apps', [
      ...apps,
      {
        platform: 'android',
        package_name: '',
        sha256_fingerprints: [''],
        play_store_url: '',
        paths: ['/*'],
      },
    ])
    setActiveTab('android')
  }

  const removeApp = (platform: 'ios' | 'android') => {
    form.setValue('apps', apps.filter((a) => a.platform !== platform))
  }

  const onSubmit = (data: DeepLinkAppsConfig) => {
    const cleaned: DeepLinkAppsConfig = {
      ...data,
      apps: data.apps.map((app) =>
        app.platform === 'android'
          ? { ...app, sha256_fingerprints: app.sha256_fingerprints.filter(Boolean) }
          : app
      ),
    }
    updateDomain(
      { deep_link_apps: cleaned },
      {
        onSuccess: () => {
          onSuccess?.()
          onOpenChange(false)
        },
      }
    )
  }

  const handleClearConfig = () => {
    updateDomain(
      { deep_link_apps: null },
      {
        onSuccess: () => {
          form.reset(EMPTY_CONFIG)
          setActiveTab(null)
          onSuccess?.()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0 max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="relative shrink-0 overflow-hidden bg-slate-900 px-6 py-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Link2 className="h-4 w-4 text-white/80" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-white">
                  {t('domain:deepLink.title')}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500" />
                  {domain.domain}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Enable toggle */}
          <div className="relative mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white/90">
                {t('domain:deepLink.enabled.label')}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {t('domain:deepLink.enabled.description')}
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(val) => form.setValue('enabled', val)}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-5 p-6">
                {/* Caching warning */}
                <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="text-xs leading-relaxed text-amber-700">
                    {t('domain:deepLink.cachingWarning')}
                  </p>
                </div>

                {enabled && (
                  <>
                    {/* Platform tiles */}
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Platforms
                      </p>
                      <div className="flex gap-3">
                        <PlatformTile
                          icon={AppleIcon}
                          label="iOS App"
                          accentColor="#3b82f6"
                          active={hasIosApp}
                          selected={activeTab === 'ios'}
                          onToggle={() => (hasIosApp ? removeApp('ios') : addIosApp())}
                          onSelect={() => setActiveTab('ios')}
                        />
                        <PlatformTile
                          icon={AndroidIcon}
                          label="Android App"
                          accentColor="#22c55e"
                          active={hasAndroidApp}
                          selected={activeTab === 'android'}
                          onToggle={() => (hasAndroidApp ? removeApp('android') : addAndroidApp())}
                          onSelect={() => setActiveTab('android')}
                        />
                      </div>
                    </div>

                    {/* iOS form */}
                    {activeTab === 'ios' && hasIosApp && (
                      <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-5">
                        <div className="flex items-center gap-2">
                          <AppleIcon className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                            iOS Configuration
                          </span>
                        </div>
                        <FieldRow>
                          <FormField
                            control={form.control}
                            name={`apps.${iosIndex}.team_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-600">
                                  Apple Team ID <span className="text-red-400">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="ABCDE12345"
                                    maxLength={10}
                                    className="font-mono text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  {t('domain:deepLink.ios.teamId.description')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`apps.${iosIndex}.bundle_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-600">
                                  Bundle Identifier <span className="text-red-400">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="com.example.app"
                                    className="font-mono text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </FieldRow>
                      </div>
                    )}

                    {/* Android form */}
                    {activeTab === 'android' && hasAndroidApp && (
                      <div className="space-y-4 rounded-xl border border-green-100 bg-green-50/30 p-5">
                        <div className="flex items-center gap-2">
                          <AndroidIcon className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs font-semibold uppercase tracking-widest text-green-600">
                            Android Configuration
                          </span>
                        </div>
                        <FormField
                          control={form.control}
                          name={`apps.${androidIndex}.package_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-slate-600">
                                Package Name <span className="text-red-400">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="com.example.app"
                                  className="font-mono text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`apps.${androidIndex}.sha256_fingerprints`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-slate-600">
                                SHA256 Certificate Fingerprints{' '}
                                <span className="text-red-400">*</span>
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={`AA:BB:CC:DD:EE:FF:...\n(one per line for multiple signing keys)`}
                                  rows={3}
                                  className="font-mono text-[11px] leading-relaxed resize-none"
                                  value={(field.value as string[])?.join('\n') ?? ''}
                                  onChange={(e) => {
                                    const lines = e.target.value
                                      .split('\n')
                                      .map((l) => l.trim())
                                    field.onChange(lines.length > 0 ? lines : [''])
                                  }}
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                {t('domain:deepLink.android.sha256.description')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Verification panel */}
                    <VerificationPanel
                      domain={domain.domain}
                      hasIos={hasIosApp}
                      hasAndroid={hasAndroidApp}
                      result={verificationResult}
                      isLoading={isVerifying}
                      onRecheck={() => recheck()}
                    />
                  </>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="sticky bottom-0 flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
                <div>
                  {existingConfig && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearConfig}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      {t('domain:deepLink.clearConfig')}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                  >
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    {t('common:buttons.save')}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
