'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Trash2, Pen, Copy, Pencil, Pin } from 'lucide-react'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import dayjs from '@/shared/lib/dayjs'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { useDeleteDashboard, useUpdateDashboard, useTogglePin } from '../hooks/mutations'
import { useInlineRename } from '../hooks/use-inline-rename'
import { VIZ_BG } from '../constants/viz-colors'
import { getDominantAccent, ACCESS_ICON, getAccessModeLabel } from '../utils/dashboard-display'
import type { DashboardWithWidgets } from '../types'

interface DashboardCardProps {
  dashboard: DashboardWithWidgets
  orgId: string
  compact?: boolean
  isFocused?: boolean
  isSelected?: boolean
  isSelecting?: boolean
  onToggleSelect?: (id: string) => void
  onDuplicate?: (dashboardId: string) => void
}

/* ── Visualization styles for thumbnail blocks ──────────────── */

const VIZ_STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
  number: {
    bg: VIZ_BG.number,
    icon: <span className="text-[10px] font-bold text-violet-400 leading-none">42</span>,
  },
  line: {
    bg: VIZ_BG.line,
    icon: (
      <svg viewBox="0 0 28 14" className="w-5 h-2.5">
        <polyline
          points="0,11 7,8 14,3 21,6 28,1"
          fill="none"
          stroke="rgb(56 189 248)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  bar: {
    bg: VIZ_BG.bar,
    icon: (
      <svg viewBox="0 0 20 14" className="w-4 h-2.5">
        <rect x="0" y="8" width="4" height="6" rx="0.5" fill="rgb(52 211 153)" />
        <rect x="5.5" y="3" width="4" height="11" rx="0.5" fill="rgb(16 185 129)" />
        <rect x="11" y="5" width="4" height="9" rx="0.5" fill="rgb(52 211 153)" />
        <rect
          x="16.5"
          y="0"
          width="3.5"
          height="14"
          rx="0.5"
          fill="rgb(16 185 129)"
          opacity="0.7"
        />
      </svg>
    ),
  },
  pie: {
    bg: VIZ_BG.pie,
    icon: (
      <svg viewBox="0 0 14 14" className="w-3 h-3">
        <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgb(251 191 36)" strokeWidth="2" />
        <path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7 L7 7 Z" fill="rgb(251 191 36)" opacity="0.6" />
      </svg>
    ),
  },
  table: {
    bg: VIZ_BG.table,
    icon: (
      <svg viewBox="0 0 20 12" className="w-4 h-2.5">
        <rect x="0" y="0" width="20" height="2.5" rx="0.5" fill="rgb(148 163 184)" opacity="0.5" />
        <rect x="0" y="4" width="12" height="1.5" rx="0.5" fill="rgb(148 163 184)" opacity="0.25" />
        <rect x="0" y="7" width="16" height="1.5" rx="0.5" fill="rgb(148 163 184)" opacity="0.25" />
        <rect x="0" y="10" width="9" height="1.5" rx="0.5" fill="rgb(148 163 184)" opacity="0.25" />
      </svg>
    ),
  },
}

/* ── Accent color — imported from utils/dashboard-display ──── */

/* ── Thumbnail: hybrid positional layout with viz icons ──────── */

const GAP_PX = 3 // gap between blocks in pixels (applied as inset)

