'use client'

import { Users, UserRound, TrendingDown, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

interface SessionMetric {
  icon: React.ElementType
  color: string
  label: string
  value: string
}

function formatDuration(sec: number | null): string {
  if (sec === null || sec === 0) return '—'
  if (sec < 60) return `${sec.toFixed(0)}s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

interface SessionOverviewProps {
  totalSessions: number
  uniqueVisitors: number
  bounceRate: number | null
  avgDurationSec: number | null
  title?: string
}

export function SessionOverview({
  totalSessions,
  uniqueVisitors,
  bounceRate,
  avgDurationSec,
  title = 'Session Overview',
}: SessionOverviewProps) {
  const metrics: SessionMetric[] = [
    {
      icon: Users,
      color: 'text-blue-500',
      label: 'Sessions',
      value: totalSessions.toLocaleString(),
    },
    {
      icon: UserRound,
      color: 'text-violet-500',
      label: 'Unique Visitors',
      value: uniqueVisitors.toLocaleString(),
    },
    {
      icon: TrendingDown,
      color: 'text-red-500',
      label: 'Bounce Rate',
      value: bounceRate !== null ? `${bounceRate.toFixed(1)}%` : '—',
    },
    {
      icon: Clock,
      color: 'text-amber-500',
      label: 'Avg. Duration',
      value: formatDuration(avgDurationSec),
    },
  ]

  return (
    <Card className="w-full rounded-2xl overflow-hidden">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="font-medium text-base text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="flex flex-col md:flex-row flex-wrap gap-4">
          {metrics.map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="flex flex-1 gap-3 items-center min-w-[140px]">
              <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-10">
                <Icon className={cn('size-5 stroke-2', color)} />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-normal text-sm leading-5 text-slate-500 truncate">{label}</p>
                <p className="font-semibold text-xl leading-none text-slate-700">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
