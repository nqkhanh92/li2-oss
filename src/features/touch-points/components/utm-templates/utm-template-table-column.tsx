'use client'

import { ColumnDef } from '@tanstack/react-table'
import { UTMTemplate } from '@/app/api/organizations/[org_id]/utm-templates/route'
import dayjs from '@/shared/lib/dayjs'

export const utmTemplateColumns = (org_id: string): ColumnDef<UTMTemplate>[] => [
  {
    accessorKey: 'name',
    header: 'Template Name',
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div className="text-sm text-gray-600 truncate max-w-sm">
        {row.original.description || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'utm_source',
    header: 'Source',
    cell: ({ row }) => <div className="text-sm">{row.original.utm_source || '-'}</div>,
  },
  {
    accessorKey: 'utm_medium',
    header: 'Medium',
    cell: ({ row }) => <div className="text-sm">{row.original.utm_medium || '-'}</div>,
  },
  {
    accessorKey: 'utm_campaign',
    header: 'Campaign',
    cell: ({ row }) => <div className="text-sm">{row.original.utm_campaign || '-'}</div>,
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => <div className="text-sm">{dayjs(row.original.created_at).format('L')}</div>,
  },
]