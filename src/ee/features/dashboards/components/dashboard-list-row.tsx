'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Trash2, Pen, Copy, Pencil, Pin } from 'lucide-react'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import dayjs from '@/shared/lib/dayjs'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { useDeleteDashboard, useUpdateDashboard, useTogglePin } from '../hooks/mutations'
import { useInlineRename } from '../hooks/use-inline-rename'
import { getDominantAccent, ACCESS_ICON, getAccessModeLabel } from '../utils/dashboard-display'
import type { DashboardWithWidgets } from '../types'

interface DashboardListRowProps {
  dashboard: DashboardWithWidgets
  orgId: string
  isFocused?: boolean
  isSelected?: boolean
  isSelecting?: boolean
  onToggleSelect?: (id: string) => void
  onDuplicate?: (dashboardId: string) => void
}

export function DashboardListRow({ dashboard, orgId, isFocused, isSelected, isSelecting, onToggleSelect, onDuplicate }: DashboardListRowProps) {
  const { t } = useTranslation('dashboards')
  const router = useRouter()
  const deleteDashboard = useDeleteDashboard(orgId)
  const updateDashboard = useUpdateDashboard(orgId, dashboard.id)
  const togglePin = useTogglePin(orgId)
  const { confirm } = useConfirmDialog()

  const { isRenaming, setIsRenaming, renameValue, setRenameValue, handleRename, handleRenameSubmit, renameInputRef, handleCloseAutoFocus } =
    useInlineRename({
      currentName: dashboard.name,
      onSubmit: (name) => updateDashboard.mutate({ name }),
    })

  const timeAgo = dayjs(dashboard.updated_at).fromNow()
  const accentColor = getDominantAccent(dashboard.dashboard_widgets)
  const AccessIcon = ACCESS_ICON[dashboard.access_mode] ?? ACCESS_ICON.everyone

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 cursor-pointer',
        'border-l-2 border-l-transparent',
        'transition-colors duration-150 hover:bg-slate-50',
        isFocused && 'bg-slate-100 border-l-primary/60',
        isSelected && 'bg-primary/5',
      )}
      onClick={() => {
        if (isSelecting && onToggleSelect) {
          onToggleSelect(dashboard.id)
        } else {
          router.push(`/org/${orgId}/dashboards/${dashboard.id}`)
        }
      }}
    >
      {/* Bulk selection checkbox */}
      {onToggleSelect && (
        <div
          className={cn(
            'shrink-0 transition-opacity',
            isSelecting || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
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

      {/* Left accent stripe (replaces tiny dot) */}
      <div className={cn('absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full', accentColor)} />

      {/* Pin icon */}
      {dashboard.is_pinned && (
        <Pin className="h-3 w-3 shrink-0 text-slate-400 fill-current" />
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="text-sm font-medium bg-transparent border-b border-primary outline-none w-full"
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
          <p className="text-sm font-medium text-slate-700 truncate">{dashboard.name}</p>
        )}
      </div>

      {/* Metadata — right-aligned cluster */}
      <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-slate-400">
        <span>{t('create.widgetCount', { count: dashboard.dashboard_widgets.length, defaultValue: '{{count}} widgets' })}</span>
        <span className="hidden md:inline-flex items-center gap-1">
          <AccessIcon className="h-3 w-3" />
          {getAccessModeLabel(dashboard.access_mode, t)}
        </span>
        <span className="hidden lg:inline-flex whitespace-nowrap w-24 justify-end">
          {timeAgo}
        </span>
      </div>

      {/* Actions dropdown */}
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onCloseAutoFocus={handleCloseAutoFocus}>
            <DropdownMenuItem onClick={() => router.push(`/org/${orgId}/dashboards/${dashboard.id}`)}>
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
                    defaultValue: 'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
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
  )
}
