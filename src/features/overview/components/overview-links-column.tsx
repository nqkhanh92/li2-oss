'use client'

import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { TrendIndicator } from './trend-indicator'
import type { OverviewLinksData } from '../types'

interface OverviewLinksColumnProps {
  data: OverviewLinksData
}

const CHANNEL_LABELS: Record<string, string> = {
  LINK: 'Link',
  QR: 'QR',
  NFC: 'NFC',
}

export function OverviewLinksColumn({ data }: OverviewLinksColumnProps) {
  const { t } = useTranslation('overview')
  const { org_id } = useParams<{ org_id: string }>()

  const isEmpty = data.totalClicks === 0 && data.totalClicksPrev === 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          {t('columns.links.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        {isEmpty ? (
          <EmptySection
            size="sm"
            title={t('columns.links.empty.title')}
            description={t('columns.links.empty.description')}
          />
        ) : (
          <>
            {/* Primary metric: Total Clicks */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {data.totalClicks.toLocaleString()}
                </span>
                <TrendIndicator current={data.totalClicks} previous={data.totalClicksPrev} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('columns.links.totalClicks')}
              </p>
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('columns.links.unique')}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.uniqueClicks.toLocaleString()}
                </p>
                <TrendIndicator current={data.uniqueClicks} previous={data.uniqueClicksPrev} />
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('columns.links.avgPerDay')}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.avgPerDay.toLocaleString()}
                </p>
                <TrendIndicator current={data.avgPerDay} previous={data.avgPerDayPrev} />
              </div>
            </div>

            {/* Channel breakdown pills */}
            {data.channels.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('columns.links.channels')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.channels.map((ch) => (
                    <span
                      key={ch.name}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {CHANNEL_LABELS[ch.name] ?? ch.name}: {ch.count.toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top performers */}
            {data.topLinks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('columns.links.topLinks')}
                </p>
                <div className="space-y-1.5">
                  {data.topLinks.slice(0, 3).map((link, i) => (
                    <Link
                      key={link.slug ?? `link-${i}`}
                      href={
                        link.slug
                          ? `/org/${org_id}/analytics?slug=${link.slug}`
                          : `/org/${org_id}/analytics`
                      }
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 transition-colors"
                    >
                      <span className="truncate text-slate-700 max-w-[70%]">{link.name}</span>
                      <span className="font-medium text-foreground">
                        {link.count.toLocaleString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
