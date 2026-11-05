'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { AudienceMember } from '../types'
import dayjs from '@/shared/lib/dayjs'
import { t } from 'i18next'
import { countryCodeToFlag, getCountryName } from '@/shared/lib/location'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { AnonymousAvatar } from '@/shared/components/ui/anonymous-avatar'
import { Calendar, Check, Copy, FileText } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useState } from 'react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="table"
      size="xs"
      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full w-6 h-6 p-0 text-[#4125B9] hover:text-[#4125B9]"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}

/**
 * Cột của bảng khán giả — "ai đã xem nội dung của tôi".
 *
 * Doanh thu ĐÃ BỊ ẨN, không xoá khỏi DB: `customer_profiles` vẫn giữ `total_revenue*`,
 * `lead_count`, `sale_count` để dùng lại khi nào có bán hàng. Trên dữ liệu thật của LiHi
 * (2026-11-01) mọi cột thương mại đều rỗng ở cả hai hàng, nên cột tiền chỉ hiện `$0.00`.
 *
 * ⚠ Hàng `kind === 'device'` là một THIẾT BỊ, không phải một người: `fp` đổi khi người ta xoá
 * cookie hoặc đổi máy, nên số hàng ở đây luôn ≥ số người thật. Nhãn phải nói "thiết bị".
 */
export const createAudienceColumns = (): ColumnDef<AudienceMember>[] => [
  {
    id: 'customer',
    accessorKey: 'display_name',
    meta: {
      skeletonRender: () => (
        <div className="flex items-center gap-2 py-1">
          <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0" />
          <div className="h-3 w-32 rounded bg-slate-200" />
        </div>
      ),
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('customers:columns.customer')} />
    ),
    cell: ({ row }) => {
      const { kind, fp, display_name, email } = row.original
      const copyText = email || fp || ''
      return (
        <div className="flex items-center gap-2 py-1 group">
          {kind === 'device' && fp ? (
            <AnonymousAvatar fp={fp} size={20} />
          ) : (
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="text-[10px] bg-purple-100 text-purple-600">
                {display_name[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-sm text-foreground truncate max-w-[220px]">{display_name}</span>
          {kind === 'device' && (
            <Badge
              variant="outline"
              size="xs"
              className="not-italic text-slate-500 border-slate-300 shrink-0"
            >
              {t('customers:columns.device_badge', 'Thiết bị')}
            </Badge>
          )}
          {copyText && <CopyButton text={copyText} />}
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'content_count',
    accessorKey: 'content_count',
    meta: {
      skeletonRender: () => (
        <div className="flex justify-center">
          <div className="h-3 w-10 rounded bg-slate-200" />
        </div>
      ),
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('customers:columns.content_viewed')}
        className="justify-center"
      />
    ),
    cell: ({ row }) => {
      const { content_count, open_count } = row.original
      return (
        <div className="flex items-center justify-center gap-1.5 py-1">
          <FileText className="h-[14px] w-[14px] text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-foreground">{content_count}</span>
          {open_count > content_count && (
            <span className="text-xs text-slate-400">
              {t('customers:columns.opens_short', '{{count}} lượt mở', { count: open_count })}
            </span>
          )}
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'last_seen_at',
    accessorKey: 'last_seen_at',
    meta: {
      skeletonRender: () => <div className="h-3 w-24 rounded bg-slate-200" />,
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('customers:columns.last_viewed')} />
    ),
    cell: ({ row }) => {
      const value = row.original.last_seen_at
      if (!value) return <span className="text-sm text-slate-400">-</span>
      return (
        <span className="text-sm text-slate-500" title={dayjs(value).format('YYYY-MM-DD HH:mm')}>
          {dayjs(value).fromNow()}
        </span>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'touch_points',
    meta: {
      skeletonRender: () => <div className="h-3 w-24 rounded bg-slate-200" />,
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('customers:columns.source_link')} />
    ),
    cell: ({ row }) => {
      const tp = row.original.touch_points
      if (!tp) {
        return (
          <Badge variant="outline" size="xs" className="not-italic">
            Direct
          </Badge>
        )
      }
      return (
        <span className="text-sm text-slate-500 truncate max-w-[200px] block">
          {tp.short_url || tp.name || '-'}
        </span>
      )
    },
    enableSorting: false,
  },
  {
    id: 'country',
    accessorKey: 'country',
    meta: {
      skeletonRender: () => (
        <div className="flex items-center gap-2">
          <div className="h-4 w-5 rounded-sm bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
      ),
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('customers:columns.country')} />
    ),
    cell: ({ row }) => {
      const country = row.original.country
      return (
        <div className="flex items-center gap-2">
          {country ? (
            <>
              <span className="text-base">{countryCodeToFlag(country)}</span>
              <span className="text-sm text-slate-500">{getCountryName(country)}</span>
            </>
          ) : (
            '-'
          )}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    id: 'first_seen_at',
    accessorKey: 'first_seen_at',
    meta: {
      skeletonRender: () => (
        <div className="flex items-center gap-1.5">
          <div className="h-[18px] w-[18px] rounded bg-slate-200 shrink-0" />
          <div className="h-3 w-24 rounded bg-slate-200" />
        </div>
      ),
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('customers:columns.first_seen')} />
    ),
    cell: ({ row }) => {
      const value = row.original.first_seen_at
      return (
        <div className="flex items-center gap-1.5 text-slate-500">
          <Calendar className="h-[18px] w-[18px] shrink-0" />
          <span className="text-sm">{value ? dayjs(value).format('MMM D, YYYY') : '-'}</span>
        </div>
      )
    },
    enableSorting: true,
  },
]
