'use client'

import { RealtimeSummaryData } from '@/core/types/analytics/advanced.type'
import { Card } from '@/shared/components/ui/card'
import { TrendIndicator } from '@/features/overview/components/trend-indicator'
import { cn } from '@/shared/lib/utils'
import { Link2, ScanQrCode, SmartphoneNfc } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { LiveDot } from './live-dot'
import { CHANNEL_CONFIG } from './realtime-top-links'

interface RealtimeHeroMetricsProps {
  summary: RealtimeSummaryData | null | undefined
  isLoading: boolean
}

export function RealtimeHeroMetrics({ summary, isLoading }: RealtimeHeroMetricsProps) {
  const { t } = useTranslation(['realtime'])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>
    )
  }

  const channelKey = summary?.top_channel?.toLowerCase() as keyof typeof CHANNEL_CONFIG | undefined
  const channel = channelKey ? CHANNEL_CONFIG[channelKey] : null
  const ChannelIcon = channel?.icon

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{t('hero.active_now')}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-foreground">
            {(summary?.active_visitors_5min ?? 0).toLocaleString()}
          </span>
          <LiveDot />
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{t('hero.engagements_1hr')}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-foreground">
            {(summary?.clicks_1hr ?? 0).toLocaleString()}
          </span>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{t('hero.engagements_24hr')}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-foreground">
            {(summary?.clicks_24hr ?? 0).toLocaleString()}
          </span>
          {summary && (
            <TrendIndicator current={summary.clicks_24hr} previous={summary.clicks_prev_24hr} />
          )}
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{t('hero.top_channel')}</p>
        <div className="flex items-center gap-2 mt-1">
          {ChannelIcon && <ChannelIcon className={cn('h-5 w-5', channel?.textColor)} />}
          <span className="text-2xl font-bold text-foreground">{channel?.label ?? '—'}</span>
        </div>
      </Card>
    </div>
  )
}
