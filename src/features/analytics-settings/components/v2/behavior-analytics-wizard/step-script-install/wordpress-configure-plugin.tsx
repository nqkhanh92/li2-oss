'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Zap,
  Wrench,
  Copy,
  Check,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import type { AnalyticsSettings } from '@/features/analytics-settings/hooks/queries'

type ConfigTab = 'auto' | 'manual'
type PushStatus = 'idle' | 'waiting' | 'success' | 'error'

interface Props {
  settings: AnalyticsSettings
  normalizedSiteUrl: string
  onNext: () => void
}

const TABS = [
  { id: 'auto' as ConfigTab, icon: Zap },
  { id: 'manual' as ConfigTab, icon: Wrench },
]

function CopyableKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-2 font-mono text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors w-fit max-w-full"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-semantic-success" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors" />
      )}
    </button>
  )
}

export function WordPressConfigurePlugin({ settings, normalizedSiteUrl, onNext }: Props) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const [tab, setTab] = useState<ConfigTab>('auto')
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle')
  const [pushMessage, setPushMessage] = useState('')

  const childRef = useRef<Window | null>(null)
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = () => {
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current)
      listenerRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => cleanup, [])

  const handleAutoConfig = () => {
    if (!normalizedSiteUrl || !settings?.publishable_key) return

    const url = new URL(`${normalizedSiteUrl}/wp-admin/admin.php`)
    url.searchParams.set('page', 'li2-analytics')
    url.searchParams.set('push_configuration', 'true')
    url.searchParams.set('publishable_key', settings.publishable_key)
    url.searchParams.set(
      'dev_mode',
      process.env.NEXT_PUBLIC_APP_ENV === 'development' ? 'true' : 'false'
    )

    const child = window.open(url.toString(), '_blank', 'width=960,height=700,resizable=yes')
    if (!child) {
      setPushStatus('error')
      setPushMessage(t('step_script_install.wp_configure.popup_blocked'))
      return
    }

    childRef.current = child
    setPushStatus('waiting')
    setPushMessage('')
    cleanup()

    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'li2_analytics_config_pushed') return
      cleanup()
      childRef.current?.close()
      childRef.current = null
      if (e.data.success) {
        setPushStatus('success')
        setPushMessage(e.data.message ?? t('step_script_install.wp_configure.success'))
      } else {
        setPushStatus('error')
        setPushMessage(e.data.message ?? t('step_script_install.wp_configure.error'))
      }
    }

    listenerRef.current = handler
    window.addEventListener('message', handler)

    intervalRef.current = setInterval(() => {
      if (childRef.current?.closed) {
        cleanup()
        childRef.current = null
        setPushStatus((s) => (s === 'waiting' ? 'error' : s))
        setPushMessage((m) => m || t('step_script_install.wp_configure.window_closed'))
      }
    }, 300)
  }

  const pluginUrl = normalizedSiteUrl
    ? `${normalizedSiteUrl}/wp-admin/admin.php?page=li2-analytics`
    : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">
          {t('step_script_install.wp_configure.title')}
        </h3>
        <p className="text-s text-muted-foreground">
          {t('step_script_install.wp_configure.subtitle')}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex gap-1 border-b border-border bg-muted/40 px-3 py-2">
          {TABS.map((tabItem) => {
            const Icon = tabItem.icon
            const isSelected = tab === tabItem.id
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setTab(tabItem.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`step_script_install.wp_configure.tab_${tabItem.id}`)}
              </button>
            )
          })}
        </div>

        <div className="p-4">
          {tab === 'auto' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                {t('step_script_install.wp_configure.auto_desc')}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoConfig}
                  disabled={pushStatus === 'waiting'}
                >
                  {pushStatus === 'waiting' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      {t('step_script_install.wp_configure.applying')}
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {t('step_script_install.wp_configure.auto_btn')}
                    </>
                  )}
                </Button>
                {pushStatus === 'waiting' && (
                  <p className="text-xs text-slate-400">
                    {t('step_script_install.wp_configure.waiting')}
                  </p>
                )}
                {pushStatus === 'success' && (
                  <p className="flex items-center gap-1 text-xs text-semantic-success">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {pushMessage}
                  </p>
                )}
                {pushStatus === 'error' && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {pushMessage}
                  </p>
                )}
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                <p className="text-xs text-slate-500">
                  {t('step_script_install.wp_configure.auto_fallback_prefix')}{' '}
                  <button
                    type="button"
                    onClick={() => setTab('manual')}
                    className="font-medium text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    {t('step_script_install.wp_configure.tab_manual')}
                  </button>{' '}
                  {t('step_script_install.wp_configure.auto_fallback_suffix')}
                </p>
              </div>
            </div>
          )}

          {tab === 'manual' && (
            <ol className="flex flex-col divide-y divide-slate-100">
              <li className="flex items-start gap-3 py-3 first:pt-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                  1
                </span>
                <span className="text-sm text-slate-700">
                  {pluginUrl ? (
                    <a
                      href={pluginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                      {t('step_script_install.wp_configure.manual_step1_link')}
                    </a>
                  ) : (
                    <strong>{t('step_script_install.wp_configure.manual_step1_link')}</strong>
                  )}{' '}
                  {t('step_script_install.wp_configure.manual_step1_suffix')}
                </span>
              </li>

              <li className="flex items-start gap-3 py-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                  2
                </span>
                <div className="flex flex-col gap-1.5 text-sm text-slate-700">
                  <span>{t('step_script_install.wp_configure.manual_step2')}</span>
                  <CopyableKey value={settings?.publishable_key ?? ''} />
                </div>
              </li>

              <li className="flex items-start gap-3 py-3 last:pb-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                  3
                </span>
                <span className="text-sm text-slate-700">
                  {t('step_script_install.wp_configure.manual_step3')}
                </span>
              </li>
            </ol>
          )}
        </div>
      </div>

      <div>
        <Button onClick={onNext}>{t('step_script_install.wp_configure.done_btn')}</Button>
      </div>
    </div>
  )
}
