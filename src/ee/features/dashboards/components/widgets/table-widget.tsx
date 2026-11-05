'use client'

import { useTranslation } from 'react-i18next'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/shared/components/ui/table'
import type { WidgetDataResult } from '../../types'
import { WIDGET_EMPTY_CLASS } from './shared'

export function TableWidget({ data }: { data: WidgetDataResult }) {
  const { t } = useTranslation('dashboards')

  if (data.rows.length === 0) {
    return <div className={WIDGET_EMPTY_CLASS}>—</div>
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">{t('widget.table.name', { defaultValue: 'Name' })}</TableHead>
            <TableHead className="text-xs text-right">{t('widget.table.count', { defaultValue: 'Count' })}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.slice(0, 10).map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm truncate max-w-[200px]">{row.label}</TableCell>
              <TableCell className="text-sm text-right font-medium">{row.value.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.rows.length > 10 && (
        <p className="px-2 py-1.5 text-xs text-muted-foreground text-center">
          +{data.rows.length - 10} more
        </p>
      )}
    </div>
  )
}
