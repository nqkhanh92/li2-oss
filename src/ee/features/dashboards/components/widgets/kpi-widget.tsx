'use client'

import type { WidgetDataResult } from '../../types'

export function KpiWidget({ data }: { data: WidgetDataResult }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <span className="text-4xl font-bold tracking-tight tabular-nums text-stone-800">
        {data.total.toLocaleString()}
      </span>
    </div>
  )
}
