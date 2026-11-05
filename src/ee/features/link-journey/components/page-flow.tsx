'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/shared/components/ui/tooltip'
import { MousePointerClick, Filter, FileText } from 'lucide-react'
import type { PageFlowItem } from '../types'

interface PageFlowProps {
  data: PageFlowItem[] | undefined
  isLoading: boolean
  tpId?: string | null
  tpName?: string
}

export function PageFlow({ data, isLoading, tpId, tpName }: PageFlowProps) {
  const { t } = useTranslation('link-journey')
  const { org_id } = useParams<{ org_id: string }>()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('pageFlow.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-6 rounded shrink-0" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 flex-1 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const pages = data ?? []
  const maxViews = pages.length > 0 ? pages[0].pageviews : 1

  if (pages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('pageFlow.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t('pageFlow.noData')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('pageFlow.title')}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {t('pageFlow.pagesVisited', { count: pages.length })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {pages.map((page, index) => {
          const pct = (page.pageviews / maxViews) * 100
          const isLanding = index === 0

          return (
            <div
              key={page.page_path}
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              {/* Rank indicator */}
              <div className={`flex items-center justify-center size-6 rounded text-xs font-medium shrink-0 tabular-nums ${
                isLanding
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>

              {/* Page path */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-36 shrink-0 truncate text-sm font-mono leading-none" title={page.page_path}>
                      {page.page_path}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="font-mono text-xs">{page.page_path}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Progress bar */}
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLanding ? 'bg-blue-500' : 'bg-blue-400/60'
                  }`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>

              {/* Stats */}
              <div className="shrink-0 text-xs text-muted-foreground tabular-nums text-right min-w-28">
                <span className="font-medium text-foreground">{page.pageviews.toLocaleString()}</span>
                {` ${t('pageFlow.views')} · `}
                <span>{page.visitors.toLocaleString()}</span>
                {` ${t('pageFlow.visitors')}`}
              </div>

              {/* Action buttons */}
              {tpId && (
                <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/org/${org_id}/heatmap?page_path=${encodeURIComponent(page.page_path)}&tp_id=${tpId}${tpName ? `&tp_name=${encodeURIComponent(tpName)}` : ''}`}
                  >
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                      <MousePointerClick className="h-3 w-3" />
                      {t('pageFlow.heatmap')}
                    </Button>
                  </Link>
                  <Link
                    href={`/org/${org_id}/funnels/new?step1_type=page_path&step1_value=${encodeURIComponent(page.page_path)}&source_tp_id=${tpId}`}
                  >
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                      <Filter className="h-3 w-3" />
                      {t('pageFlow.funnel')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
