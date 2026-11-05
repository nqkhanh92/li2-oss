'use client'
import { ColumnDef, Row } from '@tanstack/react-table'
import { CalendarIcon, Monitor, Globe, Share2, Building2 } from 'lucide-react'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { Badge } from '@/shared/components/ui/badge'
import React from 'react'
import { t } from 'i18next'
import { TouchPointType } from '@/shared/schemas/touch-points'
import dayjs from '@/shared/lib/dayjs'

export const mappingChannel = {
  [TouchPointType.QR]: (
    <Badge className="bg-sky-500" variant="outline">
      {' '}
      QR Code{' '}
    </Badge>
  ),
  [TouchPointType.LINK]: (
    <Badge className="bg-blue-500" variant="outline">
      {' '}
      LINK{' '}
    </Badge>
  ),
  [TouchPointType.NFC]: (
    <Badge className="bg-indigo-500" variant="outline">
      {' '}
      NFC{' '}
    </Badge>
  ),
}

export type IInteractionChannel = 'LINK' | 'QR' | 'NFC'
export type RealtimeTouchpoint = {
  id: string
  touchpoint_id: string
  touchpoint_name: string
  os: string
  platform: string
  channel: IInteractionChannel
  country: string
  referrer: string
  created_at: string
  ip: string | null
  isp: string | null
  city: string | null
  visitor_id: string | null
  customer_profile_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_external_id: string | null
}

export const realtimeTouchpointColumns: ColumnDef<RealtimeTouchpoint>[] = [
  {
    accessorKey: 'touchpoint_name',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('common:form.fields.name', { field: 'Link' })}
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-[2px] py-6 pb-6">
        <span className="text-sm font-semibold">{row.getValue('touchpoint_name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'os',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('common:label.os')} />,
    cell: ({ row }) => (
      <div className="flex gap-2 items-center">
        <span>{row.getValue('os')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'platform',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:label.platform')} />
    ),
    cell: ({ row }) => <span>{row.getValue('platform')}</span>,
  },
  {
    accessorKey: 'channel',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:label.channel')} />
    ),
    cell: ({ row }) => {
      return mappingChannel?.[row.getValue('channel') as TouchPointType]
    },
  },
  {
    accessorKey: 'country',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:label.country')} />
    ),
    cell: ({ row }) => (
      <div className="flex gap-2 items-center">
        <Globe className="w-4 h-4" />
        <span>{row.getValue('country')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'city',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:label.city')} />
    ),
    cell: ({ row }) => (
      <div className="flex gap-2 items-center">
        <Building2 className="w-4 h-4" />
        <span>{row.getValue('city')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'referrer',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:label.referrer')} />
    ),
    cell: ({ row }) => (
      <div className="flex gap-2 items-center">
        <Share2 className="w-4 h-4" />
        <span>{row.getValue('referrer')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'ip',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('common:label.ip')} />,
    cell: ({ row }) => (
      <div className="flex gap-2 items-center">
        <span>{row.getValue('ip')}</span>
      </div>
    ),
  },
  // {
  //   accessorKey: 'isp',
  //   enableSorting: false,
  //   header: ({ column }) => <DataTableColumnHeader column={column} title={t('common:label.isp')} />,
  //   cell: ({ row }) => (
  //     <div className="flex gap-2 items-center">
  //       <span>{row.getValue('isp')}</span>
  //     </div>
  //   ),
  // },
  {
    accessorKey: 'created_at',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:timestamps.interacted_at')} />
    ),
    cell: ({ row }) => {
      const date = dayjs(row.getValue('created_at'))
      return (
        <div className="flex flex-col gap-[2px]">
          <div className="flex gap-2 items-center">
            <CalendarIcon className="w-4 h-4" />
            {date.format('LL')}
          </div>
        </div>
      )
    },
  },
]