function ThumbnailPreview({
  widgets,
  compact,
}: {
  widgets: { config: unknown; position: unknown }[]
  compact?: boolean
}) {
  if (widgets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-300">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="4" rx="1.5" />
          <rect x="14" y="11" width="7" height="10" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </div>
    )
  }

  // Extract position data — guaranteed non-null by DB schema
  const items = widgets.slice(0, 6).map((w) => {
    const pos = w.position as { x: number; y: number; w: number; h: number }
    const config = w.config as { visualization?: string }
    return { pos, viz: config.visualization ?? 'table' }
  })

  // Compute bounding box (grid is 2 cols, heights 2-5)
  const maxX = Math.max(...items.map((i) => i.pos.x + i.pos.w), 2)
  const maxY = Math.max(...items.map((i) => i.pos.y + i.pos.h), 2)

  return (
    <div className="relative h-full w-full">
      {items.map((item, i) => {
        const { pos, viz } = item
        const style = VIZ_STYLES[viz] ?? VIZ_STYLES.table

        // Convert grid units to percentages with gap
        const left = (pos.x / maxX) * 100
        const top = (pos.y / maxY) * 100
        const width = (pos.w / maxX) * 100
        const height = (pos.h / maxY) * 100

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
              padding: `${GAP_PX / 2}px`,
            }}
          >
            <div
              className={cn('flex h-full w-full items-center justify-center rounded-md', style.bg)}
            >
              {!compact && style.icon}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main card component ──────────────────────────────────────── */

export function DashboardCard({
  dashboard,
  orgId,
  compact,
  isFocused,
  isSelected,
  isSelecting,
  onToggleSelect,
  onDuplicate,
}: DashboardCardProps) {
  const { t } = useTranslation('dashboards')
  const router = useRouter()
  const deleteDashboard = useDeleteDashboard(orgId)
  const updateDashboard = useUpdateDashboard(orgId, dashboard.id)
  const togglePin = useTogglePin(orgId)

  const { confirm } = useConfirmDialog()
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
    currentName: dashboard.name,
    onSubmit: (name) => updateDashboard.mutate({ name }),
  })

  const timeAgo = dayjs(dashboard.updated_at).fromNow()
  const accentColor = getDominantAccent(dashboard.dashboard_widgets)
  const AccessIcon = ACCESS_ICON[dashboard.access_mode] ?? ACCESS_ICON.everyone

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-white',
        'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300',
        compact && 'w-[280px] shrink-0',
        isFocused && 'ring-2 ring-dashed ring-primary/60 ring-offset-2',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={() => {
        if (isSelecting && onToggleSelect) {
          onToggleSelect(dashboard.id)
        } else {
          router.push(`/org/${orgId}/dashboards/${dashboard.id}`)
        }
      }}
    >
      <div className={cn('h-1 w-full', accentColor)} />

      <div className={cn('relative bg-slate-50/80 p-2', compact ? 'aspect-3/1' : 'aspect-5/3')}>
        {/* Bulk selection checkbox — z-20 to sit above pin badge */}
        {onToggleSelect && (
          <div
            className={cn(
              'absolute top-2 left-2 z-20 transition-opacity',
              isSelecting || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(dashboard.id)}
              className="bg-white border-slate-300"
            />
          </div>
        )}
        {dashboard.thumbnail_url?.startsWith('https://') ? (
          <img
            src={dashboard.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <ThumbnailPreview widgets={dashboard.dashboard_widgets} compact={compact} />
        )}

        {/* Pin badge — hidden on hover (checkbox takes this spot) and during selection */}
        {dashboard.is_pinned && (
          <div
            className={cn(
              'absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded-xs bg-white/90 px-1.5 py-0.5 shadow-sm border border-slate-100 transition-opacity',
              isSelecting ? 'opacity-0' : 'group-hover:opacity-0'
            )}
          >
            <Pin className="h-2.5 w-2.5 text-slate-500 fill-current" />
          </div>
        )}

        {/* Dark overlay: widget names */}
        <div className="absolute inset-0 flex flex-col justify-end p-2.5 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {dashboard.dashboard_widgets.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {dashboard.dashboard_widgets.slice(0, 4).map((w) => (
                <span key={w.id} className="text-[10px] text-white/80 truncate leading-tight">
                  {w.name}
                </span>
              ))}
              {dashboard.dashboard_widgets.length > 4 && (
                <span className="text-[10px] text-white/50 leading-tight">
                  {t('card.widgetsMore', {
                    defaultValue: '+{{count}} more',
                    count: dashboard.dashboard_widgets.length - 4,
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Corner actions button */}
        <div
          className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 rounded-md shadow-sm bg-white/90 hover:bg-white border border-slate-200"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
              onCloseAutoFocus={handleCloseAutoFocus}
            >
              <DropdownMenuItem
                onClick={() => router.push(`/org/${orgId}/dashboards/${dashboard.id}`)}
              >
                <Pen className="mr-2 h-4 w-4" />
                {t('card.open', { defaultValue: 'Open' })}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => togglePin.mutate(dashboard.id)}
                disabled={togglePin.isPending}
              >
                <Pin className="mr-2 h-4 w-4" />
                {dashboard.is_pinned
                  ? t('actions.unpin', { defaultValue: 'Unpin' })
                  : t('actions.pin', { defaultValue: 'Pin' })}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleRename}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('card.rename', { defaultValue: 'Rename' })}
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onSelect={() => onDuplicate(dashboard.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t('card.duplicate', { defaultValue: 'Duplicate' })}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={async (e) => {
                  e.preventDefault()
                  const ok = await confirm({
                    title: t('card.deleteConfirm.title', { defaultValue: 'Delete dashboard' }),
                    description: t('card.deleteConfirm.description', {
                      defaultValue:
                        'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
                      name: dashboard.name,
                    }),
                    confirmButtonText: t('card.deleteConfirm.confirm', { defaultValue: 'Delete' }),
                    cancelButtonText: t('common:actions.cancel', { defaultValue: 'Cancel' }),
                  })
                  setTimeout(() => document.body.style.removeProperty('pointer-events'), 0)
                  if (ok) {
                    deleteDashboard.mutate(dashboard.id)
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('card.delete', { defaultValue: 'Delete' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3.5 pt-2.5 pb-3">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="text-sm font-semibold bg-transparent border-b border-primary outline-none w-full"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') setIsRenaming(false)
            }}
            maxLength={256}
          />
        ) : (
          <p className="text-sm font-semibold text-foreground truncate">{dashboard.name}</p>
        )}

        {compact ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span>
              {t('create.widgetCount', {
                count: dashboard.dashboard_widgets.length,
                defaultValue: '{{count}} widgets',
              })}
            </span>
            <AccessIcon className="h-3 w-3" />
          </div>
        ) : (
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
            <span>
              {t('create.widgetCount', {
                count: dashboard.dashboard_widgets.length,
                defaultValue: '{{count}} widgets',
              })}
            </span>
            <span className="flex items-center gap-1">
              <AccessIcon className="h-3 w-3" />
              {getAccessModeLabel(dashboard.access_mode, t)}
            </span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 mt-auto">{timeAgo}</p>
      </div>
    </div>
  )
}
