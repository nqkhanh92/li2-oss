'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'

function countryFlag(code: string) {
  if (code.length !== 2) return '🌐'
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
}

interface TopTableProps {
  items: { name: string; count: number }[]
  isLoading: boolean
  showFlag?: boolean
  emptyText?: string
}

export function SessionsTopTable({ items, isLoading, showFlag, emptyText = 'No data' }: TopTableProps) {
  const total = useMemo(() => items.reduce((s, i) => s + i.count, 0), [items])
  const top = useMemo(() => items.slice(0, 10), [items])

  if (isLoading) return <Skeleton className="h-[200px] w-full" />

  return (
    <div className="flex flex-col">
      {!top.length ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        top.map((item, i) => {
          const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0'
          return (
            <div
              key={item.name}
              className="flex items-center gap-2 border-b border-border/50 py-1.5 last:border-0"
            >
              <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
              {showFlag && (
                <span className="shrink-0 text-base leading-none">{countryFlag(item.name)}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{pct}%</span>
              <span className="w-12 shrink-0 text-right text-xs font-medium">
                {item.count.toLocaleString()}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
