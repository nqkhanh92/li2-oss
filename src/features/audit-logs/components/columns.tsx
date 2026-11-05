'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'
import { Badge } from '@/shared/components/ui/badge'
import { AuditLog } from '../types'
import { ACTION_COLORS, MODULE_COLORS, getModuleLabel, getActionLabel } from '../constants'
import { useDayjs } from '@/shared/hooks/use-dayjs'
import { useTranslation } from 'react-i18next'
import { CalendarIcon } from 'lucide-react'
import { Typography } from '@/shared/components/ui/typography'
import { CustomAvatar } from '@/shared/components/ui/custom-avatar'

export type AuditLogColumn = AuditLog

export const useAuditLogColumns = (): ColumnDef<AuditLogColumn>[] => {
  const { t } = useTranslation(['audit'])

  return [
    {
      accessorKey: 'module',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('audit:fields.module')} />
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const module = row.getValue('module') as string
        const colorClass =
          MODULE_COLORS[module] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        return (
          <Typography
            className={`font-medium text-s hover:opacity-80 transition-opacity cursor-default px-2`}
            weight={'semibold'}
          >
            {getModuleLabel(t, module)}
          </Typography>
        )
      },
    },
    {
      accessorKey: 'action',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('audit:fields.action')} />
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const action = row.getValue('action') as string
        const colorClass =
          ACTION_COLORS[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        return (
          <Badge
            className={`${colorClass} rounded-full font-medium py-0.5 px-3 text-xs shadow-sm hover:opacity-80 transition-opacity cursor-default`}
            variant="outline"
          >
            {getActionLabel(t, action)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'user_id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('audit:fields.user')} />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original.profiles
        if (!user) return '-'
        return (
          <div className="flex gap-1 px-2 py-1.5 items-center">
            <CustomAvatar src={user?.avatar} name={user?.name} email={user?.email} size={16} />
            {user?.email && <span className="text-xs text-gray-50">{user.email}</span>}
          </div>
        )
      },
    },
    {
      accessorKey: 'target_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('audit:fields.target')} />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const targetName = row.getValue('target_name') as string
        const targetId = row.original.target_id
        return (
          <div className="flex flex-col py-1.5 gap-1">
            <span className="text-s font-medium text-primary">
              {targetName || t('audit:detail.not_available')}
            </span>
            {targetId && (
              <span className="text-xs text-gray-50 font-mono">{targetId.slice(0, 8)}...</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('audit:fields.timestamp')} />
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const { dayjs } = useDayjs()
        const date = row.getValue('created_at') as string
        return (
          <div className="flex items-center gap-1 px-2 py-1.5">
            <CalendarIcon className="w-3 h-3 text-gray-50" />
            <span className="text-s text-gray-50">{dayjs(date).format('LL')}</span>
          </div>
        )
      },
    },
  ]
}
