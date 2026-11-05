'use client'

import { useState } from 'react'
import {
  ExternalLink,
  ShoppingCart,
  UserCheck,
  CheckCircle2,
  Link2,
  Copy,
  Check,
  Radio,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Bug,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/lib/utils'
import { DebugLogsTable } from '@/features/analytics-settings/components/debug-logs-table'
import { useToggleDebugMode } from '@/features/analytics-settings/hooks/mutations'
import { useGetDebugLogs } from '@/features/analytics-settings/hooks/queries'
import { toast } from '@/shared/hooks/use-toast'

type DebugFilter = 'lead' | 'sale'

const ACTION_MAP: Record<string, { icon: React.ElementType; label: string }> = {
  registration: { icon: UserCheck, label: 'Register a new user account on your site' },
  add_to_cart: { icon: ShoppingCart, label: 'Add a product to the cart (WooCommerce)' },
  checkout: { icon: CheckCircle2, label: 'Place an order through WooCommerce checkout' },
}

interface Props {
  org_id: string
  selectedConversions: Set<string>
  shortUrl: string | null
  onComplete: () => void
}

export function StepTestConversion({ org_id, selectedConversions, shortUrl, onComplete }: Props) {
  const [copied, setCopied] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [filter, setFilter] = useState<DebugFilter>('lead')
  const [page, setPage] = useState(1)

  const { mutateAsync: toggleDebugMode, isPending: isToggling } = useToggleDebugMode(org_id)
  const { data: logsData, isLoading: logsLoading } = useGetDebugLogs(
    org_id,
    { page, limit: 10, request_type: filter },
    debugEnabled
  )

  const handleCopy = () => {
    if (!shortUrl) return
    navigator.clipboard.writeText(shortUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleDebug = async (enabled: boolean) => {
    try {
      await toggleDebugMode({ enabled })
      setDebugEnabled(enabled)
      setPage(1)
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle debug mode.', variant: 'destructive' })
    }
  }

  const actions = Array.from(selectedConversions).filter((id) => ACTION_MAP[id])

  /* ── Debug mode view ── */
  if (showDebug) {
    return (
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => setShowDebug(false)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to test steps
        </button>

        {/* Debug toggle card */}
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border-2 p-4 transition-colors',
            debugEnabled ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
          )}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Debug Mode</span>
            <span className="text-xs text-slate-500">
              {debugEnabled
                ? 'All SDK requests are being logged'
                : 'Turn on to start capturing events'}
            </span>
            {debugEnabled && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 mt-1">
                <AlertTriangle className="h-3 w-3" />
                May contain sensitive data — disable in production
              </span>
            )}
          </div>
          <Switch
            checked={debugEnabled}
            onCheckedChange={handleToggleDebug}
            disabled={isToggling}
          />
        </div>

        {/* Lead / Sale filter tabs */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(['lead', 'sale'] as DebugFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f)
                setPage(1)
              }}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all',
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {f === 'lead' ? 'Lead Events' : 'Sale Events'}
            </button>
          ))}
        </div>

        {/* Logs area */}
        {!debugEnabled ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <Radio className="h-6 w-6" />
            <span className="text-sm">Enable debug mode above to start capturing events</span>
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
            Done
          </Button>
        </div>
      </div>
    )
  }

  /* ── Normal test view ── */
  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">
        Visit your short link and trigger the conversion events you set up. Then check the
        Conversions page to confirm data is coming in.
      </p>

      {/* Short URL */}
      {shortUrl ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <Link2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700 truncate flex-1">{shortUrl}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Link2 className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="text-xs text-slate-400">
            No short link created — visit your site directly.
          </span>
        </div>
      )}

      {/* Actions to try */}
      {actions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-700">Try these actions on your site:</p>
          <ol className="flex flex-col gap-2">
            {actions.map((id, i) => {
              const { icon: Icon, label } = ACTION_MAP[id]
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <Icon className={cn('w-4 h-4 shrink-0 text-slate-400')} />
                  <span className="text-sm text-slate-700">{label}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <div className="flex items-center gap-3">
        <a href={`/org/${org_id}/conversions`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Check Conversions
          </Button>
        </a>
        <Button size="sm" onClick={onComplete}>
          Done
        </Button>
      </div>

      {/* Debug mode hint */}
      <p className="text-xs text-slate-400">
        Not seeing events?{' '}
        <button
          type="button"
          onClick={() => setShowDebug(true)}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
        >
          <Bug className="w-3 h-3" />
          Try debug mode
        </button>
      </p>
    </div>
  )
}
