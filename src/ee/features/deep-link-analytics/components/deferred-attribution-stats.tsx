'use client'

import { useTranslation } from 'react-i18next'
import { DeepLinkSummary } from '@/ee/features/deep-link-analytics/types'
import { Card, CardContent } from '@/shared/components/ui/card'

/**
 * Single headline rate for the deferred cohort (New installs → Link restored).
 *
 * Link restore rate = matches / (matches + ALL deferred misses) — the
 * server-computed `match_rate`, reused as the single source of truth. It
 * answers "of new installs, how many we restored to the right content."
 *
 * The previous "Match success rate" (positive-evidence allow-list excluding
 * opt_out / clipboard_empty / clipboard_denied) was removed in the 2026-05-28
 * copy redesign — two near-identical rates were confusing the L1–L2 marketer
 * audience for a marginal signal gain. The miss_reason keystone below this
 * card already exposes the breakdown if a regression in any single bucket
 * needs investigating.
 */
export function DeferredAttributionStats({ summary }: { summary: DeepLinkSummary }) {
  const { t } = useTranslation(['domain'])

  // No deferred activity yet → nothing to rate (the funnel + keystone still render).
  if (summary.match_rate == null) return null

  const coverage = Math.round(summary.match_rate * 100)

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-center gap-1 p-5">
        <span className="text-muted-foreground text-sm font-medium">
          {t('domain:deepLink.analytics.coverage')}
        </span>
        <span className="text-3xl font-semibold tabular-nums">{coverage}%</span>
        <span className="text-muted-foreground text-xs">
          {t('domain:deepLink.analytics.coverage_sub')}
        </span>
      </CardContent>
    </Card>
  )
}
