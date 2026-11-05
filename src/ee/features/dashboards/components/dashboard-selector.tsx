'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ChevronsUpDown, Plus, LayoutDashboard } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { authStore } from '@/shared/stores/profile-store'
import { useGetDashboards } from '../hooks/queries'
import { partitionByOwner } from '../utils/dashboard-filters'
import type { DashboardWithWidgets } from '../types'

interface DashboardSelectorProps {
  orgId: string
  currentDashboardId: string
  currentName: string
  onCreateNew: () => void
}

export function DashboardSelector({
  orgId,
  currentDashboardId,
  currentName,
  onCreateNew,
}: DashboardSelectorProps) {
  const { t } = useTranslation('dashboards')
  const router = useRouter()
  const profile = authStore((s) => s.profile)
  const { data: dashboards } = useGetDashboards(orgId)
  const [open, setOpen] = useState(false)

  const { mine: myDashboards, shared: sharedDashboards } = partitionByOwner(dashboards ?? [], profile?.id)

  const handleSelect = (dashboardId: string) => {
    if (dashboardId !== currentDashboardId) {
      router.push(`/org/${orgId}/dashboards/${dashboardId}`)
    }
    setOpen(false)
  }

  const renderItem = (d: DashboardWithWidgets) => {
    const isActive = d.id === currentDashboardId
    return (
      <button
        key={d.id}
        onClick={() => handleSelect(d.id)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-stone-100/80',
          isActive && 'bg-stone-100 font-medium',
        )}
      >
        <LayoutDashboard className={cn(
          'h-3.5 w-3.5 shrink-0',
          isActive ? 'text-stone-600' : 'text-stone-400',
        )} />
        <span className={cn(
          'truncate flex-1 text-left',
          isActive ? 'text-stone-800' : 'text-stone-600',
        )}>{d.name}</span>
        <span className="text-xs tabular-nums text-stone-400 shrink-0">
          {d.dashboard_widgets.length}
        </span>
      </button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-lg font-semibold h-auto py-1"
          aria-label={t('selector.switchDashboard', { defaultValue: 'Switch dashboard' })}
        >
          {currentName}
          <ChevronsUpDown className="h-4 w-4 text-stone-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1.5" align="start">
        {myDashboards.length > 0 && (
          <>
            <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">
              {t('selector.myDashboards', { defaultValue: 'My Dashboards' })}
            </div>
            {myDashboards.map(renderItem)}
          </>
        )}

        {sharedDashboards.length > 0 && (
          <>
            {myDashboards.length > 0 && <Separator className="my-1" />}
            <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">
              {t('selector.sharedWithMe', { defaultValue: 'Shared with me' })}
            </div>
            {sharedDashboards.map(renderItem)}
          </>
        )}

        <Separator className="my-1.5" />
        <button
          onClick={() => { onCreateNew(); setOpen(false) }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-stone-100/80 text-stone-500 hover:text-stone-700"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('selector.createNew', { defaultValue: 'Create New Dashboard' })}
        </button>
      </PopoverContent>
    </Popover>
  )
}
