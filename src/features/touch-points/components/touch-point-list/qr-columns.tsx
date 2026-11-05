'use client'
import { ColumnDef, Row } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { t as tCommon } from 'i18next'
import Link from 'next/link'
import {
  CopyIcon,
  CornerDownRight,
  Tag as TagIcon,
  UserRound,
  Calendar,
  DownloadIcon,
  ScanEye,
  FolderOpen,
} from 'lucide-react'
import { toast } from '@/shared/hooks/use-toast'
import { Badge } from '@/shared/components/ui/badge'
import { SafetyFlaggedBadge } from '../safety-flagged-badge'
import dayjs from '@/shared/lib/dayjs'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'
import { useGetTouchPoints } from '@/features/touch-points/hooks/queries'
import { useTouchPointActions } from '../../hooks/use-touchpoint-actions'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import Image from 'next/image'
import {
  DownloadQrPopover,
  QrRenderRef,
  QrRenderWithRef,
} from '@/features/bootstrap/components/qr-render'
import { Options } from 'qr-code-styling'
import { Button } from '@/shared/components/ui/button'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/shared/hooks/use-mobile'

type TouchPointData = NonNullable<ReturnType<typeof useGetTouchPoints>['data']>['data'][number]

export const touchPointQrColumns: ColumnDef<TouchPointData>[] = [
  {
    accessorKey: 'id',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={tCommon('common:form.fields.info', { field: '' })}
      />
    ),
    cell: ({ row }) => {
      if (!row.original) return null
      return <TouchPointCell row={row} key={`cell-${row.original.id}`} />
    },
  },
]

