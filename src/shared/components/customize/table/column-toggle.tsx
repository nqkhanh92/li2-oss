'use client'

import { Table } from '@tanstack/react-table'
import { Settings2, Check } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { useTranslation } from 'react-i18next'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  button?: React.ReactNode
}

export function DataTableViewOptions<TData>({
  table,
  button,
}: DataTableViewOptionsProps<TData>) {
  const { t } = useTranslation()

  const toggleCols = table
    .getAllColumns()
    .filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide())

  return (
    <Popover>
      <PopoverTrigger asChild>
        {button || (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 flex border-0 outline-hidden bg-transparent shadow-none text-sm font-medium text-slate-700"
            iconLeft={<Settings2 className="w-[18px] h-[18px]" />}
          >
            {t('common:actions.view')}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[200px] p-2 rounded-[4px] border-slate-100 shadow-[0px_4px_8px_rgba(5,27,68,0.08)]"
      >
        <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t('common:table.toggle_column')}
        </p>
        <div className="flex flex-col">
          {toggleCols.map((col) => {
            const visible = col.getIsVisible()
            const label =
              typeof col.columnDef.header === 'function'
                ? (col.columnDef.header({} as any) as any)?.props?.title
                : col.columnDef.header
            return (
              <button
                key={col.id}
                className="flex items-center gap-2 w-full px-4 py-[6px] rounded-[4px] text-left hover:bg-slate-50 transition-colors"
                onClick={() => col.toggleVisibility()}
              >
                <span className="w-[16px] h-[16px] shrink-0 flex items-center justify-center">
                  {visible && <Check className="w-[16px] h-[16px] text-slate-700" />}
                </span>
                <span className="flex-1 text-s font-normal leading-[20px] text-slate-700">
                  {label || col.id}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
