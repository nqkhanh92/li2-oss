'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'

const CHART_COLORS = [
  '#437EF7',
  '#F36600',
  '#11A5A5',
  '#F7B713',
  '#4125B9',
  '#B2D6DE',
]

interface BreakdownListProps {
  items: { name: string; count: number }[]
  isLoading: boolean
  emptyText?: string
}

export function BreakdownList({ items, isLoading, emptyText = 'No data' }: BreakdownListProps) {
  const total = useMemo(() => items.reduce((s, i) => s + i.count, 0), [items])
  const top = useMemo(() => items.slice(0, 8), [items])

  if (isLoading) return <Skeleton className="h-[180px] w-full" />
  if (!top.length) return <p className="text-xs text-muted-foreground py-4 text-center">{emptyText}</p>

  return (
    <div className="flex flex-col gap-1">
      {top.map((item, i) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0
        const color = CHART_COLORS[i % CHART_COLORS.length]
        return (
          <div key={item.name} className="relative h-7">
            <div
              className="absolute inset-y-0 left-0 rounded opacity-10 transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
            <div className="absolute inset-0 flex items-center px-2">
              <div className="mr-2 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
              <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{item.name}</span>
              <span className="ml-2 shrink-0 text-xs text-slate-500">
                {item.count.toLocaleString()}
                <span className="ml-1 text-slate-400">({pct.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
