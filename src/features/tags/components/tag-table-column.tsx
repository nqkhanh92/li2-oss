'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '../../../shared/components/customize/table/column-header'
import type { GetTagObject } from '@/app/api/organizations/[org_id]/tags/route'
import Link from 'next/link'
import { Badge } from '../../../shared/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { CalendarIcon, Edit2Icon, Settings, TrashIcon } from 'lucide-react'
import { useDayjs } from '@/shared/hooks/use-dayjs'
import { CustomAvatar } from '@/shared/components/ui/custom-avatar'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { DataTableViewOptions } from '@/shared/components/customize/table/column-toggle'

type TagColumn = GetTagObject

type TagColumnParams = {
  canEdit: (creator_id: string) => boolean
  canDelete: (creator_id: string) => boolean
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  isDeletingSingle: boolean
  permissionErrorText: string
}

export const createTagColumns = ({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  isDeletingSingle,
  permissionErrorText,
}: TagColumnParams): ColumnDef<TagColumn>[] => [
  {
    accessorKey: 'name',
    meta: {
      skeletonRender: () => <div className="h-6 w-20 rounded-full bg-slate-200" />,
    },
    header: ({ column }) => {
      const { t } = useTranslation('common')
      return (
        <DataTableColumnHeader
          column={column}
          title={t('common:form.fields.name', { field: '' })}
        />
      )
    },
    enableSorting: false,
    cell: ({ row }) => {
      const org_id = row.original.organization_id
      return (
        <Badge className="py-[5px] text-s! font-normal" size="sm" color={row.original.color}>
          <Link href={`/org/${org_id}/tags/${row.original.id}`}>{row.getValue('name')}</Link>
        </Badge>
      )
    },
  },
  {
    accessorKey: 'tp_tag_links',
    size: 150,
    meta: {
      skeletonRender: () => <div className="h-3 w-8 rounded bg-slate-200 mx-auto" />,
    },
    header: ({ column }) => {
      const { t } = useTranslation('common')
      return (
        <DataTableColumnHeader
          column={column}
          title={t('common:label.total_links')}
          className="justify-center"
        />
      )
    },
    cell: ({ row }) => (
      <div className="text-center text-s font-medium text-foreground">
        {row.original.tp_tag_links[0]?.count ?? 0}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'profiles',
    size: 300,
    meta: {
      skeletonRender: () => (
        <div className="flex items-center gap-2 py-1">
          <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0" />
          <div className="h-3 w-36 rounded bg-slate-200" />
        </div>
      ),
    },
    header: ({ column }) => {
      const { t } = useTranslation('common')
      return <DataTableColumnHeader column={column} title={t('common:text.creator')} />
    },
    enableSorting: false,
    cell: ({ row }) => {
      const profile = row.original.profiles
      return (
        <div className="flex items-center gap-2 py-1">
          <CustomAvatar
            src={profile?.avatar}
            name={profile?.name}
            email={profile?.email}
            size={20}
          />
          <span className="text-s text-slate-600 truncate">{profile?.email || 'N/A'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    size: 150,
    meta: {
      skeletonRender: () => (
        <div className="flex gap-1.5 items-center">
          <div className="h-4 w-4 rounded bg-slate-200 shrink-0" />
          <div className="h-3 w-24 rounded bg-slate-200" />
        </div>
      ),
    },
    header: ({ column }) => {
      const { t } = useTranslation('common')
      return <DataTableColumnHeader column={column} title={t('common:timestamps.created_at')} />
    },
    enableSorting: true,
    cell: ({ row }) => {
      const { dayjs } = useDayjs()
      return (
        <div className="flex gap-1.5 items-center text-s text-gray-50">
          <CalendarIcon className="w-[18px] h-[18px] shrink-0" />
          {dayjs(row.original.created_at).format('MMM D, YYYY')}
        </div>
      )
    },
  },
  {
    id: 'actions',
    size: 120,
    meta: {
      skeletonRender: () => (
        <div className="flex gap-3 items-center justify-center">
          <div className="h-8 w-8 rounded-md bg-slate-200" />
          <div className="h-8 w-8 rounded-md bg-slate-200" />
        </div>
      ),
    },
    header: () => {
      const { t } = useTranslation('common')
      return (
        <div className="flex items-center justify-center text-s font-medium text-slate-500">
          {t('common:actions.actions')}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const editable = canEdit(row.original.user_id)
      const deletable = canDelete(row.original.user_id)
      return (
        <div
          className="flex gap-3 items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div title={!editable ? permissionErrorText : undefined}>
            <Button
              variant="secondary"
              size="icon"
              className="p-[9px]"
              onClick={() => onEdit(row.id)}
              disabled={!editable}
            >
              <Edit2Icon className="w-[18px] h-[18px]" />
            </Button>
          </div>
          <div title={!deletable ? permissionErrorText : undefined}>
            <LoadingButton
              variant="secondary"
              size="icon"
              className="p-[9px]"
              onClick={() => onDelete(row.id)}
              disabled={!deletable}
              isLoading={isDeletingSingle}
            >
              <TrashIcon className="w-[18px] h-[18px]" />
            </LoadingButton>
          </div>
        </div>
      )
    },
  },
  {
    id: '_toggle',
    size: 36,
    header: ({ table }) => (
      <DataTableViewOptions
        table={table}
        button={
          <button className="flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors">
            <Settings className="h-[18px] w-[18px]" />
          </button>
        }
      />
    ),
    cell: () => null,
    enableSorting: false,
    enableHiding: false,
  },
]
