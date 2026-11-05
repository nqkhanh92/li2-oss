'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { WidgetCard } from './widget-card'

// Methods produced by li2-be's DEFERRED /track/open resolver paths (new-install recovery):
// clipboard (iOS), install_referrer (Android Play), ip/ip_ua (paused IP fallback).
// Everything else — universal_link, app_link, and the NULL→'unknown' immediate open — is an
// ALREADY-INSTALLED open (matchMethodFromPlatform on the immediate path). Grouping by install
// stage surfaces the dimension the raw method names hide; the two group totals reconcile to
// the App Open / New installs headline cards.
const NEW_INSTALL_METHODS = new Set(['clipboard', 'install_referrer', 'ip', 'ip_ua'])

const GROUP_ORDER = ['already_installed', 'new_install'] as const
type GroupKey = (typeof GROUP_ORDER)[number]

type MethodRow = { key: string; label: string; value: number }

/**
 * "How the app was opened" — the deep_link_events.match_method breakdown for attributed
 * opens (app_open + deferred_match), grouped by install stage. Analyst-facing: it answers
 * "which path matched each open", and especially "how were new installs recovered"
 * (clipboard vs install_referrer vs IP estimate). Replaced the old Simple/Detailed pie —
 * the Simple reliability view duplicated the App Open / New installs headlines and read a
 * platform relabel ("Exact match") as a quality win, which it isn't.
 */
export function AppOpenMethodBreakdown({ data }: { data: Record<string, number> }) {
  const { t } = useTranslation(['domain'])

  const { groups, total, maxVal } = useMemo(() => {
    // Single pass over the method counts: bucket into install-stage groups and
    // accumulate the page total + shared bar-scale max at the same time.
    const byGroup: Record<GroupKey, MethodRow[]> = { already_installed: [], new_install: [] }
    let total = 0
    let maxVal = 1 // shared across BOTH groups so bar widths stay comparable group-to-group
    for (const [key, value] of Object.entries(data || {})) {
      if (value <= 0) continue
      const group: GroupKey = NEW_INSTALL_METHODS.has(key) ? 'new_install' : 'already_installed'
      byGroup[group].push({
        key,
        label: t(`domain:deepLink.analytics.method.${key}`, { defaultValue: key }),
        value,
      })
      total += value
      if (value > maxVal) maxVal = value
    }
    const groups = GROUP_ORDER.map((key) => ({
      key,
      rows: byGroup[key].sort((a, b) => b.value - a.value),
      total: byGroup[key].reduce((sum, r) => sum + r.value, 0),
    })).filter((g) => g.rows.length > 0)
    return { groups, total, maxVal }
  }, [data, t])

  return (
    <WidgetCard
      title={t('domain:deepLink.analytics.open_method_title')}
      isEmpty={total === 0}
      emptyLabel="—"
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.key}>
            {/* Header geometry mirrors the rows (flex-1 pl-3 + w-16 pr-2) so the group
                total sits directly above the per-method counts. */}
            <div className="text-muted-foreground mb-1.5 flex items-center text-xs font-medium">
              <span className="flex-1 pl-3">
                {t(`domain:deepLink.analytics.open_method_group.${group.key}`)}
              </span>
              <span className="w-16 pr-2 text-right tabular-nums">{group.total}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {group.rows.map((row) => (
                <div key={row.key} className="relative h-7">
                  <div
                    className="bg-secondary-blue/10 absolute left-0 top-0 h-7 rounded"
                    style={{ width: `${(row.value / maxVal) * 100}%` }}
                  />
                  <div className="absolute left-0 top-0 flex h-7 w-full items-center">
                    <p className="flex-1 truncate pl-3 text-xs text-slate-700">{row.label}</p>
                    <span className="w-16 pr-2 text-right text-sm tabular-nums text-slate-700">
                      {row.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
