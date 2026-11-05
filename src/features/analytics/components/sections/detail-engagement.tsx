'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Copy, User, UserRound } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import dayjs from '@/shared/lib/dayjs'
import { DateRange } from 'react-day-picker'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { useRawVisitDataInfiniteScroll } from '@/features/analytics/hooks/useRawVisitDataInfiniteScroll'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { toast } from '@/shared/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { disabledFeatures } from '@/shared/constants/disabled-features'

// The Visitor column resolves a customer profile through conversion_events, which is
// attribution data. The API drops those fields under the same flag.
const SHOW_VISITOR = !disabledFeatures.ATTRIBUTION

// Link, OS, Platform, Location, Channel, IP, Time, [Visitor]
const COLUMN_COUNT = SHOW_VISITOR ? 8 : 7

interface DetailEngagementProps {
  orgId: string
  dateRange?: DateRange
  excludeBot?: boolean
  tagIds?: string[]
  tpIds?: string[]
  collectionIds?: string[]
  utmSourceValues?: string[]
  utmMediumValues?: string[]
  utmCampaignValues?: string[]
  interactionTypes?: AllTouchPointVariants[]
}

const channelMap = {
  [AllTouchPointVariants.LINK]: 'Click',
  [AllTouchPointVariants.QR]: 'Scan',
  [AllTouchPointVariants.NFC]: 'Tap',
  [AllTouchPointVariants.WIFI]: 'WiFi Connect',
}

const getChannelBadgeStyles = (type: AllTouchPointVariants) => {
  if (type === AllTouchPointVariants.LINK) {
    return {
      bg: 'bg-green-50',
      text: 'text-green-800',
      dot: 'bg-green-600',
    }
  }

  if (type === AllTouchPointVariants.QR) {
    return {
      bg: 'bg-cyan-50',
      text: 'text-cyan-800',
      dot: 'bg-cyan-600',
    }
  }

  if (type === AllTouchPointVariants.NFC) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      dot: 'bg-blue-600',
    }
  }

  return {
    bg: 'bg-slate-50',
    text: 'text-foreground',
    dot: 'bg-slate-600',
  }
}

