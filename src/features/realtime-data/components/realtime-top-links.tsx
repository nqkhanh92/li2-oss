'use client'

import { RealtimeTopLinkData } from '@/core/types/analytics/advanced.type'
import { Card } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { Link2, ScanQrCode, SmartphoneNfc, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { EmptySection } from '@/shared/components/customize/empty-section'

interface RealtimeTopLinksProps {
  topLinks: RealtimeTopLinkData[] | undefined
  isLoading: boolean
}

export const CHANNEL_CONFIG = {
  link: { color: 'bg-blue-500', textColor: 'text-blue-600', icon: Link2, label: 'Link' },
  qr: { color: 'bg-purple-500', textColor: 'text-purple-600', icon: ScanQrCode, label: 'QR' },
  nfc: { color: 'bg-pink-500', textColor: 'text-pink-600', icon: SmartphoneNfc, label: 'NFC' },
} as const

function ChannelBar({ link }: { link: RealtimeTopLinkData }) {
  const total = link.click_count
  if (total === 0) return null

  const segments = [
    { count: link.link_count, ...CHANNEL_CONFIG.link },
    { count: link.qr_count, ...CHANNEL_CONFIG.qr },
    { count: link.nfc_count, ...CHANNEL_CONFIG.nfc },
  ].filter((s) => s.count > 0)

  return (
    <div className="flex h-1 w-full rounded-full overflow-hidden bg-slate-100 mt-1.5">
      {segments.map((seg) => (
        <div
          key={seg.label}
          className={cn('h-full transition-all duration-500', seg.color)}
          style={{ width: `${(seg.count / total) * 100}%` }}
        />
      ))}
    </div>
  )
}

function ChannelBreakdown({ links }: { links: RealtimeTopLinkData[] }) {
  const totals = links.reduce(
    (acc, l) => ({
      link: acc.link + l.link_count,
      qr: acc.qr + l.qr_count,
      nfc: acc.nfc + l.nfc_count,
    }),
    { link: 0, qr: 0, nfc: 0 }
  )
  const total = totals.link + totals.qr + totals.nfc
  if (total === 0) return null

  const channels = [
    { count: totals.link, ...CHANNEL_CONFIG.link },
    { count: totals.qr, ...CHANNEL_CONFIG.qr },
    { count: totals.nfc, ...CHANNEL_CONFIG.nfc },
  ].filter((c) => c.count > 0)

  return (
    <div className="space-y-2.5">
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100">
        {channels.map((ch) => (
          <div
            key={ch.label}
            className={cn('h-full transition-all duration-500', ch.color)}
            style={{ width: `${(ch.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-4 text-xs">
        {channels.map((ch) => {
          const Icon = ch.icon
          const pct = Math.round((ch.count / total) * 100)
          return (
            <span
              key={ch.label}
              className={cn('flex items-center gap-1.5 font-medium', ch.textColor)}
            >
              <Icon className="h-3 w-3" />
              {ch.label}
              <span className="text-slate-400 font-normal">{pct}%</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center h-6 w-6 rounded-md bg-amber-50 text-amber-500">
        <Trophy className="h-3.5 w-3.5" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-50 text-slate-400 text-xs font-semibold tabular-nums">
      {rank}
    </div>
  )
}

export function RealtimeTopLinks({ topLinks, isLoading }: RealtimeTopLinksProps) {
  const { t } = useTranslation(['realtime'])

  const maxClicks = topLinks?.[0]?.click_count ?? 0

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">{t('top_links.title')}</h3>
      </div>

      {isLoading ? (
        <div className="px-4 pb-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      ) : !topLinks || topLinks.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptySection
            size="sm"
            title={t('top_links.empty_title')}
            description={t('top_links.empty_description')}
          />
        </div>
      ) : (
        <>
          {/* Links list */}
          <div className="px-4 pb-4">
            <div className="space-y-3">
              {topLinks.map((link, idx) => {
                const barWidth = maxClicks > 0 ? (link.click_count / maxClicks) * 100 : 0

                return (
                  <div key={link.touchpoint_id} className="flex items-start gap-2.5">
                    <RankBadge rank={idx + 1} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate leading-6">
                          {link.touchpoint_name}
                        </p>
                        <span className="flex-shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                          {link.click_count.toLocaleString()}
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full rounded-full bg-slate-100 mt-1">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full overflow-hidden flex transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        >
                          {[
                            { count: link.link_count, color: CHANNEL_CONFIG.link.color },
                            { count: link.qr_count, color: CHANNEL_CONFIG.qr.color },
                            { count: link.nfc_count, color: CHANNEL_CONFIG.nfc.color },
                          ]
                            .filter((s) => s.count > 0)
                            .map((seg) => (
                              <div
                                key={seg.color}
                                className={cn('h-full', seg.color)}
                                style={{
                                  width: `${(seg.count / link.click_count) * 100}%`,
                                }}
                              />
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Channel breakdown footer */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs font-medium text-slate-500 mb-2">
              {t('channel_breakdown.title')}
            </p>
            <ChannelBreakdown links={topLinks} />
          </div>
        </>
      )}
    </Card>
  )
}
