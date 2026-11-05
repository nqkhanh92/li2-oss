'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { useGetAnalyticsSettings } from '@/features/analytics-settings/hooks/queries'
import { useGetApiKeys } from '@/features/api-keys/hooks/queries'
import { useConversionTracking } from '../context'
import { useVerifyWindow } from '../hooks/use-verify-window'

const VERIFY_TIMEOUT_MS = 15_000

interface ConfigReport {
  type: 'li2_analytics_config_report'
  publishable_key: string
  server_api_key: string
  dev_mode: boolean
  track_registration: boolean
  track_add_to_cart: boolean
  track_checkout: boolean
}

interface CheckResult {
  label: string
  pass: boolean
  detail?: string
}

const CONV_CHECKS: { id: string; label: string; field: keyof ConfigReport }[] = [
  { id: 'registration', label: 'Track Registrations', field: 'track_registration' },
  { id: 'add_to_cart', label: 'Track Add to Cart', field: 'track_add_to_cart' },
  { id: 'checkout', label: 'Track WooCommerce Orders', field: 'track_checkout' },
]

interface Props {
  org_id: string
  selectedConversions: Set<string>
  onComplete: () => void
}

export function StepVerifyInstallation({ org_id, selectedConversions, onComplete }: Props) {
  const [report, setReport] = useState<ConfigReport | null>(null)

  const { siteUrl, normalizedSiteUrl } = useConversionTracking()
  const { data: settings } = useGetAnalyticsSettings(org_id)
  const { data: apiKeys } = useGetApiKeys(org_id)

  const { open, isWaiting } = useVerifyWindow<ConfigReport>({
    filterMessage: (data) =>
      data !== null &&
      typeof data === 'object' &&
      (data as Record<string, unknown>).type === 'li2_analytics_config_report'
        ? (data as ConfigReport)
        : null,
    onSuccess: (data) => setReport(data),
    onClose: () => {},
    timeoutMs: VERIFY_TIMEOUT_MS,
  })

  const handleOpen = () => {
    if (!siteUrl) return
    setReport(null)
    open(siteUrl)
  }

  const getChecks = (r: ConfigReport): CheckResult[] => {
    const checks: CheckResult[] = []

    // Plugin active — implied by receiving the message
    checks.push({ label: 'Plugin is active', pass: true })

    // Publishable key — exact match
    const pubKeyOk = !!settings?.publishable_key && r.publishable_key === settings.publishable_key
    checks.push({
      label: 'Publishable Key',
      pass: pubKeyOk,
      detail: pubKeyOk ? undefined : 'Does not match your account key',
    })

    // Server API key — check if any org API key matches the masked value from the plugin
    // PHP li2_mask_key: first 6 chars + '********' + last 4 chars
    // DB key_prefix is longer (e.g. 'li2_sk_jeTC'), key_suffix is last 4 (e.g. '7v7M')
    const matchedKey = (apiKeys ?? []).find(
      (k) => r.server_api_key === k.key_prefix.slice(0, 6) + '********' + k.key_suffix
    )
    const apiKeyOk = !!matchedKey
    checks.push({
      label: 'Server API Key',
      pass: apiKeyOk,
      detail: apiKeyOk ? undefined : 'No matching API key found in your account',
    })

    // Conversion toggles — only check selected ones
    for (const c of CONV_CHECKS) {
      if (selectedConversions.has(c.id)) {
        const pass = r[c.field] === true
        checks.push({
          label: c.label,
          pass,
          detail: pass ? undefined : 'Not enabled in plugin',
        })
      }
    }

    return checks
  }

  const checks = report ? getChecks(report) : []
  const allPass = checks.length > 0 && checks.every((c) => c.pass)

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">
        Open your site — the plugin will automatically report its status back so we can confirm it's
        active and correctly configured.
      </p>

      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={handleOpen}
        disabled={isWaiting || !normalizedSiteUrl}
      >
        {isWaiting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            Waiting for plugin…
          </>
        ) : (
          <>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            {report ? 'Re-verify' : 'Open Site to Verify'}
          </>
        )}
      </Button>

      {isWaiting && (
        <p className="text-xs text-slate-400">
          Keep the site tab open — we'll validate automatically once it loads.
        </p>
      )}

      {report && (
        <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-sm font-medium text-slate-700">Plugin Status</p>
          </div>
          <div className="flex flex-col divide-y divide-slate-100 px-4 py-1">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center gap-3 py-2.5">
                {check.pass ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-semantic-success" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <span className="text-sm text-slate-700 flex-1">{check.label}</span>
                {!check.pass && check.detail && (
                  <span className="text-xs text-destructive">{check.detail}</span>
                )}
              </div>
            ))}
          </div>
          {allPass && (
            <div className={cn('border-t border-slate-100 px-4 py-3 bg-semantic-success/5')}>
              <p className="text-sm font-medium flex items-center gap-1.5 text-semantic-success">
                <CheckCircle2 className="h-4 w-4" />
                Plugin is active and correctly configured.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {report ? (
          <Button size="sm" onClick={onComplete} variant={allPass ? 'default' : 'outline'}>
            {allPass ? 'Continue' : 'Continue anyway'}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={onComplete}
            >
              Skip
            </Button>
            <p className="text-xs text-slate-400">Open your site above to verify, or skip.</p>
          </>
        )}
      </div>
    </div>
  )
}
