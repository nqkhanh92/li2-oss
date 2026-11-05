'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Download,
  LayoutGrid,
  Upload,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { KeyDisplay } from '../../key-display'

type PushStatus = 'idle' | 'waiting' | 'success' | 'error'

type InstallMethod = 'store' | 'upload'

const StepLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
  >
    {children}
  </a>
)

interface Props {
  origin: string // validated wp-json origin from parent; empty string = not yet validated
  publishableKey: string
}

export const WordpressInstallGuide = ({ origin, publishableKey }: Props) => {
  const [method, setMethod] = useState<InstallMethod>('store')
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle')
  const [pushMessage, setPushMessage] = useState('')
  const childRef = useRef<Window | null>(null)
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { t } = useTranslation('analytics_settings')

  const METHODS = [
    {
      id: 'store' as InstallMethod,
      icon: LayoutGrid,
      title: t('onboarding.wordpress.plugin_store_title'),
      description: t('onboarding.wordpress.plugin_store_desc'),
    },
    {
      id: 'upload' as InstallMethod,
      icon: Upload,
      title: t('onboarding.wordpress.upload_plugin_title'),
      description: t('onboarding.wordpress.upload_plugin_desc'),
    },
  ]

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

  const handleOpenSettings = () => {
    const url = new URL(`${origin}/wp-admin/admin.php`)
    url.searchParams.set('page', 'li2-analytics')
    url.searchParams.set('push_configuration', 'true')
    url.searchParams.set('publishable_key', publishableKey)

    const child = window.open(url.toString(), '_blank', 'width=960,height=700,resizable=yes')
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
        setPushMessage(e.data.message ?? 'Configuration pushed successfully')
      } else {
        setPushStatus('error')
        setPushMessage(e.data.message ?? 'Failed to push configuration')
      }
    }

    listenerRef.current = handler
    window.addEventListener('message', handler)

    // If popup closes without sending a message → error
    intervalRef.current = setInterval(() => {
      if (childRef.current?.closed) {
        cleanup()
        childRef.current = null
        setPushStatus((s) => (s === 'waiting' ? 'error' : s))
        setPushMessage((m) => m || 'Window closed before configuration was applied')
      }
    }, 300)
  }

  const linked = !!origin
  const addNewPluginLink = `${origin}/wp-admin/plugin-install.php`
  const uploadPluginLink = `${origin}/wp-admin/plugin-install.php?tab=upload`
  const pluginsLink = `${origin}/wp-admin/plugins.php`

  const storeSteps: React.ReactNode[] = [
    <>
      {t('onboarding.wordpress.step_goto_plugins_add')}{' '}
      {linked ? (
        <StepLink href={addNewPluginLink}>
          {t('onboarding.wordpress.step_store_goto_plugins')}
        </StepLink>
      ) : (
        t('onboarding.wordpress.step_store_goto_plugins')
      )}
    </>,
    <>{t('onboarding.wordpress.step_store_search')}</>,
    <>{t('onboarding.wordpress.step_store_install')}</>,
    <>
      {t('onboarding.wordpress.step_store_activate')}
      {linked && (
        <>
          {' '}
          — {t('onboarding.wordpress.step_store_or_go')}{' '}
          <StepLink href={pluginsLink}>
            {t('onboarding.wordpress.step_store_goto_plugins_link')}
          </StepLink>
        </>
      )}
    </>,
  ]

  const uploadSteps: React.ReactNode[] = [
    <div className="flex flex-col gap-2">
      <span>{t('onboarding.wordpress.step_upload_download')}</span>
      <a
        href="https://supa.li2.ai/storage/v1/object/public/public-resources/sdk/li2-analytics.zip"
        download
        className="inline-flex items-center gap-1.5 h-7 w-fit px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Download className="h-3.5 w-3.5" />
        {t('onboarding.wordpress.download_btn')}
      </a>
    </div>,
    <>
      {t('onboarding.wordpress.step_goto_plugins_add')}{' '}
      {linked ? (
        <StepLink href={addNewPluginLink}>
          {t('onboarding.wordpress.step_store_goto_plugins')}
        </StepLink>
      ) : (
        t('onboarding.wordpress.step_store_goto_plugins')
      )}
    </>,
    <>
      {linked ? (
        <StepLink href={uploadPluginLink}>{t('onboarding.wordpress.upload_plugin_title')}</StepLink>
      ) : (
        <strong>{t('onboarding.wordpress.upload_plugin_title')}</strong>
      )}{' '}
      {t('onboarding.wordpress.step_upload_top')}
    </>,
    <>{t('onboarding.wordpress.step_upload_choose')}</>,
    <>
      {t('onboarding.wordpress.step_store_activate')}
      {linked && (
        <>
          {' '}
          — {t('onboarding.wordpress.step_store_or_go')}{' '}
          <StepLink href={pluginsLink}>
            {t('onboarding.wordpress.step_store_goto_plugins_link')}
          </StepLink>
        </>
      )}
    </>,
  ]

  const steps = method === 'store' ? storeSteps : uploadSteps

  return (
    <div className="flex flex-col gap-6">
      {/* Install method card */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Card header: tabs left, action right */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex gap-1">
            {METHODS.map((m) => {
              const Icon = m.icon
              const selected = method === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    selected
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.title}
                </button>
              )
            })}
          </div>
        </div>

        {/* Steps */}
        <ol className="flex flex-col gap-0 divide-y divide-slate-100 px-4 py-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 py-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Configure the plugin */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('onboarding.wordpress.configure_title')}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {t('onboarding.wordpress.configure_desc_before')}{' '}
              {linked ? (
                <a
                  href={`${origin}/wp-admin/admin.php?page=li2-analytics`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Li2 Analytics
                </a>
              ) : (
                <strong>Li2 Analytics</strong>
              )}{' '}
              {t('onboarding.wordpress.configure_desc_after')}
            </p>
          </div>

          {/* Push config button — only when WordPress site is detected */}
          {linked && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <button
                onClick={handleOpenSettings}
                disabled={pushStatus === 'waiting'}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {pushStatus === 'waiting' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />{' '}
                    {t('onboarding.wordpress.applying')}
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-3.5 w-3.5" />{' '}
                    {t('onboarding.wordpress.auto_configure_btn')}
                  </>
                )}
              </button>
              {pushStatus === 'waiting' && (
                <p className="text-xs text-slate-400">{t('onboarding.wordpress.waiting_plugin')}</p>
              )}
              {pushStatus === 'success' && (
                <p className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  {pushMessage}
                </p>
              )}
              {pushStatus === 'error' && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="h-3 w-3 shrink-0" />
                  {pushMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Manual key copy — always visible */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-slate-500">{t('onboarding.wordpress.key_label')}</p>
          <KeyDisplay publishableKey={publishableKey} />
        </div>
      </div>
    </div>
  )
}
