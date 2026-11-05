'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { Eye, EyeOff } from 'lucide-react'
import { dateComparator } from '@/shared/lib/utils'
import { Campaign } from '@/app/api/organizations/[org_id]/campaigns/route'
import { Checkbox } from '@/shared/components/ui/checkbox'
import Link from 'next/link'
import { Badge } from '@/shared/components/ui/badge'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'
import { CampaignContentType, campaignContentTypes } from '@/shared/schemas/campaigns'

export type CampaignColumn = Campaign

export const campaignColumns: ColumnDef<CampaignColumn>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    enableSorting: false,
    cell: ({ row }) => {
      return <Link href={`campaigns/${row.original.id}`}>{row.getValue('name')}</Link>
    },
  },
  {
    accessorKey: 'content_type',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Content Type" />,
    cell: ({ row }) => {
      const type = row.getValue('content_type')
      return <div>{campaignContentTypes[type as CampaignContentType]?.label}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: 'enabled',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      return row.getValue('enabled') ? (
        <Badge className="bg-success">Active</Badge>
      ) : (
        <Badge className="bg-destructive">Inactive</Badge>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'))
      return <div>{date.toLocaleDateString()}</div>
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) => {
      return <DataTableRowActions<CampaignColumn> row={row} />
    },
  },
]
