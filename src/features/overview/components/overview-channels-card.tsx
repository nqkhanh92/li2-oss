'use client'

import { useTranslation } from 'react-i18next'
import { PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptySection } from '@/shared/components/customize/empty-section'
import type { OverviewLinksData } from '../types'

interface OverviewChannelsCardProps {
  data: OverviewLinksData
}

const CHANNEL_LABELS: Record<string, string> = {
  LINK: 'Link',
  QR: 'QR',
  NFC: 'NFC',
}

export function OverviewChannelsCard({ data }: OverviewChannelsCardProps) {
  const { t } = useTranslation('overview')

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <PieChart className="w-4 h-4 text-muted-foreground" />
          {t('columns.links.channels')}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        {data.channels.length === 0 ? (
          <EmptySection
            size="sm"
            title={t('columns.links.empty.title')}
            description={t('columns.links.empty.description')}
          />
        ) : (
          <div className="space-y-1.5">
            {data.channels.map((ch) => (
              <div
                key={ch.name}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="text-slate-700">{CHANNEL_LABELS[ch.name] ?? ch.name}</span>
                <span className="font-medium text-foreground">{ch.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
