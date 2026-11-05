'use client'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { getModuleLabel, getActionLabel } from '../../constants'

interface ActiveFiltersDisplayProps {
  moduleFilter?: string[]
  actionFilter?: string[]
  createdAtFilter?: { from?: number; to?: number }
  onRemoveModule: (value: string) => void
  onRemoveAction: (value: string) => void
  onRemoveDateRange: () => void
  extraItem?: React.ReactNode
}

export const ActiveFiltersDisplay = ({
  moduleFilter,
  actionFilter,
  createdAtFilter,
  onRemoveModule,
  onRemoveAction,
  onRemoveDateRange,
  extraItem,
}: ActiveFiltersDisplayProps) => {
  const { t } = useTranslation(['common', 'audit'])

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const hasFilters =
    (moduleFilter && moduleFilter.length > 0) ||
    (actionFilter && actionFilter.length > 0) ||
    !!createdAtFilter

  if (!hasFilters) return null

  return (
    <div className="flex items-center gap-2 px-0 py-2 flex-wrap">
      <span className="text-s font-medium text-foreground">
        {t('audit:filters.active_filters')}:
      </span>

      {moduleFilter?.map((module) => (
        <div key={module} className="flex items-center gap-2 px-2 py-0 rounded-md bg-transparent">
          <div className="w-1 h-1 rounded-full bg-slate-600"></div>
          <div className="flex items-center gap-0.5">
            <span className="text-s text-foreground">{t('audit:filters.module')}:</span>
            <span className="text-s text-slate-600 px-2 py-0.5  ">{getModuleLabel(t, module)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => onRemoveModule(module)}
          >
            <X className="h-4 w-4 text-slate-900" />
          </Button>
        </div>
      ))}

      {actionFilter?.map((action) => (
        <div key={action} className="flex items-center gap-2 px-2 py-0 rounded-md bg-transparent">
          <div className="w-1 h-1 rounded-full bg-slate-600"></div>
          <div className="flex items-center gap-0.5">
            <span className="text-s text-foreground">{t('audit:filters.action')}:</span>
            <span className="text-s text-slate-600 px-2 py-0.5 ">{getActionLabel(t, action)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => onRemoveAction(action)}
          >
            <X className="h-4 w-4 text-slate-900" />
          </Button>
        </div>
      ))}

      {createdAtFilter && (
        <div className="flex items-center gap-2 px-2 py-0 rounded-md bg-transparent">
          <div className="w-1 h-1 rounded-full bg-slate-600"></div>
          <div className="flex items-center gap-0.5">
            <span className="text-s text-foreground">{t('audit:filters.date_range')}:</span>
            <span className="text-s text-slate-600 px-2 py-0.5">
              {formatDate(createdAtFilter.from)} - {formatDate(createdAtFilter.to)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={onRemoveDateRange}
          >
            <X className="h-4 w-4 text-slate-900" />
          </Button>
        </div>
      )}
      {extraItem}
    </div>
  )
}