const TouchPointCell = ({ row }: { row: Row<TouchPointData> }) => {
  const data = row.original
  const { handleCopy } = useTouchPointActions(row.original as any)
  const ref = useRef<QrRenderRef>(null)
  const { t } = useTranslation('common')
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col md:flex-row gap-2 items-center px-2 py-4 w-full pr-2 max-w-[calc(100vw-82px)]">
      <div className="p-[10px]">
        <div className="relative w-[100px] h-[100px] overflow-hidden flex items-center justify-center [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:max-h-full">
          {row.original.path_qr_code ? (
            <Image src={row.original.path_qr_code} alt="" fill={true} />
          ) : (
            <QrRenderWithRef
              size={111}
              qrOptions={row.original.qr_customize_options as Options}
              border={false}
              className={`p-0 flex w-[100px] h-[100px]`}
              ref={ref}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 items-start justify-center flex-1 min-w-0 px-2 max-w-[calc(100vw-82px)]">
        {/* Top section: Name and Actions */}
        <div className="flex flex-col md:flex-row gap-2 items-start w-full">
          <div className="flex flex-col gap-[2px] items-start flex-1 min-w-0 w-full">
            {/* Name */}
            <div className="flex items-center gap-2 w-full">
              <Link
                href={`/org/${data.organization_id}/short-links/${data.id}`}
                className="font-semibold text-[15px] leading-[22px] text-[#5F6D7E] hover:text-guest-primary-default hover:underline flex-1 min-w-0"
              >
                {data.name}
              </Link>
              {data.safety_status === 'flagged' && <SafetyFlaggedBadge />}
            </div>

            {/* Short URL */}
            <div className="flex gap-1 items-center w-full">
              <Link
                href={data.short_url}
                rel="noopener noreferrer"
                target="_blank"
                className="font-semibold text-[15px] leading-[22px] text-primary-light hover:underline overflow-hidden text-ellipsis text-nowrap"
              >
                {data.short_url}
              </Link>
              <button
                onClick={() => handleCopy(AllTouchPointVariants.LINK)}
                className="flex items-center justify-center p-[6px] rounded-full hover:bg-slate-100 shrink-0"
              >
                <CopyIcon className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Destination URL */}
            <div className="flex gap-1 items-center w-full min-w-0 truncate">
              <CornerDownRight className="w-3 h-3 text-gray-50 shrink-0" />
              <p className="flex-1 font-normal text-sm leading-5 text-gray-50 overflow-hidden text-ellipsis whitespace-nowrap">
                {data.content_value}
              </p>
            </div>
          </div>

          {/* Actions button */}
          <div className="flex gap-3 items-center justify-center shrink-0">
            <DataTableRowActions<TouchPointData> row={row}>
              <div className="flex gap-3">
                <Button
                  variant={'secondary'}
                  iconLeft={<CopyIcon className="w-[18px] h-[18px]" />}
                  onClick={() => handleCopy(AllTouchPointVariants.QR)}
                  size={'sm'}
                >
                  {t('common:actions.copy_field', { field: 'QR' })}
                </Button>
                <DownloadQrPopover
                  qrOptions={row.original.qr_customize_options as Options}
                  popoverAlign="end"
                  button={
                    <Button
                      variant={'secondary'}
                      iconLeft={<DownloadIcon className="w-[18px] h-[18px]" />}
                      size={isMobile ? 'icon' : 'sm'}
                    >
                      {!isMobile ? t('common:actions.download') : ''}
                    </Button>
                  }
                />
              </div>
            </DataTableRowActions>
          </div>
        </div>

        {/* Bottom section: Tags, Collection and Metadata */}
        <div className="gap-6 items-center px-0 py-1 w-full hidden md:flex">
          {/* Tags */}
          <div className="flex flex-1 gap-2 items-center min-w-0">
            <div className="flex gap-1 items-center shrink-0">
              <TagIcon className="w-3 h-3 text-gray-50" />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {data.tp_tag_links.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.tags.id}
                  className="bg-cyan-50 px-3 py-1 gap-[2px] rounded-full border-none text-xs leading-4 text-cyan-600 font-normal"
                  variant="outline"
                  color={tag.tags.color}
                >
                  {tag.tags.name.length > 20 ? `${tag.tags.name.slice(0, 20)}...` : tag.tags.name}
                </Badge>
              ))}
              {data.tp_tag_links.length > 3 && (
                <p className="font-medium text-xs leading-4 text-gray-50 overflow-hidden text-ellipsis">
                  +{data.tp_tag_links.length - 3}
                </p>
              )}
              {data.tp_tag_links.length === 0 && (
                <p className="font-medium text-xs leading-4 text-gray-50 overflow-hidden text-ellipsis">
                  No tags
                </p>
              )}
            </div>
          </div>

          {/* Collection Badge */}
          {data.collections && (
            <div className="flex gap-1 items-center shrink-0">
              <FolderOpen className="w-3 h-3 text-gray-50" />
              {/* Badge CHỈ hiển thị, không còn là liên kết: `/spaces` đã bị chuyển hướng về danh sách
              gộp (chốt 2026-10-28, lý do đầy đủ ở `middleware.ts`). Giữ cái tên vì nó là thông tin
              đúng — 44 touch point trên prod thật sự thuộc một space — nhưng một liên kết dẫn tới
              chỗ bị chặn thì tệ hơn không có liên kết. */}
              <Badge
                className="px-3 py-1 gap-[2px] rounded-full border-none text-xs leading-4 font-normal"
                variant="outline"
                color={data.collections.color || '#666'}
              >
                {data.collections.name.length > 15
                  ? `${data.collections.name.slice(0, 15)}...`
                  : data.collections.name}
              </Badge>
            </div>
          )}

          {/* Created by info */}
          <div className="flex gap-2 items-center shrink-0">
            <div className="hidden md:flex gap-1 items-center text-gray-50 font-normal text-xs">
              <ScanEye className="w-4 h-4" />
              {row.original.visits?.[0]?.count || 0} {t('common:label.visits')}
            </div>
            <div className="flex gap-1 items-center">
              <UserRound className="w-3 h-3 text-gray-50" />
              <p className="font-normal text-xs text-gray-50 overflow-hidden text-ellipsis">
                {data.profiles?.email || 'User'}
              </p>
            </div>
            <div className="flex gap-1 items-center">
              <Calendar className="w-3 h-3 text-gray-50" />
              <p className="font-normal text-xs text-gray-50 overflow-hidden text-ellipsis">
                {dayjs(data.created_at).format('MMM DD, YYYY')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
