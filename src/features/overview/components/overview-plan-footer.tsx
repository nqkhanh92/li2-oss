'use client'

import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { QUOTA_STATUS_COLORS } from '@/shared/constants/overview-colors'
import { PRICING_URL } from '@/shared/constants'
import { PLAN_KEYS } from '@/shared/types/plan-permission'
import type { OverviewPlanUsage } from '../types'

interface OverviewPlanFooterProps {
  planUsage: OverviewPlanUsage
}

function QuotaBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const barColor =
    pct >= 100
      ? QUOTA_STATUS_COLORS.danger
      : pct >= 80
        ? QUOTA_STATUS_COLORS.warning
        : QUOTA_STATUS_COLORS.ok

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="flex-1 min-w-[60px]">
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
        {used.toLocaleString()}/{max > 0 ? max.toLocaleString() : '∞'}
      </span>
    </div>
  )
}

function formatExpiry(expiresAt: string | null, locale: string): string {
  if (!expiresAt) return ''
  const [datePart] = expiresAt.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function OverviewPlanFooter({ planUsage }: OverviewPlanFooterProps) {
  const { t, i18n } = useTranslation('overview')
  const { org_id } = useParams<{ org_id: string }>()
  const locale = i18n.language
  const isFree = planUsage.planKey === PLAN_KEYS.TIER0 || planUsage.planKey === PLAN_KEYS.TIER0_TRIAL

  return (
    <div className="rounded-2xl border border-slate-200 bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Plan name + expiry */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={
              isFree
                ? 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600'
                : 'rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary'
            }
          >
            {planUsage.planName}
          </span>
          {planUsage.expiresAt && (
            <span className="text-xs text-muted-foreground">
              {t('planFooter.expires', { date: formatExpiry(planUsage.expiresAt, locale) })}
            </span>
          )}
        </div>

        {/* Quota bars */}
        <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 min-w-0">
          {planUsage.quotas.map((quota) => (
            <div key={quota.label} className="flex-1 min-w-[120px] max-w-[200px]">
              <QuotaBar label={t(`planFooter.quotas.${quota.label}`)} used={quota.used} max={quota.max} />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isFree && (
            <a href={PRICING_URL} target="_blank" rel="noopener noreferrer">
              <Button size="xs" variant="default">
                {t('planFooter.upgradeCta')}
              </Button>
            </a>
          )}
          <Link href={`/org/${org_id}/settings#account-usage`}>
            <Button size="xs" variant="ghost" iconLeft={<Settings className="h-3.5 w-3.5" />}>
              {t('planFooter.manage')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
