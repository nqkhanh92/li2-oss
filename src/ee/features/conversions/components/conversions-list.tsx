'use client'

import { useEffect, useRef } from 'react'
import { DateRange } from 'react-day-picker'
import Link from 'next/link'
import { useGetConversions } from '../hooks/queries'
import { ConversionEvent } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { ChevronLeft, ChevronRight, Search, ArrowRight, FilterIcon } from 'lucide-react'
import { ChannelFormulaInfo } from '@/shared/components/customize/channel-formula-info'
import { formatCurrencyFromCents, normalizeCurrency } from '@/shared/lib/currency'
import { useFilters } from '@/shared/hooks/use-filters'
import { SearchFilterPagination } from '@/shared/types'
import { ConversionSection } from './conversions-view'


interface ConversionsListProps {
  orgId: string
  dateRange?: DateRange
  touchPointId?: string
  filters: ReturnType<typeof useFilters>['filters']
  setFilter: ReturnType<typeof useFilters>['setFilter']
  scrollToSection: (section: ConversionSection) => void
}

export function ConversionsList({
  orgId,
  dateRange,
  touchPointId,
  filters,
  setFilter,
  scrollToSection,
}: ConversionsListProps) {
  const { t } = useTranslation('conversions')

  // Use useFilters hook for URL-synced pagination state
  const { pagination, setPagination, sorting, search, setSearch } = useFilters(
    {
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [{ id: 'created_at', desc: true }],
    },
    false
  )

  // Track previous filter values to detect changes and reset pagination
  const eventNamesKey = JSON.stringify(filters.event_names || [])
  const prevFiltersRef = useRef({ dateRange, touchPointId, eventNamesKey })

  useEffect(() => {
    const prevFilters = prevFiltersRef.current
    const currentEventNamesKey = JSON.stringify(filters.event_names || [])
    const filtersChanged =
      prevFilters.dateRange?.from?.getTime() !== dateRange?.from?.getTime() ||
      prevFilters.dateRange?.to?.getTime() !== dateRange?.to?.getTime() ||
      prevFilters.touchPointId !== touchPointId ||
      prevFilters.eventNamesKey !== currentEventNamesKey

    if (filtersChanged) {
      setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
      prevFiltersRef.current = { dateRange, touchPointId, eventNamesKey: currentEventNamesKey }
    }
  }, [dateRange, touchPointId, filters.event_names, setPagination, pagination.pageSize])

  // Build query params in SearchFilterPagination format
  const queryParams: SearchFilterPagination = {
    pagination,
    sorting,
    search: search || undefined,
    filters: {
      ...(dateRange &&
        (dateRange.from || dateRange.to) && {
          created_at: {
            ...(dateRange.from && { from: dateRange.from.getTime() }),
            ...(dateRange.to && { to: dateRange.to.getTime() }),
          },
        }),
      ...filters,
    },
  }

  const { data, isLoading } = useGetConversions(orgId, queryParams)

  const currentPage = pagination.pageIndex + 1
  const totalPages = Math.ceil((data?.rowCount ?? 0) / pagination.pageSize)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('events.title', 'Conversion Events')}</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('events.searchPlaceholder', 'Search by email or name...')}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('events.columns.eventName', 'Event Name')}</TableHead>
              <TableHead>{t('events.columns.customer', 'Customer')}</TableHead>
              <TableHead>{t('events.columns.touchPoint', 'Link')}</TableHead>
              <TableHead>{t('events.columns.utmSource', 'UTM Source')}</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  {t('events.columns.channel', 'Channel')}
                  <ChannelFormulaInfo />
                </div>
              </TableHead>
              <TableHead>{t('events.columns.type', 'Type')}</TableHead>
              <TableHead>{t('events.columns.amount', 'Amount')}</TableHead>
              <TableHead>{t('events.columns.createdAt', 'Created At')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {t('events.empty', 'No conversion events found')}
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((event: ConversionEvent) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      {event.event_name}
                      {event.event_type === 'sale' && event.lead_event && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <ArrowRight className="h-3 w-3" />
                          {t('events.fromLead', 'from "{{leadName}}"', {
                            leadName: event.lead_event.event_name,
                          })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.customer_profiles?.id ? (
                      <Link
                        href={`/org/${orgId}/customers/${event.customer_profiles.id}`}
                        className="text-primary hover:underline hover:text-primary/80 transition-colors"
                      >
                        {event.customer_profiles.email ||
                          event.customer_profiles.name ||
                          t('events.anonymous', 'Anonymous')}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        {t('events.anonymous', 'Anonymous')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex gap-1 items-center">
                        {event.touch_points?.name ?? t('events.direct', 'Direct')}
                        {(() => {
                          if (!event.touch_point_id) return null
                          if ((filters.touch_point_ids as string[]).includes(event.touch_point_id))
                            return null
                          return (
                            <FilterIcon
                              className="size-4 cursor-pointer"
                              onClick={() => {
                                setFilter('touch_point_ids', [event.touch_point_id as string])
                                setTimeout(() => {
                                  scrollToSection(ConversionSection.FILTERS)
                                }, 100)
                              }}
                            />
                          )
                        })()}
                      </div>
                      {event.touch_points?.short_url ? (
                        <span className="text-xs text-muted-foreground">
                          {event.touch_points.short_url}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('events.directDescription', 'Not via short link')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.utm_source ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.channel ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.event_type === 'lead' ? 'secondary' : 'default'}>
                      {event.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {event.event_type === 'sale' && event.amount != null
                      ? formatCurrencyFromCents(event.amount, normalizeCurrency(event.currency))
                      : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {(data?.rowCount ?? 0) > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t('pagination.showing', 'Showing {{from}} to {{to}} of {{total}}', {
                from: pagination.pageIndex * pagination.pageSize + 1,
                to: Math.min((pagination.pageIndex + 1) * pagination.pageSize, data?.rowCount ?? 0),
                total: data?.rowCount ?? 0,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination({ ...pagination, pageIndex: pagination.pageIndex - 1 })
                }
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination({ ...pagination, pageIndex: pagination.pageIndex + 1 })
                }
                disabled={(pagination.pageIndex + 1) * pagination.pageSize >= (data?.rowCount ?? 0)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
