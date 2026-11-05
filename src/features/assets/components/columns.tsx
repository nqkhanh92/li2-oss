'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { AssetType } from '@/shared/schemas/assets'
import { Badge } from '@/shared/components/ui/badge'
import Link from 'next/link'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'

export interface AssetColumn {
  id: string
  name: string
  type: AssetType
  status: string
  serial_number: string
  organization_id: string
  created_at: string
  is_warranty: boolean
}

export const mappingTags = {
  [AssetType.NFC]: (
    <Badge className="bg-amber-500" variant="outline">
      NFC
    </Badge>
  ),
  [AssetType.DIGITAL_SIGNAGE]: (
    <Badge className="bg-green-500" variant="outline">
      DIGITAL SIGNAGE
    </Badge>
  ),
}

export const assetColumn: ColumnDef<AssetColumn>[] = [
  {
    accessorKey: 'name',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => {
      const isDisabled = row.original.is_warranty
      return (
        <Link
          href={`/org/${row.original.organization_id}/assets/${row.original.id}`}
          className={isDisabled ? 'pointer-events-none opacity-50' : ''}
          onClick={(e) => isDisabled && e.preventDefault()}
        >
          {row.getValue('name') ?? '-'}
        </Link>
      )
    },
  },
  {
    accessorKey: 'type',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      return mappingTags?.[row.getValue('type') as AssetType]
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Active" />,
    cell: ({ row }) => {
      const status = row.getValue('status')
      return status === 'enable' ? (
        <Badge className="bg-success">Activate</Badge>
      ) : (
        <Badge className="bg-destructive">Deactivate</Badge>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'is_warranty',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Warranty" />,
    cell: ({ row }) => {
      const is_warranty = row.getValue('is_warranty')
      return is_warranty == true ? <Badge className="bg-destructive">Warranty</Badge> : <></>
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
      const isDisabled = row.original.is_warranty
      return (
        <div
          className={isDisabled ? 'pointer-events-none' : ''}
          onClick={(e) => isDisabled && e.preventDefault()}
        >
          <DataTableRowActions<AssetColumn> row={row} />
        </div>
      )
    },
  },
]
