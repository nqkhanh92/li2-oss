'use client'

import { type ReactNode } from 'react'
import { ArrowRight, Download, Info, Link2, MousePointerClick, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { DeepLinkClickSummary, DeepLinkSummary } from '@/ee/features/deep-link-analytics/types'

interface DeepLinkFunnelProps {
  summary: DeepLinkSummary
  clickSummary: DeepLinkClickSummary
  /** True when filtered to one link — App Opens then exclude unattributable
   *  (NULL touch_point_id) events, so the caption must say so. */
  isPerLink?: boolean
}

/**
 * Deep-link headline. Three counters, one funnel.
 *
 * Counters shown side-by-side, NEVER summed:
 *   • Clicks (visits on deep-link links) and App Open (app_open: users who
 *     already had the app and opened it via a working Universal Link) are
 *     CONTEXT — distinct populations with no funnel arrow between them.
 *   • New installs ▶ Link restored IS the cohort funnel, both from
 *     deep_link_events: of the first-launch resolution attempts
 *     (deferred_match + deferred_miss), how many landed on the original link
 *     (deferred_match). The arrow connects ONLY these two.
 *
 * "New installs" counts the sample apps' first-launch resolution gate (iOS
 * UserDefaults firstLaunchRan / Android Play Install Referrer one-shot) — i.e.
 * reinstalls re-fire and ignored consent prompts never fire. Restore rate on
 * this cohort lives in <DeferredAttributionStats>. The long-form note moved to
 * a tooltip on the info icon (UI copy redesign 2026-05-28).
 *
 * SDK CTA: clicks exist but no opens of any kind → SDK not integrated.
 */
export function DeepLinkFunnel({ summary, clickSummary, isPerLink = false }: DeepLinkFunnelProps) {
  const { t } = useTranslation(['domain'])
  const clicks = clickSummary.clicks
  const directOpens = summary.app_opens
  const deferredOpens = summary.deferred_matches + summary.deferred_misses
  const matched = summary.deferred_matches
  const showSdkCta = clicks > 0 && deferredOpens === 0 && directOpens === 0

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('domain:deepLink.analytics.funnel_note')}
                className="text-muted-foreground hover:text-foreground inline-flex"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">
              {t(
                isPerLink
                  ? 'domain:deepLink.analytics.funnel_note_perlink'
                  : 'domain:deepLink.analytics.funnel_note'
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_1fr]">
        {/* Context — separate populations, not funnel stages, no arrow between them. */}
        <Stat
          variant="context"
          icon={<MousePointerClick className="h-5 w-5" />}
          label={t('domain:deepLink.analytics.clicks')}
          sub={t('domain:deepLink.analytics.clicks_sub')}
          value={clicks}
        />
        <Stat
          variant="context"
          icon={<Smartphone className="h-5 w-5" />}
          label={t('domain:deepLink.analytics.direct_opens')}
          sub={t('domain:deepLink.analytics.direct_opens_sub')}
          value={directOpens}
        />
        {/* Deferred cohort — the only true funnel: New installs ▶ Link restored. */}
        <Stat
          variant="cohort"
          icon={<Download className="h-5 w-5" />}
          label={t('domain:deepLink.analytics.deferred_opens')}
          sub={t('domain:deepLink.analytics.deferred_opens_sub')}
          value={deferredOpens}
        />
        <FunnelArrow />
        <Stat
          variant="cohort"
          icon={<Link2 className="h-5 w-5" />}
          label={t('domain:deepLink.analytics.matched')}
          sub={t('domain:deepLink.analytics.matched_sub')}
          value={matched}
        />
      </div>

      {showSdkCta && (
        <p className="text-muted-foreground text-sm">{t('domain:deepLink.analytics.sdk_cta')}</p>
      )}
    </div>
  )
}

function FunnelArrow() {
  return (
    <div className="text-muted-foreground hidden items-center justify-center sm:flex">
      <ArrowRight className="h-5 w-5" />
    </div>
  )
}

function Stat({
  icon,
  label,
  sub,
  value,
  variant,
}: {
  icon: ReactNode
  label: string
  sub: string
  value: number
  variant: 'context' | 'cohort'
}) {
  return (
    <Card className={cn(variant === 'context' && 'border-dashed bg-muted/30')}>
      <CardContent className="flex flex-col gap-1 p-5">
        <div className="text-muted-foreground flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-3xl font-semibold tabular-nums">{value.toLocaleString()}</span>
        <span className="text-muted-foreground text-xs">{sub}</span>
      </CardContent>
    </Card>
  )
}
