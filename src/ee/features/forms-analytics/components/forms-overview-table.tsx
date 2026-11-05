'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormsOverviewRow } from '@/core/repositories/forms-analytics.repository'
import { cn } from '@/shared/lib/utils'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

type SortKey = 'fills' | 'submits' | 'completion_pct' | 'avg_time_on_form'
type SortDir = 'asc' | 'desc'

function formatTime(seconds: number | null): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function completionColor(pct: number | null): string {
  if (pct === null) return 'bg-muted'
  if (pct >= 50) return 'bg-green-500'
  if (pct >= 25) return 'bg-amber-500'
  return 'bg-red-500'
}

function formLabel(row: FormsOverviewRow, unknownForm: string): string {
  return row.form_id ?? row.form_name ?? row.form_action ?? row.page_path ?? unknownForm
}

type Props = {
  data: FormsOverviewRow[]
  onRowClick: (row: FormsOverviewRow) => void
}

export function FormsOverviewTable({ data, onRowClick }: Props) {
  const { t } = useTranslation('forms-analytics')
  const [sortKey, setSortKey] = useState<SortKey>('fills')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
  })

  function SortButton({ label, col }: { label: string; col: SortKey }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-auto px-2 py-1 -mx-2 font-medium text-xs', sortKey === col && 'text-primary')}
        onClick={() => handleSort(col)}
      >
        {label}
        <ArrowUpDown className="ml-1 w-3 h-3" />
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-[30%]">
                {t('table.form')}
              </th>
              <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">
                {t('table.page')}
              </th>
              <th className="text-right px-4 py-3">
                <SortButton label={t('table.fills')} col="fills" />
              </th>
              <th className="text-right px-4 py-3">
                <SortButton label={t('table.submits')} col="submits" />
              </th>
              <th className="px-4 py-3 min-w-[160px]">
                <SortButton label={t('table.completionPct')} col="completion_pct" />
              </th>
              <th className="text-right px-4 py-3">
                <SortButton label={t('table.avgTime')} col="avg_time_on_form" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  {t('table.noData')}
                </td>
              </tr>
            )}
            {sorted.map((row, i) => {
              const pct = row.completion_pct ?? 0
              return (
                <tr
                  key={i}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onRowClick(row)}
                >
                  <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                    {formLabel(row, t('detail.unknownForm'))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[160px]">
                    {row.page_path ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.fills.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.submits.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', completionColor(row.completion_pct))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium tabular-nums w-10 text-right',
                          pct >= 50
                            ? 'text-green-600'
                            : pct >= 25
                              ? 'text-amber-600'
                              : 'text-red-600'
                        )}
                      >
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                    {formatTime(row.avg_time_on_form)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
