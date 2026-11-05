'use client'

/**
 * The slim AI budget meter — `$0.42 / $5.00 · tháng này` under the panel header. Reads `usage`
 * straight from the provider; renders nothing until a real snapshot has arrived (no zero-state
 * flash, no skeleton — the meter simply doesn't exist yet).
 *
 * ⚠️ Honesty note: the spent number can read slightly HIGH mid-turn. li2-ai's Redis counter
 * reserves an UPPER-BOUND ceiling for an in-flight turn before the turn's actual cost is known,
 * then reconciles DOWN to the real spend once the turn completes. So this meter is deliberately
 * conservative — it never UNDER-reports what a marketer might owe — and can tick down slightly
 * right after a turn finishes. That is expected behaviour, not a bug.
 */

import { useTranslation } from 'react-i18next'
import { useAgentChatContext } from '@/shared/providers/agent-chat-provider'

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' })

export function UsageMeter() {
  const { t } = useTranslation('agent-chat')
  const { usage } = useAgentChatContext()

  if (!usage) return null

  // spent_micro is µUSD (1 cent = 10_000 µUSD); budget_cents is already cents.
  const spentCents = usage.spent_micro / 10_000
  const pct = usage.budget_cents > 0 ? Math.min(100, (spentCents / usage.budget_cents) * 100) : 0

  const barColor = pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-primary'

  return (
    <div className="border-b border-slate-200 px-4 py-2">
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('usage.label')}
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {usdFormatter.format(spentCents / 100)} / {usdFormatter.format(usage.budget_cents / 100)} ·{' '}
        {t('usage.thisMonth')}
      </p>
    </div>
  )
}
