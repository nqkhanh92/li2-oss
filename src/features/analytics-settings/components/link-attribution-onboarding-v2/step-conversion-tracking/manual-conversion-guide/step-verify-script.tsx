'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { useGetAnalyticsSettings } from '@/features/analytics-settings/hooks/queries'
import { useAddHostname } from '@/features/analytics-settings/hooks/mutations'
import { useConversionTracking } from '../context'
import { useVerifyWindow } from '../hooks/use-verify-window'

const VERIFY_TIMEOUT_MS = 15_000

type Status = 'idle' | 'success' | 'timeout' | 'wrong_key' | 'empty_key'

interface SdkReport {
  sdkInstalled: boolean
  publishableKey?: string
}

interface Props {
  org_id: string
  onComplete: () => void
}

export function StepVerifyScript({ org_id, onComplete }: Props) {
  const { t } = useTranslation('link_attribution_onboarding')
  const [status, setStatus] = useState<Status>('idle')
  const [detectedKey, setDetectedKey] = useState('')

  const { siteUrl, normalizedSiteUrl } = useConversionTracking()
  const { data: settings } = useGetAnalyticsSettings(org_id)
  const { mutateAsync: addHostname } = useAddHostname(org_id, true)

  const { open, isWaiting } = useVerifyWindow<SdkReport>({
    filterMessage: (data) =>
      data !== null &&
      typeof data === 'object' &&
      (data as Record<string, unknown>).sdkInstalled
        ? (data as SdkReport)
        : null,
    onSuccess: ({ publishableKey }) => {
      if (!publishableKey) {
        setStatus('empty_key')
      } else if (publishableKey !== settings?.publishable_key) {
        setDetectedKey(publishableKey)
        setStatus('wrong_key')
      } else {
        setStatus('success')
      }
    },
    onClose: () => setStatus('timeout'),
    timeoutMs: VERIFY_TIMEOUT_MS,
  })

  const handleOpen = async () => {
    if (!siteUrl || !settings?.publishable_key) return
    setStatus('idle')
    setDetectedKey('')

    try {
      const hostname = new URL(normalizedSiteUrl).hostname
      if (hostname && !(settings.allowed_hostnames ?? []).includes(hostname)) {
        await addHostname(hostname)
      }
    } catch {}

    open(siteUrl)
  }

  const verified = status === 'success'
  const failed = status === 'timeout' || status === 'wrong_key' || status === 'empty_key'
  const hasResult = verified || failed

  const CHECKS = [
    {
      label: t('v2.manual_guide.verify.check_script'),
      pass: status !== 'timeout',
      show: true,
      detail: status === 'timeout' ? t('v2.manual_guide.verify.script_not_found') : undefined,
    },
    {
      label: t('v2.manual_guide.verify.check_key'),
      pass: verified,
      show: status !== 'timeout',
      detail:
        status === 'wrong_key'
          ? t('v2.manual_guide.verify.key_mismatch', { key: detectedKey.slice(0, 24) })
          : status === 'empty_key'
            ? t('v2.manual_guide.verify.empty_key')
            : undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">
        {t('v2.manual_guide.verify.subtitle')}
      </p>

      {/* Idle: primary CTA */}
      {!hasResult && (
        <Button
          size="sm"
          className="w-fit"
          onClick={handleOpen}
          disabled={isWaiting || !normalizedSiteUrl}
        >
          {isWaiting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              {t('v2.manual_guide.verify.cta_waiting')}
            </>
          ) : (
            <>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              {t('v2.manual_guide.verify.cta_open')}
            </>
          )}
        </Button>
      )}

      {isWaiting && (
        <p className="text-xs text-slate-400">
          {t('v2.manual_guide.verify.waiting_hint')}
        </p>
      )}

      {!normalizedSiteUrl && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t('v2.manual_guide.verify.no_url_hint')}
        </div>
      )}

      {/* Result card — shown after first verify attempt */}
      {hasResult && (
        <div className={cn(
          'rounded-xl border overflow-hidden',
          verified ? 'border-semantic-success/30' : 'border-destructive/30'
        )}>
          {/* Card header with Re-verify on the right */}
          <div className={cn(
            'flex items-center justify-between gap-3 border-b px-4 py-2.5',
            verified ? 'border-semantic-success/20 bg-semantic-success/5' : 'border-destructive/20 bg-destructive/[0.03]'
          )}>
            <div className="flex items-center gap-2">
              {verified
                ? <CheckCircle2 className="h-4 w-4 text-semantic-success shrink-0" />
                : <XCircle className="h-4 w-4 text-destructive shrink-0" />
              }
              <p className="text-sm font-medium text-slate-700">{t('v2.manual_guide.verify.result_title')}</p>
            </div>

            <button
              type="button"
              onClick={handleOpen}
              disabled={isWaiting}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all',
                'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isWaiting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {t('v2.manual_guide.verify.reverify')}
            </button>
          </div>

          {/* Check rows */}
          <div className="flex flex-col divide-y divide-slate-100 px-4 py-1">
            {CHECKS.filter((c) => c.show).map((check) => (
              <div key={check.label} className="flex items-center gap-3 py-3">
                {check.pass
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-semantic-success" />
                  : <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                }
                <span className="text-sm text-slate-700 flex-1">{check.label}</span>
                {check.detail && (
                  <span className="text-xs text-destructive text-right max-w-[200px]">{check.detail}</span>
                )}
              </div>
            ))}
          </div>

          {/* Success footer */}
          {verified && (
            <div className="border-t border-semantic-success/20 px-4 py-3 bg-semantic-success/5">
              <p className="text-sm font-medium flex items-center gap-1.5 text-semantic-success">
                <CheckCircle2 className="h-4 w-4" />
                {t('v2.manual_guide.verify.success_msg')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center gap-3">
        {hasResult ? (
          <Button size="sm" onClick={onComplete} variant={verified ? 'default' : 'outline'}>
            {verified ? t('v2.common.continue') : t('v2.common.continue_anyway')}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onComplete}>
              {t('v2.common.skip')}
            </Button>
            <p className="text-xs text-slate-400">{t('v2.manual_guide.verify.skip_hint')}</p>
          </>
        )}
      </div>
    </div>
  )
}
