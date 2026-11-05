'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useGetStepVisitors, useGetFunnel } from '../hooks/queries'
import { VisitorDetail } from './visitor-detail'
import type { StepMetrics, StepVisitor } from '../types'

type FilterType = 'all' | 'proceeded' | 'dropped_off'

const LIMIT = 20

interface StepVisitorsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  funnelId: string
  stepPosition: number
  stepName: string
  totalSteps: number
  dateRange: { from: string; to: string }
  stepMetrics?: StepMetrics
}

export function StepVisitorsPanel({
  open,
  onOpenChange,
  funnelId,
  stepPosition,
  stepName,
  totalSteps,
  dateRange,
  stepMetrics,
}: StepVisitorsPanelProps) {
  const { t } = useTranslation('funnels')
  const { org_id } = useParams<{ org_id: string }>()
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { data, isLoading } = useGetStepVisitors(org_id, funnelId, stepPosition, {
    from: dateRange.from,
    to: dateRange.to,
    filter,
    page,
    limit: LIMIT,
  })

  const { data: funnelData } = useGetFunnel(org_id, funnelId)

  const visitors = data?.data?.visitors ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const handleFilterChange = (value: string) => {
    setFilter(value as FilterType)
    setPage(1)
  }

  const isLastStep = stepPosition === totalSteps

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setSelectedSessionId(null)
    onOpenChange(isOpen)
  }

  const funnelSteps = funnelData?.data?.funnel_steps ?? []

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto [&>button]:text-slate-500 [&>button]:top-5 [&>button]:right-4 [&>button>svg]:min-w-5 [&>button>svg]:min-h-5">
        {selectedSessionId ? (
          /* ─── Visitor Detail View ─── */
          <VisitorDetail
            orgId={org_id}
            sessionId={selectedSessionId}
            funnelSteps={funnelSteps}
            onBack={() => setSelectedSessionId(null)}
          />
        ) : (
          /* ─── Visitor List View ─── */
          <>
            <SheetHeader className="pb-4">
              <SheetTitle className="text-base">
                {t('visitors.stepTitle', { position: stepPosition, name: stepName })}
              </SheetTitle>
              <SheetDescription>
                {isLoading ? (
                  <Skeleton className="h-4 w-48" />
                ) : (
                  <span>{t('visitors.visitorsReached', { count: total })}</span>
                )}
              </SheetDescription>
            </SheetHeader>

            {/* Filter tabs */}
            {!isLastStep && (
              <Tabs value={filter} onValueChange={handleFilterChange} className="mb-4">
                <TabsList>
                  <TabsTrigger value="all">
                    {t('visitors.all')}{stepMetrics ? ` (${stepMetrics.visits})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="proceeded">
                    {t('visitors.proceeded')}{stepMetrics ? ` (${stepMetrics.proceeds})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="dropped_off">
                    {t('visitors.droppedOff')}{stepMetrics ? ` (${stepMetrics.drop_offs})` : ''}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Visitor table */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : visitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">{t('visitors.noVisitors')}</p>
                <p className="text-xs mt-1">
                  {filter !== 'all'
                    ? t('visitors.tryDifferentFilter')
                    : t('visitors.noSessionsPeriod')}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('visitors.visitor')}</TableHead>
                      <TableHead>{t('visitors.progress')}</TableHead>
                      <TableHead>{t('visitors.device')}</TableHead>
                      <TableHead>{t('visitors.location')}</TableHead>
                      <TableHead className="text-right">{t('visitors.time')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitors.map((visitor) => (
                      <VisitorRow
                        key={visitor.session_id}
                        visitor={visitor}
                        totalSteps={totalSteps}
                        onClick={() => setSelectedSessionId(visitor.session_id)}
                      />
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <span className="text-xs text-slate-500">
                      {t('visitors.pagination', { page, total: totalPages, count: total })}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function VisitorRow({
  visitor,
  totalSteps,
  onClick,
}: {
  visitor: StepVisitor
  totalSteps: number
  onClick: () => void
}) {
  const { t } = useTranslation('funnels')
  const DeviceIcon = getDeviceIcon(visitor.device_type)

  return (
    <TableRow className="cursor-pointer hover:bg-slate-50" onClick={onClick}>
      {/* Visitor ID (truncated) */}
      <TableCell>
        <div className="space-y-0.5">
          <div className="text-xs font-mono text-slate-600 truncate max-w-[120px]">
            {visitor.visitor_id.slice(0, 12)}...
          </div>
          {visitor.referrer_domain && (
            <div className="text-[11px] text-slate-400 truncate max-w-[120px]">
              {visitor.referrer_domain}
            </div>
          )}
        </div>
      </TableCell>

      {/* Progress */}
      <TableCell>
        <div className="flex items-center gap-2">
          <ProgressDots reached={visitor.reached_step} total={totalSteps} />
          {visitor.completed ? (
            <Badge variant="success" size="xs" className="not-italic">
              {t('visitors.done')}
            </Badge>
          ) : visitor.dropped_off ? (
            <Badge variant="destructive" size="xs" className="not-italic">
              {t('visitors.drop')}
            </Badge>
          ) : null}
        </div>
      </TableCell>

      {/* Device */}
      <TableCell>
        <div className="flex items-center gap-1.5 text-slate-500">
          <DeviceIcon className="w-3.5 h-3.5" />
          <span className="text-xs">
            {visitor.browser ?? '—'}
            {visitor.os ? ` / ${visitor.os}` : ''}
          </span>
        </div>
      </TableCell>

      {/* Location */}
      <TableCell>
        {visitor.country ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            {visitor.city ? `${visitor.city}, ` : ''}
            {visitor.country}
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </TableCell>

      {/* Time */}
      <TableCell className="text-right">
        <span className="text-xs text-slate-500 tabular-nums">
          {formatRelativeTime(visitor.started_at)}
        </span>
      </TableCell>
    </TableRow>
  )
}

function ProgressDots({ reached, total }: { reached: number; total: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-2 h-2 rounded-full',
            i < reached ? 'bg-blue-500' : 'bg-slate-200'
          )}
        />
      ))}
    </div>
  )
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return Smartphone
    case 'tablet':
      return Tablet
    default:
      return Monitor
  }
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
