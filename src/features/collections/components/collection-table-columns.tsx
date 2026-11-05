'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'
import { CollectionWithStats, CollectionOrgPermission } from '@/shared/types/collection.types'
import { Badge } from '@/shared/components/ui/badge'
import { t } from 'i18next'
// import { useTranslation } from 'react-i18next'
import { CalendarIcon, FolderIcon, Link2Icon, UsersIcon } from 'lucide-react'
import { useDayjs } from '@/shared/hooks/use-dayjs'
import Link from 'next/link'
import { getOrgPermissionLabel, getPermissionBadgeColor } from '../constants/collections'

type CollectionColumn = CollectionWithStats

export const collectionColumns: ColumnDef<CollectionColumn>[] = [
  {
    accessorKey: 'color',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:form.fields.color')} />
    ),
    enableSorting: false,
    size: 60,
    cell: ({ row }) => {
      const color = row.original.color || '#3B82F6'
      return (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />
        </div>
      )
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:form.fields.name', { field: '' })} />
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const org_id = row.original.organization_id
      const color = row.original.color || '#3B82F6'
      return (
        <div className="flex items-center gap-2">
          <FolderIcon className="w-4 h-4" style={{ color }} />
          <Link
            href={`/org/${org_id}/spaces/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.getValue('name')}
          </Link>
        </div>
      )
    },
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('common:form.fields.description', { field: '' })}
      />
    ),
    enableSorting: false,
    cell: ({ row }) => {
      const description = row.original.description
      return (
        <div className="max-w-md truncate text-muted-foreground">
          {description || (
            <span className="italic text-gray-400">
              {t('common:form.fields.description', { field: '' }) || 'No description'}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'touch_points_count',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title='Links'
      />
    ),
    enableSorting: false,
    size: 100,
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Link2Icon className="w-4 h-4 text-muted-foreground" />
          <span>{row.original.touch_points_count}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'members_count',
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title={t('common:module.members')} 
      />
    ),
    enableSorting: false,
    size: 100,
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-muted-foreground" />
          <span>{row.original.members_count}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'org_permission',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('collection:form.org_permission_label')} />
    ),
    enableSorting: false,
    size: 120,
    cell: ({ row }) => {
      const permission = row.original.org_permission as CollectionOrgPermission
      return (
        <Badge variant="outline" className={getPermissionBadgeColor(permission)}>
          {getOrgPermissionLabel(permission)}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {      
      return <DataTableColumnHeader column={column} title={t('common:timestamps.created_at')} />
    },
    enableSorting: true,
    size: 150,
    cell: ({ row }) => {
      const { dayjs } = useDayjs()
      return (
        <div className="flex gap-2 items-center text-muted-foreground">
          <CalendarIcon className="w-4 h-4" />
          {dayjs(row.original.created_at).format('L')}
        </div>
      )
    },
  },
  {
    id: 'actions',
    enableSorting: false,
    size: 60,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:actions.actions')} />
    ),
    cell: ({ row }) => {
      return <DataTableRowActions<CollectionColumn> row={row} floating />
    },
  },
]
