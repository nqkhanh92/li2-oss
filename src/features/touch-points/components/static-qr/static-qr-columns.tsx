'use client'

import { ColumnDef, Row } from '@tanstack/react-table'
import { StaticQrItem } from './static-qr.types'
import { Badge } from '@/shared/components/ui/badge'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import { memo, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'

const getQrData = (item: StaticQrItem | undefined): string => {
  if (!item || !item.payload) return ''

  const { payload } = item

  if (payload.type === 'text') {
    return payload.text || ''
  }

  if (payload.type === 'url') {
    return payload.url || ''
  }

  if (payload.type === 'wifi') {
    const ssid = payload.wifi?.ssid || ''
    const password = payload.wifi?.password || ''
    const security = payload.wifi?.security || (password ? 'WPA' : 'nopass')
    const hidden = payload.wifi?.hidden ? 'true' : 'false'
    return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`
  }

  return ''
}

const QrCell = memo(
  ({ item }: { item: StaticQrItem }) => {
    const qrData = useMemo(() => getQrData(item), [item])
    const qrOptions = useMemo(
      () => ({
        ...(item.qr_customize_options || {}),
        data: qrData,
      }),
      [item.qr_customize_options, qrData]
    )

    return (
      <div className="p-[10px]">
        <div className="relative w-[100px] h-[100px] overflow-hidden flex items-center justify-center">
          <QrRenderWithRef
            size={100}
            qrOptions={qrOptions}
            border={false}
            className="p-0 flex w-[100px] h-[100px]"
          />
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if the actual QR data or customize options changed
    if (!prevProps.item || !nextProps.item) return false

    return (
      prevProps.item.id === nextProps.item.id &&
      JSON.stringify(prevProps.item.payload) === JSON.stringify(nextProps.item.payload) &&
      JSON.stringify(prevProps.item.qr_customize_options) ===
        JSON.stringify(nextProps.item.qr_customize_options)
    )
  }
)

const getHumanReadableValue = (item: StaticQrItem | undefined): string => {
  if (!item || !item.payload) return '-'

  const { payload } = item

  if (payload.type === 'text') {
    return payload.text || '-'
  }

  if (payload.type === 'url') {
    return payload.url || '-'
  }

  if (payload.type === 'wifi') {
    const ssid = payload.wifi?.ssid || ''
    const security = payload.wifi?.security || 'nopass'
    const hasPassword = payload.wifi?.password ? '🔒' : '🔓'
    return ssid ? `${ssid} (${security}) ${hasPassword}` : '-'
  }

  return '-'
}

const StaticQrCell = ({ row }: { row: Row<StaticQrItem> }) => {
  const data = row.original

  if (!data) return null

  return (
    <div className="flex flex-col md:flex-row gap-2 items-center px-2 py-4 w-full pr-2 max-w-[calc(100vw-82px)]">
      <QrCell item={data} />

      <div className="flex flex-col gap-2 items-start justify-center flex-1 min-w-0 px-2 max-w-[calc(100vw-82px)]">
        {/* Top section: Name and Actions */}
        <div className="flex flex-col md:flex-row gap-2 items-start w-full">
          <div className="flex flex-col gap-[2px] items-start flex-1 min-w-0 w-full">
            {/* Name */}
            <div className="flex items-center gap-2 w-full">
              <div className="font-semibold text-[15px] leading-[22px] text-[#5F6D7E] flex-1 min-w-0">
                {data.name}
              </div>
            </div>

            {/* Value */}
            <div className="flex gap-1 items-center w-full min-w-0 truncate">
              <p className="flex-1 font-normal text-sm leading-5 text-gray-50 overflow-hidden text-ellipsis whitespace-nowrap">
                {getHumanReadableValue(data)}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom section: Metadata */}
        <div className="gap-6 items-center px-0 py-1 w-full hidden md:flex">
          {/* Created date */}
          <div className="flex gap-1 items-center">
            <Calendar className="w-3 h-3 text-gray-50" />
            <p className="font-normal text-xs text-gray-50 overflow-hidden text-ellipsis">
              {dayjs(data.created_at).format('MMM DD, YYYY')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const TypeBadge = ({ type }: { type: string }) => {
  const colorMap: Record<string, string> = {
    text: 'bg-blue-100 text-blue-800',
    url: 'bg-green-100 text-green-800',
    wifi: 'bg-purple-100 text-purple-800',
  }

  return (
    <Badge variant="secondary" className={colorMap[type] || 'bg-gray-100 text-gray-800'}>
      {type.toUpperCase()}
    </Badge>
  )
}

export const createStaticQrColumns = (): ColumnDef<StaticQrItem>[] => [
  {
    accessorKey: 'id',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Info" />,
    cell: ({ row }) => {
      if (!row.original) return null
      return <StaticQrCell row={row} key={`cell-${row.original.id}`} />
    },
  },
  {
    accessorKey: 'type',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      if (!row.original) return null
      return (
        <div className="px-2">
          <TypeBadge type={row.original.payload?.type || 'text'} />
        </div>
      )
    },
  },
]
