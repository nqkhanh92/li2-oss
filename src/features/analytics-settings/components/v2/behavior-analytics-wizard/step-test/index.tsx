'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ExternalLink,
  Eye,
  MousePointerClick,
  ChevronsDown,
  FileText,
  Clapperboard,
  Globe,
  Radio,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Bug,
  CheckCircle2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { DebugLogsTable } from '@/features/analytics-settings/components/debug-logs-table'
import { useToggleDebugMode } from '@/features/analytics-settings/hooks/mutations'
import {
  useGetDebugLogs,
  type BehaviorDebugStatus,
} from '@/features/analytics-settings/hooks/queries'
import { axiosApiInstance } from '@/shared/lib/axios'
import { toast } from '@/shared/hooks/use-toast'
import { cn } from '@/shared/lib/utils'
import type { FeatureKey } from '../step-features'

type DebugFilter = 'pageview' | 'interaction'

const FEATURE_TEST_MAP: Record<
  FeatureKey,
  { icon: React.ElementType; testKey: string; debugField?: keyof BehaviorDebugStatus }
> = {
  pageview_tracking: { icon: Eye, testKey: 'test_pageview', debugField: 'pageview' },
  click_tracking: { icon: MousePointerClick, testKey: 'test_click', debugField: 'click' },
  scroll_tracking: { icon: ChevronsDown, testKey: 'test_scroll', debugField: 'scroll' },
  form_tracking: { icon: FileText, testKey: 'test_form', debugField: 'form' },
  outbound_tracking: { icon: ExternalLink, testKey: 'test_outbound' },
  session_recording: {
    icon: Clapperboard,
    testKey: 'test_session',
    debugField: 'session_recording',
  },
}

const PING_INTERVAL_MS = 10_000

interface Props {
  org_id: string
  siteUrl: string
  features: Record<FeatureKey, boolean>
  onComplete: () => void
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function StepTest({ org_id, siteUrl, features, onComplete }: Props) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const [showDebug, setShowDebug] = useState(false)
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [filter, setFilter] = useState<DebugFilter>('pageview')
  const [page, setPage] = useState(1)
  const [debugStatus, setDebugStatus] = useState<BehaviorDebugStatus | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { mutateAsync: toggleDebugMode, isPending: isToggling } = useToggleDebugMode(org_id)
  const { data: logsData, isLoading: logsLoading } = useGetDebugLogs(
    org_id,
    { page, limit: 10, request_type: filter },
    debugEnabled
  )

  const normalizedUrl = siteUrl ? normalizeUrl(siteUrl) : ''

  // Ping the behavior debug endpoint to keep the Redis key alive and get results
  const pingBehaviorDebug = async () => {
    if (!normalizedUrl) return
    try {
      const { data } = await axiosApiInstance.post<{ data: BehaviorDebugStatus }>(
        `/organizations/${org_id}/analytics-settings/behavior-debug/ping`,
        { site_url: normalizedUrl }
      )
      setDebugStatus(data.data)
    } catch {
      // silently ignore — network errors during polling shouldn't disrupt the UX
    }
  }

  // Start polling as soon as the user arrives at this step
  useEffect(() => {
    pingBehaviorDebug()
    intervalRef.current = setInterval(pingBehaviorDebug, PING_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedUrl])

  const handleToggleDebug = async (enabled: boolean) => {
    try {
      await toggleDebugMode({ enabled, site_url: normalizedUrl || undefined })
      setDebugEnabled(enabled)
      setPage(1)
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle debug mode.', variant: 'destructive' })
    }
  }

  const enabledTests = (Object.keys(FEATURE_TEST_MAP) as FeatureKey[]).filter((k) => features[k])

  /* ── Debug view ── */
  if (showDebug) {
    return (
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => setShowDebug(false)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" />
          {t('step_test.back_to_test')}
        </button>

        {/* Debug toggle card */}
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border-2 p-4 transition-colors',
            debugEnabled ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
          )}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              {t('step_test.debug_title')}
            </span>
            <span className="text-xs text-slate-500">
              {debugEnabled ? t('step_test.debug_on') : t('step_test.debug_off')}
            </span>
            {debugEnabled && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 mt-1">
                <AlertTriangle className="h-3 w-3" />
                {t('step_test.debug_warning')}
              </span>
            )}
          </div>
          <Switch
            checked={debugEnabled}
            onCheckedChange={handleToggleDebug}
            disabled={isToggling}
          />
        </div>

        {/* Pageview / Interaction filter tabs */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(['pageview', 'interaction'] as DebugFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f)
                setPage(1)
              }}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {f === 'pageview'
                ? t('step_test.filter_pageview')
                : t('step_test.filter_interaction')}
            </button>
          ))}
        </div>

        {/* Logs */}
        {!debugEnabled ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <Radio className="h-6 w-6" />
            <span className="text-sm">{t('step_test.debug_empty')}</span>
          </div>
        ) : logsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <DebugLogsTable
            logs={logsData?.data ?? []}
            isLoading={logsLoading}
            currentPage={page}
            hasMore={logsData?.has_more ?? false}
            onPageChange={setPage}
          />
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" onClick={onComplete}>
            {t('common.done')}
          </Button>
        </div>
      </div>
    )
  }

  /* ── Normal test view ── */
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{t('step_test.title')}</h2>
        <p className="text-s text-muted-foreground">{t('step_test.subtitle')}</p>
      </div>

      {/* Site URL */}
      {normalizedUrl ? (
        <a
          href={normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 hover:bg-indigo-100 transition-colors"
        >
          <Globe className="w-4 h-4 shrink-0 text-indigo-500" />
          <span className="text-xs font-medium text-indigo-700 truncate flex-1">
            {normalizedUrl}
          </span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
        </a>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Globe className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="text-xs text-slate-400">{t('step_test.no_url_hint')}</span>
        </div>
      )}

      {/* Feature-based test actions with live validation indicators */}
      {enabledTests.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{t('step_test.actions_title')}</p>
            {/* Listening indicator */}
            {normalizedUrl && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
                {t('step_test.listening')}
              </span>
            )}
          </div>
          <ol className="flex flex-col gap-1.5">
            {enabledTests.map((key, i) => {
              const { icon: Icon, testKey, debugField } = FEATURE_TEST_MAP[key]
              const received = debugField ? debugStatus?.[debugField] === true : false
              return (
                <li
                  key={key}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                    received ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      received ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'
                    )}
                  >
                    {i + 1}
                  </span>
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      received ? 'text-green-500' : 'text-slate-400'
                    )}
                  />
                  <span
                    className={cn('text-sm flex-1', received ? 'text-green-700' : 'text-slate-700')}
                  >
                    {t(`step_test.${testKey}`)}
                  </span>
                  {debugField && (
                    <span className="shrink-0">
                      {received ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300" />
                        </span>
                      )}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>

          {/* Confirmed site_url from received events */}
          {debugStatus?.site_url && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t('step_test.events_received_from')}{' '}
              <span className="font-medium truncate">{debugStatus.site_url}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={onComplete}>
          {t('common.done')}
        </Button>
      </div>

      {/* Debug mode hint */}
      <p className="text-xs text-slate-400">
        {t('step_test.not_seeing')}{' '}
        <button
          type="button"
          onClick={() => setShowDebug(true)}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
        >
          <Bug className="w-3 h-3" />
          {t('step_test.try_debug')}
        </button>
      </p>
    </div>
  )
}
