'use client'

import { MousePointerClick, Zap, ArrowDownToLine, PenLine, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { INTERACTION_TYPE_LABELS } from '../types'
import type { SitePageTypeBreakdown } from '../types'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  click:       { icon: MousePointerClick, color: 'text-blue-500' },
  rage_click:  { icon: Zap,              color: 'text-red-500' },
  scroll:      { icon: ArrowDownToLine,  color: 'text-violet-500' },
  form_fill:   { icon: PenLine,          color: 'text-amber-500' },
  form_submit: { icon: Send,             color: 'text-green-500' },
}

interface InteractionOverviewProps {
  totalCount: number
  byType: SitePageTypeBreakdown[]
  title?: string
}

export function InteractionOverview({ totalCount, byType, title = 'Interaction Overview' }: InteractionOverviewProps) {
  return (
    <Card className="w-full rounded-2xl overflow-hidden">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-medium text-base text-slate-700">{title}</CardTitle>
          <div className="flex items-end gap-1">
            <span className="font-semibold text-xl leading-none text-slate-700">
              {totalCount.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500 leading-5">total</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="flex flex-col md:flex-row flex-wrap gap-4">
          {Object.entries(INTERACTION_TYPE_LABELS).map(([type, label]) => {
            const count = byType.find((t) => t.type === type)?.count ?? 0
            const pct = totalCount > 0 ? (count / totalCount) * 100 : 0
            const cfg = TYPE_CONFIG[type]
            const Icon = cfg?.icon

            return (
              <div key={type} className="flex flex-1 gap-3 items-center min-w-[140px]">
                <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-10">
                  {Icon && <Icon className={cn('size-5 stroke-2', cfg.color)} />}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-normal text-sm leading-5 text-slate-500 truncate">{label}</p>
                  <div className="flex items-end gap-1.5">
                    <p className="font-semibold text-xl leading-none text-slate-700">
                      {count.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400 leading-5">
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
