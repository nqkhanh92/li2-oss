'use client'

import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { MousePointerClick, Users, Monitor, ArrowDownUp } from 'lucide-react'
import type { TrafficSummary as TrafficSummaryType } from '../types'
import type { LucideIcon } from 'lucide-react'

interface TrafficSummaryProps {
  data: TrafficSummaryType | undefined
  isLoading: boolean
}

const stats: {
  key: keyof TrafficSummaryType
  tKey: string
  icon: LucideIcon
  accent: string
  iconBg: string
  format?: (v: number) => string
}[] = [
  {
    key: 'total_clicks',
    tKey: 'traffic.totalClicks',
    icon: MousePointerClick,
    accent: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  {
    key: 'unique_visitors',
    tKey: 'traffic.uniqueVisitors',
    icon: Users,
    accent: 'text-violet-600',
    iconBg: 'bg-violet-50',
  },
  {
    key: 'total_sessions',
    tKey: 'traffic.sessions',
    icon: Monitor,
    accent: 'text-teal-600',
    iconBg: 'bg-teal-50',
  },
  {
    key: 'bounce_rate',
    tKey: 'traffic.bounceRate',
    icon: ArrowDownUp,
    accent: 'text-amber-600',
    iconBg: 'bg-amber-50',
    format: (v) => `${v}%`,
  },
]

export function TrafficSummary({ data, isLoading }: TrafficSummaryProps) {
  const { t } = useTranslation('link-journey')

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-4">
              <Skeleton className="size-10 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ key, tKey, icon: Icon, accent, iconBg, format }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className={`rounded-lg p-2.5 ${iconBg}`}>
              <Icon className={`h-5 w-5 ${accent}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-1">{t(tKey)}</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {format
                  ? format(data?.[key] ?? 0)
                  : (data?.[key] ?? 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
