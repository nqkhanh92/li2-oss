'use client'

import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { intensityToColor } from '../lib/color-ramp'
import type { ScrollDepthMilestone } from '../types'

const ZONE_LABELS = ['0 → 25%', '25 → 50%', '50 → 75%', '75 → 90%', '90 → 100%']
const ZONE_DEPTHS = [25, 50, 75, 90, 100]

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

interface ScrollHeatmapStatsProps {
  milestones: ScrollDepthMilestone[]
  totalSessions: number
  isLoading?: boolean
}

export function ScrollHeatmapStats({ milestones, totalSessions, isLoading }: ScrollHeatmapStatsProps) {
  const { t } = useTranslation('heatmap')
  const milestoneMap = new Map(milestones.map((m) => [m.scroll_depth_percent, m]))

  if (isLoading) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center border-b border-slate-50 py-2">
          <p className="flex-1 !text-s text-muted-foreground pl-5 px-2">{t('scrollStats.scrollDepth')}</p>
          <p className="flex-1 !text-s text-muted-foreground text-center px-2">{t('scrollStats.usersReached')}</p>
          <p className="flex-1 !text-s text-muted-foreground text-center px-2">{t('scrollStats.percentOfVisitors')}</p>
          <p className="flex-1 !text-s text-muted-foreground text-right px-2">{t('scrollStats.avgTimeInZone')}</p>
        </div>
        {ZONE_DEPTHS.map((depth) => (
          <div key={depth} className="flex items-center gap-4 rounded-[4px] px-4 py-2 bg-muted/30">
            <div className="h-8 w-1 shrink-0 rounded-full bg-muted" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Header */}
      <div className="flex items-center border-b border-slate-50 py-2">
        <p className="flex-1 !text-s text-muted-foreground pl-5 px-2">{t('scrollStats.scrollDepth')}</p>
        <p className="flex-1 !text-s text-muted-foreground text-center px-2">{t('scrollStats.usersReached')}</p>
        <p className="flex-1 !text-s text-muted-foreground text-center px-2">{t('scrollStats.percentOfVisitors')}</p>
        <p className="flex-1 !text-s text-muted-foreground text-right px-2">{t('scrollStats.avgTimeInZone')}</p>
      </div>

      {/* Zone rows */}
      {ZONE_DEPTHS.map((depth, i) => {
        const m = milestoneMap.get(depth)
        const sessionsReached = i === 0
          ? totalSessions
          : (milestoneMap.get(ZONE_DEPTHS[i - 1])?.sessions_reached ?? 0)
        const pctOfTotal = totalSessions > 0 ? Math.round((sessionsReached / totalSessions) * 100) : 0
        const avgTime = m?.avg_time_at_depth ?? 0
        const intensity = totalSessions > 0 ? sessionsReached / totalSessions : 0
        const [r, g, b] = intensityToColor(Math.max(0.01, intensity))
        const barColor = `rgb(${r},${g},${b})`
        const bgColor = `rgba(${r},${g},${b},0.08)`

        return (
          <div key={depth} className="flex items-center gap-4 rounded-[4px] px-4 py-2" style={{ backgroundColor: bgColor }}>
            <div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: barColor }} />
            <p className="flex-1 !text-s font-medium text-foreground min-w-0">{ZONE_LABELS[i]}</p>
            <p className="flex-1 !text-s text-foreground text-center tabular-nums">{sessionsReached.toLocaleString()}</p>
            <p className="flex-1 !text-s text-foreground text-center tabular-nums">{pctOfTotal}%</p>
            <p className="flex-1 !text-s font-medium text-muted-foreground text-right tabular-nums">
              {avgTime > 0 ? formatTime(avgTime) : '—'}
            </p>
          </div>
        )
      })}

      {/* Reached Bottom row */}
      {(() => {
        const m100 = milestoneMap.get(100)
        const reached = m100?.sessions_reached ?? 0
        const pct = totalSessions > 0 ? Math.round((reached / totalSessions) * 100) : 0
        const avgTime = m100?.avg_time_at_depth ?? 0
        return (
          <div className="flex items-center gap-4 rounded-[4px] px-4 py-2 bg-muted/30">
            <div className="h-8 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
            <p className="flex-1 !text-s font-medium text-foreground min-w-0">{t('scrollStats.reachedBottom')}</p>
            <p className="flex-1 !text-s text-foreground text-center tabular-nums">{reached.toLocaleString()}</p>
            <p className="flex-1 !text-s text-foreground text-center tabular-nums">{pct}%</p>
            <p className="flex-1 !text-s font-medium text-muted-foreground text-right tabular-nums">
              {avgTime > 0 ? formatTime(avgTime) : '—'}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
