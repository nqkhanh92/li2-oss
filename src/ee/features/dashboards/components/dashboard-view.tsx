'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouter } from 'next/navigation'
import ReactGridLayout, { useContainerWidth, type LayoutItem } from 'react-grid-layout'
import { isAxiosError } from 'axios'
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Pen,
  ArrowLeft,
  Copy,
  Pencil,
  Check,
  Lock,
  Loader2,
} from 'lucide-react'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { useGetDashboard, useBatchWidgetData } from '../hooks/queries'
import {
  useDeleteDashboard,
  useDuplicateDashboard,
  useUpdateDashboard,
  useAddWidget,
} from '../hooks/mutations'
import { useEditMode } from '../hooks/use-edit-mode'
import { useCaptureThumbnail } from '../hooks/use-capture-thumbnail'
import { useInlineRename } from '../hooks/use-inline-rename'
import { GRID_ITEM_CONSTRAINTS } from '../types'
import type { GridPosition, DashboardWidget } from '../types'
import { WidgetCard, cacheWidgetData, getCachedWidgetData } from './widget-card'
import { AccessSettingsDrawer } from './access-settings-drawer'
import { TransferOwnershipDialog } from './transfer-ownership-dialog'
import { WidgetQueryBuilder } from './widget-query-builder'
import { DateRangePicker } from './date-range-picker'
import { DashboardSelector } from './dashboard-selector'
import { DashboardCreateSheet } from './dashboard-create-sheet'
import { VIZ_PREVIEW } from './widget-template-catalog'
import { computePosition } from '../utils/grid-position'
import { resolveDateRange, DEFAULT_DATE_RANGE } from '../utils/date-range'
import type { DateRangeConfig } from '../utils/date-range'

//@ts-ignore-next-line: No types for react-grid-layout v2 yet
import 'react-grid-layout/css/styles.css'
//@ts-ignore-next-line: No types for react-grid-layout v2 yet
import 'react-resizable/css/styles.css'