export const DetailEngagement = ({
  orgId,
  dateRange,
  excludeBot = false,
  tagIds = [],
  tpIds = [],
  collectionIds = [],
  utmSourceValues = [],
  utmMediumValues = [],
  utmCampaignValues = [],
  interactionTypes = [],
}: DetailEngagementProps) => {
  const formattedDateRange = useMemo(
    () => ({
      from: dayjs(dateRange?.from || dayjs().subtract(7, 'day').toDate())
        .startOf('day')
        .toDate(),
      to: dayjs(dateRange?.to || new Date())
        .endOf('day')
        .toDate(),
    }),
    [dateRange]
  )

  const { data, isLoading } = useRawVisitDataInfiniteScroll(orgId, {
    tag_ids: tagIds,
    tp_ids: tpIds,
    date_range: formattedDateRange,
    exclude_bot: excludeBot,
    collection_ids: collectionIds.length > 0 ? collectionIds : undefined,
    utm_sources: utmSourceValues,
    utm_mediums: utmMediumValues,
    utm_campaigns: utmCampaignValues,
    interaction_types: interactionTypes,
  })

  const handleCopyIP = (ip: string) => {
    navigator.clipboard.writeText(ip)
    toast({
      title: 'Copied',
      description: 'IP address copied to clipboard',
      variant: 'success',
    })
  }

  const visits = data?.pages?.[0]?.data || []
  const { orgRouterPush } = useOrganizationStoreProvider()

  return (
    <Card className="w-full rounded-2xl overflow-hidden">
      <CardHeader className="p-6 pb-0">
        <CardTitle className="text-base font-medium text-slate-700">Detail Engagement</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-4">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full">
                {/* Table Header */}
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-slate-50">
                    <th className="px-2 py-2 text-left">
                      <p className="text-sm font-medium text-slate-500">Link</p>
                    </th>
                    <th className="px-2 py-2 text-center">
                      <p className="text-sm font-medium text-slate-500">OS</p>
                    </th>
                    <th className="px-2 py-2 text-center">
                      <p className="text-sm font-medium text-slate-500">Platform</p>
                    </th>
                    <th className="px-2 py-2 text-center">
                      <p className="text-sm font-medium text-slate-500">Location</p>
                    </th>
                    <th className="px-2 py-2 text-center">
                      <p className="text-sm font-medium text-slate-500">Channel</p>
                    </th>
                    <th className="px-2 py-2 text-center">
                      <p className="text-sm font-medium text-slate-500">IP</p>
                    </th>
                    <th className="px-2 py-2 text-center">
                      <p className="text-sm font-medium text-slate-500">Time</p>
                    </th>
                    {SHOW_VISITOR && (
                      <th className="px-2 py-2 text-left">
                        <p className="text-sm font-medium text-slate-500">Visitor</p>
                      </th>
                    )}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-slate-200">
                          {[...Array(COLUMN_COUNT)].map((_, cell) => (
                            <td key={cell} className={cn('px-2 py-1', cell === 0 && 'h-[50px]')}>
                              <Skeleton className="h-5 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ) : visits.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_COUNT} className="py-8 text-center">
                        <EmptySection size="sm" title="No engagement data" description="" />
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit: any, index: number) => {
                      const channelStyles = getChannelBadgeStyles(visit.channel)
                      const formattedDate = dayjs(visit.created_at).format('MMM DD')

                      return (
                        <tr key={visit.id || index} className="border-b border-slate-200 h-[50px]">
                          <td className="px-2 py-1">
                            <div
                              className="cursor-pointer truncate max-w-[200px]"
                              onClick={() => {
                                if (visit.touchpoint_id && visit.touchpoint_name) {
                                  orgRouterPush(`/touch-points/${visit.touchpoint_id}`)
                                }
                              }}
                            >
                              <p className="text-sm font-normal text-slate-500 truncate">
                                {visit.touchpoint_name || visit.touchpoint_id || '-'}
                              </p>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <p className="text-sm font-normal text-slate-500">{visit.os || '-'}</p>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <p className="text-sm font-normal text-slate-500">
                              {visit.platform || '-'}
                            </p>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <p className="text-sm font-normal text-slate-500">
                              {visit.country || '-'}
                            </p>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <div className="flex justify-center">
                              <div
                                className={cn(
                                  'flex gap-1 items-center px-3 py-1 rounded-full',
                                  channelStyles.bg
                                )}
                              >
                                <div className={cn('w-2 h-2 rounded-full', channelStyles.dot)} />
                                <p className={cn('text-xs font-medium', channelStyles.text)}>
                                  {channelMap[visit.channel as AllTouchPointVariants] || 'Unknown'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <p className="text-sm font-normal text-slate-500 truncate max-w-[100px]">
                                {visit.ip || '-'}
                              </p>
                              {visit.ip && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyIP(visit.ip)
                                  }}
                                  className="shrink-0 w-3.5 h-3.5 flex items-center justify-center hover:opacity-70 transition-opacity"
                                >
                                  <Copy className="w-3 h-3 text-foreground" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <p
                              className="text-sm font-normal text-slate-500"
                              title={dayjs(visit.created_at).format('LLL')}
                            >
                              {formattedDate}
                            </p>
                          </td>
                          {SHOW_VISITOR && (
                            <td className="px-2 py-1">
                              {visit.customer_name ||
                              visit.customer_email ||
                              visit.customer_external_id ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="shrink-0 w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center">
                                    <User className="w-3 h-3 text-secondary" />
                                  </div>
                                  <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                                    {visit.customer_name ||
                                      visit.customer_email ||
                                      visit.customer_external_id}
                                  </p>
                                </div>
                              ) : visit.visitor_id ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                    <UserRound className="w-3 h-3 text-slate-400" />
                                  </div>
                                  <p
                                    className="text-xs text-slate-400 truncate max-w-[140px]"
                                    title={visit.visitor_id}
                                  >
                                    {visit.visitor_id}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-300">—</p>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
