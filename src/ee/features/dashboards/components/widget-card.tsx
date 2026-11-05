'use client'

import { useTranslation } from 'react-i18next'
import {
  GripVertical,
  MoreHorizontal,
  Pen,
  Trash2,
  Lock,
  CalendarDays,
  Copy,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { ProBadge } from './pro-badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { WidgetRenderer } from './widget-renderer'
import { FormulaWidget } from './widgets/formula-widget'
import { useDeleteWidget } from '../hooks/mutations'
import type {
  BatchWidgetResult,
  DashboardWidget,
  WidgetConfig,
  WidgetDataResult,
} from '../types'

// ── localStorage cache — exported for parent (DashboardView) to manage ──

const WIDGET_CACHE_PREFIX = 'li2:widget-data:'

export function cacheWidgetData(widgetId: string, data: WidgetDataResult) {
  try {
    localStorage.setItem(
      `${WIDGET_CACHE_PREFIX}${widgetId}`,
      JSON.stringify({ data, fetchedAt: new Date().toISOString() }),
    )
  } catch { /* ignore */ }
}

export function getCachedWidgetData(widgetId: string): { data: WidgetDataResult; fetchedAt: string } | null {
  try {
    const raw = localStorage.getItem(`${WIDGET_CACHE_PREFIX}${widgetId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

interface WidgetCardProps {
  widget: DashboardWidget
  orgId: string
  dashboardId: string
  canEdit?: boolean
  isEditing?: boolean
  isLoading?: boolean
  data?: WidgetDataResult | null
  errorCode?: BatchWidgetResult['errorCode']
  formula?: { numerator: number; denominator: number; operator: string } | null
  cachedData?: { data: WidgetDataResult; fetchedAt: string } | null
  onEdit?: (widget: DashboardWidget) => void
  onDuplicate?: (widget: DashboardWidget) => void
}

export function WidgetCard({
  widget, orgId, dashboardId, canEdit = true, isEditing = false,
  isLoading = false, data, errorCode, formula, cachedData,
  onEdit, onDuplicate,
}: WidgetCardProps) {
  const { t } = useTranslation('dashboards')
  const deleteWidget = useDeleteWidget(orgId, dashboardId)
  const config = widget.config as WidgetConfig
  const isPlanError = errorCode === 'PLAN_GATE'
  const isFeatureDisabled = errorCode === 'FEATURE_DISABLED'

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl border-stone-200/60 shadow-sm shadow-stone-200/50 transition-shadow duration-200 hover:shadow-md hover:shadow-stone-200/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
        {isEditing && (
          <div className="widget-drag-handle cursor-grab active:cursor-grabbing shrink-0 mr-2 text-stone-400 hover:text-stone-600">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        <CardTitle className="text-sm font-medium text-stone-700 truncate flex-1">
          {t(`templates.widgets.${widget.name.replace('dashboards:', '')}.name`, { defaultValue: widget.name })}
        </CardTitle>
        {widget.date_override && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t('widget.customDateRange', { defaultValue: 'Custom date range' })}
            </TooltipContent>
          </Tooltip>
        )}
        {canEdit && !isPlanError && !isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit and Duplicate both resubmit the config, which validation now rejects */}
              {onEdit && !isFeatureDisabled && (
                <DropdownMenuItem onClick={() => onEdit(widget)}>
                  <Pen className="mr-2 h-4 w-4" />
                  {t('widget.edit', { defaultValue: 'Edit' })}
                </DropdownMenuItem>
              )}
              {onDuplicate && !isFeatureDisabled && (
                <DropdownMenuItem onClick={() => onDuplicate(widget)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t('widget.duplicate', { defaultValue: 'Duplicate' })}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteWidget.mutate(widget.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('widget.delete', { defaultValue: 'Delete' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isPlanError && canEdit && !isEditing && onEdit && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit(widget)}>
            {t('widget.viewConfig', { defaultValue: 'View config' })}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-4 pt-0">
        {isLoading ? (
          <div className="flex h-full flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="flex-1" />
          </div>
        ) : isFeatureDisabled ? (
          /* Checked before the cached-data branch below, so no stale chart leaks through */
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
              <EyeOff className="h-5 w-5 text-stone-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-stone-700">
                {t('widget.featureDisabled', { defaultValue: 'Feature turned off' })}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {t('widget.featureDisabledHint', {
                  defaultValue:
                    'This widget is kept. It will work again if the feature is switched back on.',
                })}
              </p>
            </div>
          </div>
        ) : isPlanError && cachedData && widget.widget_type !== 'formula' ? (
          <div className="relative h-full">
            <div className="opacity-40 pointer-events-none h-full">
              <WidgetRenderer config={config} data={cachedData.data} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50/70">
              <p className="text-xs text-stone-500">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(t as any)('widget.frozenSince', {
                  defaultValue: 'Data frozen since {{date}}',
                  date: new Date(cachedData.fetchedAt).toLocaleDateString(),
                })}
              </p>
              <a href="#" className="text-xs text-violet-500 hover:underline mt-1">
                {t('widget.upgradeToRefresh', { defaultValue: 'Upgrade to refresh' })}
              </a>
            </div>
          </div>
        ) : isPlanError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50">
              <Lock className="h-5 w-5 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-stone-700">
                {t('widget.proRequired', { defaultValue: 'Pro required' })}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {t('widget.upgradeToView', { defaultValue: 'Upgrade your plan to view this widget.' })}
              </p>
            </div>
            <ProBadge />
          </div>
        ) : errorCode === 'DIVISION_BY_ZERO' ? (
          <FormulaWidget total={null} formula={formula ?? null} error="DIVISION_BY_ZERO" />
        ) : errorCode === 'RPC_ERROR' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-stone-400">
            <p>{t('widget.failedToLoad', { defaultValue: 'Failed to load' })}</p>
          </div>
        ) : widget.widget_type === 'formula' && data ? (
          <FormulaWidget total={data.total} formula={formula ?? null} />
        ) : data ? (
          <WidgetRenderer config={config} data={data} />
        ) : null}
      </CardContent>
    </Card>
  )
}