export function DashboardView() {
  const { t } = useTranslation('dashboards')
  const { org_id, dashboard_id } = useParams<{ org_id: string; dashboard_id: string }>()
  const router = useRouter()
  const { confirm } = useConfirmDialog()

  const orgPlan = useOrganizationStore((s) => s.orgPlan)
  const hasPageviews = !!orgPlan?.advanced_features_allowed?.includes(
    ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS
  )

  const { width, containerRef, mounted } = useContainerWidth()
  const {
    data: dashboard,
    isLoading,
    error: dashboardError,
    dataUpdatedAt,
  } = useGetDashboard(org_id, dashboard_id)
  const deleteDashboard = useDeleteDashboard(org_id)
  const duplicateDashboard = useDuplicateDashboard(org_id)
  const updateDashboard = useUpdateDashboard(org_id, dashboard_id)
  const addWidget = useAddWidget(org_id, dashboard_id)

  const {
    isRenaming,
    setIsRenaming,
    renameValue,
    setRenameValue,
    handleRename,
    handleRenameSubmit,
    renameInputRef,
    handleCloseAutoFocus,
  } = useInlineRename({
    currentName: dashboard?.name ?? '',
    onSubmit: (name) => updateDashboard.mutate({ name }),
  })

  const handleDuplicateWidget = (widget: DashboardWidget) => {
    const size = widget.widget_type === 'formula' ? 'small' : (widget.config.size ?? 'small')
    const widgets = dashboard?.dashboard_widgets ?? []
    pendingCaptureRef.current = true
    addWidget.mutate({
      name: `${widget.name} (copy)`,
      widget_type: widget.widget_type,
      config: widget.config,
      formula_config: widget.formula_config,
      position: computePosition(size, widgets),
      date_override: widget.date_override,
    })
  }
  const [dateRangeState, setDateRangeState] = useState<DateRangeConfig>(DEFAULT_DATE_RANGE)
  const dateRange = useMemo(() => resolveDateRange(dateRangeState), [dateRangeState])
  const { data: batchData, isLoading: isBatchLoading } = useBatchWidgetData(
    org_id,
    dashboard_id,
    dateRange
  )

  // Cache successful widget data for frozen widget display
  useEffect(() => {
    if (!batchData) return
    for (const [widgetId, result] of Object.entries(batchData)) {
      if (result.result) cacheWidgetData(widgetId, result.result)
    }
  }, [batchData])

  // ── Thumbnail capture: fire only after explicit mutations, not background refetches ──
  const { triggerCapture } = useCaptureThumbnail(
    dashboard_id,
    containerRef as React.RefObject<HTMLElement | null>
  )
  const pendingCaptureRef = useRef(false)
  const prevDataUpdatedAtRef = useRef<number>(0)
  useEffect(() => {
    if (!dashboard || !dataUpdatedAt) return
    if (prevDataUpdatedAtRef.current === 0) {
      prevDataUpdatedAtRef.current = dataUpdatedAt
      return
    }
    if (dataUpdatedAt <= prevDataUpdatedAtRef.current) return
    prevDataUpdatedAtRef.current = dataUpdatedAt
    if (!pendingCaptureRef.current) return
    pendingCaptureRef.current = false
    const timer = setTimeout(triggerCapture, 500)
    return () => clearTimeout(timer)
  }, [dataUpdatedAt, dashboard, triggerCapture])

  const [queryBuilderOpen, setQueryBuilderOpen] = useState(false)
  const [editWidget, setEditWidget] = useState<DashboardWidget | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Clear editWidget after dialog fully closes + force-clean Radix pointer-events
  useEffect(() => {
    if (!queryBuilderOpen) {
      setEditWidget(null)
      // Radix Dialog can leave pointer-events: none on body when nested portals
      // (Select inside Dialog) interfere with close cleanup
      const timer = setTimeout(() => {
        document.body.style.removeProperty('pointer-events')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [queryBuilderOpen])

  const {
    isEditing,
    isSaving,
    localLayout,
    lockConflict,
    sessionExpired,
    enterEditMode,
    exitEditMode,
    handleDragStop,
    handleResizeStop,
    dismissLockConflict,
    dismissSessionExpired,
  } = useEditMode(org_id, dashboard_id, dashboard?.dashboard_widgets ?? [])

  // Server-derived layout (normal view) — includes per-item constraints for react-grid-layout v2
  const serverLayout = useMemo((): LayoutItem[] => {
    if (!dashboard) return []
    return dashboard.dashboard_widgets.map((w) => {
      const pos = w.position as unknown as GridPosition
      return { i: w.id, x: pos.x, y: pos.y, w: pos.w, h: pos.h, ...GRID_ITEM_CONSTRAINTS }
    })
  }, [dashboard])

  // Local layout during editing, server layout otherwise
  const layout = isEditing ? localLayout : serverLayout

  const userRole = dashboard?.userRole ?? 'owner'

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[168px] rounded-xl" />
          <Skeleton className="h-[168px] rounded-xl" />
          <Skeleton className="col-span-2 h-[288px] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!dashboard) {
    const is403 =
      dashboardError && isAxiosError(dashboardError) && dashboardError.response?.status === 403
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-stone-500">
          {is403
            ? t('errors.no_access', { defaultValue: 'You no longer have access to this dashboard' })
            : t('view.notFound', { defaultValue: 'Dashboard not found' })}
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/org/${org_id}/dashboards`)}
        >
          {t('view.backToList', { defaultValue: 'Back to list' })}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-5">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push(`/org/${org_id}/dashboards`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="text-lg font-semibold bg-transparent border-b border-primary outline-none px-1 truncate"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') setIsRenaming(false)
              }}
              maxLength={256}
            />
          ) : (
            <DashboardSelector
              orgId={org_id}
              currentDashboardId={dashboard_id}
              currentName={dashboard.name}
              onCreateNew={() => setCreateOpen(true)}
            />
          )}
          <Badge variant="outline" size="xs" className="shrink-0 text-stone-400">
            {dashboard.access_mode === 'only_me'
              ? t('card.onlyMe', { defaultValue: 'Only me' })
              : dashboard.access_mode === 'restricted'
                ? t('card.restricted', { defaultValue: 'Restricted' })
                : t('card.everyone', { defaultValue: 'Everyone' })}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Date range picker — hidden during layout editing */}
          {!isEditing && <DateRangePicker value={dateRangeState} onChange={setDateRangeState} />}

          {/* Edit Layout / Done toggle */}
          {userRole !== 'viewer' && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={enterEditMode}
              className="hidden md:flex"
              iconLeft={<Pencil className="h-4 w-4" />}
            >
              {t('layout.editLayout', { defaultValue: 'Edit Layout' })}
            </Button>
          )}
          {isEditing && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                pendingCaptureRef.current = true
                exitEditMode()
              }}
              disabled={isSaving}
              iconLeft={
                isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )
              }
            >
              {isSaving
                ? t('layout.saving', { defaultValue: 'Saving...' })
                : t('layout.done', { defaultValue: 'Done' })}
            </Button>
          )}

          {/* Add Widget — owner + editor only, hidden during edit mode */}
          {userRole !== 'viewer' && !isEditing && (
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => setQueryBuilderOpen(true)}
            >
              {t('view.addWidget', { defaultValue: 'Add Widget' })}
            </Button>
          )}

          {/* Access settings — owner only, hidden during edit mode */}
          {userRole === 'owner' && !isEditing && (
            <AccessSettingsDrawer
              orgId={org_id}
              dashboardId={dashboard_id}
              currentMode={dashboard.access_mode}
              currentDefaultRole={dashboard.default_role}
              ownerId={dashboard.created_by}
            />
          )}

          {/* More menu — hidden during edit mode */}
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onCloseAutoFocus={handleCloseAutoFocus}>
                {userRole !== 'viewer' && (
                  <DropdownMenuItem onSelect={handleRename}>
                    <Pen className="mr-2 h-4 w-4" />
                    {t('card.rename', { defaultValue: 'Rename' })}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    duplicateDashboard.mutate(dashboard_id, {
                      onSuccess: (data: any) => router.push(`/org/${org_id}/dashboards/${data.id}`),
                    })
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {t('card.duplicate', { defaultValue: 'Duplicate' })}
                </DropdownMenuItem>
                {userRole === 'owner' && (
                  <>
                    <DropdownMenuSeparator />
                    <TransferOwnershipDialog
                      orgId={org_id}
                      dashboardId={dashboard_id}
                      ownerId={dashboard.created_by}
                      accessMode={dashboard.access_mode}
                    />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={async (e) => {
                        e.preventDefault()
                        const ok = await confirm({
                          title: t('card.deleteConfirm.title', {
                            defaultValue: 'Delete dashboard',
                          }),
                          description: t('card.deleteConfirm.description', {
                            defaultValue:
                              'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
                            name: dashboard.name,
                          }),
                          confirmButtonText: t('card.deleteConfirm.confirm', {
                            defaultValue: 'Delete',
                          }),
                          cancelButtonText: t('common:actions.cancel', { defaultValue: 'Cancel' }),
                        })
                        setTimeout(() => document.body.style.removeProperty('pointer-events'), 0)
                        if (ok) {
                          deleteDashboard.mutate(dashboard_id, {
                            onSuccess: () => router.push(`/org/${org_id}/dashboards`),
                          })
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('card.delete', { defaultValue: 'Delete' })}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Lock conflict banner */}
      {lockConflict && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 border border-amber-200/60 px-4 py-2.5 text-sm text-amber-700">
          <Lock className="h-4 w-4 shrink-0" />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(t as any)('layout.lockConflict', {
            defaultValue: '{{email}} is currently editing this dashboard. Try again later.',
            email: lockConflict.email,
          })}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0"
            onClick={dismissLockConflict}
          >
            {t('common:dismiss', { defaultValue: 'Dismiss' })}
          </Button>
        </div>
      )}

      {/* Session expired modal */}
      <Dialog open={sessionExpired} onOpenChange={dismissSessionExpired}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('layout.sessionExpiredTitle', { defaultValue: 'Editing Session Expired' })}
            </DialogTitle>
            <DialogDescription>
              {t('layout.sessionExpiredDescription', {
                defaultValue:
                  'Another editor may have taken over, or your session timed out. Reload to see the latest changes.',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                dismissSessionExpired()
                window.location.reload()
              }}
            >
              {t('layout.reload', { defaultValue: 'Reload Dashboard' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Widget grid */}
      {dashboard.dashboard_widgets.length === 0 ? (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 py-14 px-6">
          <div className="text-center">
            <p className="text-stone-700 font-medium">
              {userRole !== 'viewer'
                ? t('view.emptyTitle', { defaultValue: 'Your dashboard is a blank canvas' })
                : t('view.emptyStateViewer', { defaultValue: 'No widgets yet.' })}
            </p>
            {userRole !== 'viewer' && (
              <p className="text-stone-400 text-sm mt-1">
                {t('view.emptySubtitle', { defaultValue: 'Pick a widget type to get started' })}
              </p>
            )}
          </div>

          {userRole !== 'viewer' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full max-w-xl">
                {(
                  [
                    { viz: 'number', labelKey: 'view.emptyNumber', defaultLabel: 'Number' },
                    { viz: 'line', labelKey: 'view.emptyLine', defaultLabel: 'Trend' },
                    { viz: 'pie', labelKey: 'view.emptyPie', defaultLabel: 'Breakdown' },
                    { viz: 'table', labelKey: 'view.emptyTable', defaultLabel: 'Table' },
                  ] as const
                ).map(({ viz, labelKey, defaultLabel }) => {
                  const Preview = VIZ_PREVIEW[viz]
                  return (
                    <button
                      key={viz}
                      onClick={() => setQueryBuilderOpen(true)}
                      className="group flex flex-col items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white px-4 py-5 transition-all duration-200 hover:shadow-md hover:shadow-stone-200/60 hover:border-stone-300/80 hover:-translate-y-0.5"
                    >
                      <div className="h-10 w-full">
                        <Preview />
                      </div>
                      <span className="text-xs text-stone-400 group-hover:text-stone-500 transition-colors">
                        {t(labelKey, { defaultValue: defaultLabel })}
                      </span>
                    </button>
                  )
                })}
                {/* Add Widget card */}
                <button
                  onClick={() => setQueryBuilderOpen(true)}
                  className="group flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-stone-300/80 bg-white/50 px-4 py-5 transition-all duration-200 hover:shadow-md hover:shadow-stone-200/60 hover:border-stone-400/80 hover:bg-white hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-full items-center justify-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 group-hover:bg-stone-200 transition-colors">
                      <Plus className="h-4 w-4 text-stone-400 group-hover:text-stone-600 transition-colors" />
                    </div>
                  </div>
                  <span className="text-xs text-stone-400 group-hover:text-stone-500 transition-colors">
                    {t('view.emptyMore', { defaultValue: 'More' })}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div ref={containerRef as React.RefObject<HTMLDivElement>}>
          {mounted && (
            <ReactGridLayout
              layout={layout}
              width={width}
              gridConfig={{ cols: 2, rowHeight: 120, margin: [16, 16] }}
              dragConfig={{
                enabled: isEditing,
                handle: '.widget-drag-handle',
              }}
              resizeConfig={{
                enabled: isEditing,
                handles: ['se', 's'],
              }}
              onDragStop={isEditing ? handleDragStop : undefined}
              onResizeStop={isEditing ? handleResizeStop : undefined}
            >
              {dashboard.dashboard_widgets.map((widget) => {
                const widgetResult = batchData?.[widget.id]
                const cachedData =
                  widgetResult?.errorCode === 'PLAN_GATE' ? getCachedWidgetData(widget.id) : null

                return (
                  <div key={widget.id}>
                    <WidgetCard
                      widget={widget}
                      orgId={org_id}
                      dashboardId={dashboard_id}
                      canEdit={userRole !== 'viewer'}
                      isEditing={isEditing}
                      isLoading={isBatchLoading}
                      data={widgetResult?.result ?? undefined}
                      errorCode={widgetResult?.errorCode ?? undefined}
                      formula={widgetResult?.formula ?? undefined}
                      cachedData={cachedData}
                      onEdit={(w) => {
                        setEditWidget(w)
                        setQueryBuilderOpen(true)
                      }}
                      onDuplicate={userRole !== 'viewer' ? handleDuplicateWidget : undefined}
                    />
                  </div>
                )
              })}
            </ReactGridLayout>
          )}
        </div>
      )}

      {/* Query builder dialog */}
      <WidgetQueryBuilder
        orgId={org_id}
        dashboardId={dashboard_id}
        existingWidgets={dashboard.dashboard_widgets}
        hasPageviews={hasPageviews}
        dateRangeState={dateRangeState}
        editWidget={editWidget}
        open={queryBuilderOpen}
        onOpenChange={setQueryBuilderOpen}
        onAfterMutate={() => {
          pendingCaptureRef.current = true
        }}
      />

      <DashboardCreateSheet open={createOpen} onOpenChange={setCreateOpen} hideTrigger />
    </div>
  )
}
