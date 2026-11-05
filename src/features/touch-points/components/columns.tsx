'use client'
import { ColumnDef, Row } from '@tanstack/react-table'
import {
  CalendarIcon,
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  Link2,
  LinkIcon,
  Loader2Icon,
  QrCode,
  ScanEye,
  SmartphoneNfc,
  Square,
  SquareCheck,
  Tag,
  Trash2Icon,
  UserRoundPen,
  Wifi,
} from 'lucide-react'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { TouchPointType } from '@/shared/schemas/touch-points'
import { Badge } from '@/shared/components/ui/badge'
import { SafetyFlaggedBadge } from './safety-flagged-badge'
import Link from 'next/link'
import { GetTouchPointObject } from '@/app/api/organizations/[org_id]/touch-points/route'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { useUpdateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { useParams } from 'next/navigation'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { toast } from '@/shared/hooks/use-toast'
import React from 'react'
import { LinkBranchIcon } from '@/shared/components/icons/link-branch'
import { ExtendedOptions } from './customize-tool/qr-tool'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import QRCodeStyling, { FileExtension, Options } from 'qr-code-styling'
import { Separator } from '@/shared/components/ui/separator'
import {
  availableQrOptions,
  createExtensionWithBase64Logo,
} from '@/features/touch-points/constants/qr'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { t } from 'i18next'
import dayjs from '@/shared/lib/dayjs'
import { useQueryClient } from '@tanstack/react-query'
import { CustomDialog } from '@/shared/components/customize/custom-dialog'
import { QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from '@/shared/components/ui/dropdown-menu'
import Image from 'next/image'
import { TagList } from './tag-badge'
import { useBulkDeleteTouchPointFromTag } from '@/features/tags/hooks/mutations'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { cn, toBlobPart } from '@/shared/lib/utils'
import { TouchPointDetail, TouchPointInList } from '@/core/types/touch-point.type'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '../constants'

export const mappingTags = {
  [TouchPointType.QR]: (
    <Badge className="bg-sky-500" variant="outline">
      QR Code
    </Badge>
  ),
  // [TouchPointType.NFC]: (
  //   <Badge className="bg-amber-500" variant="outline">
  //     NFC
  //   </Badge>
  // ),
  // [TouchPointType.WIFI]: (
  //   <Badge className="bg-green-500" variant="outline">
  //     WIFI
  //   </Badge>
  // ),
  [TouchPointType.LINK]: (
    <Badge className="bg-blue-500" variant="outline">
      LINK
    </Badge>
  ),
}

export type TouchPointColumnDef = TouchPointInList // GetTouchPointObject
export const touchPointInAddToTagColumns: ColumnDef<TouchPointColumnDef>[] = [
  {
    id: 'select',
    header: ({ table }) => {
      const isAllSelected = table.getIsAllRowsSelected()
      return (
        <button
          onClick={table.getToggleAllRowsSelectedHandler()}
          className="w-6 h-6 text-slate-500"
        >
          {isAllSelected ? (
            <SquareCheck className="w-6 h-6 stroke-[#4125B9]" />
          ) : (
            <Square className="w-6 h-6" />
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      const isSelected = row.getIsSelected()
      return (
        <button onClick={row.getToggleSelectedHandler()} className="w-6 h-6 text-slate-500">
          {isSelected ? (
            <SquareCheck className="w-6 h-6 stroke-[#4125B9]" />
          ) : (
            <Square className="w-6 h-6" />
          )}
        </button>
      )
    },
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: 'name',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 px-2 py-1 min-w-[180px]">
          <div className="flex flex-col justify-center gap-2">
            <Link
              href={`/org/${row.original.organization_id}/short-links/${row.original.id}`}
              className="font-semibold text-base"
            >
              {row.original.name.length > 15
                ? `${row.original.name.slice(0, 15)}...`
                : row.original.name}
            </Link>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'name',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 px-2 py-1">
          <div className="flex flex-col justify-center gap-2">
            <span className="flex gap-4 items-center text-gray-50">
              <LinkIcon className="w-3 h-3" />
              {row.original.short_url}
            </span>
            <span className="flex gap-4 items-center text-gray-50">
              <LinkBranchIcon className="w-3 h-3" />
              <div className="block max-w-[300px] overflow-hidden whitespace-nowrap text-ellipsis">
                {row.original.content_value}
              </div>
            </span>
          </div>
        </div>
      )
    },
  },
]

export const touchPointInTagDetailColumns: ColumnDef<TouchPointColumnDef>[] = [
  {
    accessorKey: 'name',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 px-2 py-1">
          <div className="flex flex-col justify-center gap-2">
            <Link
              href={`/org/${row.original.organization_id}/short-links/${row.original.id}`}
              className="font-semibold text-base"
            >
              {row.original.name}
            </Link>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'name',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 px-2 py-1">
          <div className="flex flex-col justify-center gap-2">
            <span className="flex gap-4 items-center">
              <LinkIcon className="w-3 h-3" />
              {row.original.short_url}
              <div className="flex p-1 items-center justify-center rounded-sm bg-neutral-400">
                <CopyIcon
                  onClick={() => {
                    navigator.clipboard.writeText(row.original.short_url)
                    toast({
                      title: t('common:toast.title_copy'),
                      description: t('common:toast.description_copy', {
                        field: '$t(label.short_link)',
                      }),
                      variant: 'success',
                    })
                  }}
                  className="w-4 h-4 cursor-pointer text-guest-primary-default"
                />
              </div>
            </span>
            <span className="flex gap-4 items-center">
              <LinkBranchIcon className="w-3 h-3" />
              <div className="flex-1 max-w-[300px] overflow-hidden whitespace-nowrap text-ellipsis">
                {row.original.content_value}
              </div>
            </span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      const date = dayjs(row.getValue('created_at'))
      return (
        <div className="flex px-2 py-1 gap-[2px] items-start justify-center flex-col text-gray-50 overflow-hidden text-ellipsis">
          <div className="flex gap-2 items-center">
            <CalendarIcon className="w-4 h-4" />
            {date.format('LL')}
          </div>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      return (
        <DataTableRowActions<TouchPointColumnDef>
          row={row}
          key={`row-action-${row.original.id}`}
          extra={<RemoveTouchPointFromTag row={row.original} />}
        />
      )
    },
  },
]
export const touchPointColumns: ColumnDef<TouchPointColumnDef>[] = [
  {
    accessorKey: 'name',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:touchpoint.touch_point_info')} />
    ),
    cell: ({ row }) => {
      const isFlagged = row.original.safety_status === 'flagged'
      return (
        <div className="flex flex-col gap-[2px]">
          <div className="flex items-center gap-2">
            <Link
              href={`/org/${row.original.organization_id}/short-links/${row.original.id}`}
              className="font-semibold text-base hover:text-guest-primary-default hover:underline"
            >
              {row.original.name}
            </Link>
            {isFlagged && <SafetyFlaggedBadge />}
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex flex-col justify-center gap-[2px]">
              <span className="flex gap-1 items-center">
                <LinkIcon className="w-3 h-3 text-gray-50" />
                <Link
                  href={row.original.short_url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="hover:underline text-gray-50 text-sm"
                >
                  {row.original.short_url}
                </Link>
                <div className="flex p-1 items-center justify-center rounded-sm bg-neutral-400">
                  <CopyIcon
                    onClick={() => {
                      navigator.clipboard.writeText(row.original.short_url)
                      toast({
                        title: t('common:toast.title_copy'),
                        description: t('common:toast.description_copy', {
                          field: '$t(label.short_link)',
                        }),
                        variant: 'success',
                      })
                    }}
                    className="w-4 h-4 cursor-pointer text-guest-primary-default"
                  />
                </div>
              </span>
              <span className="flex gap-1 items-center">
                <LinkBranchIcon className="w-3 h-3 text-gray-50" />
                <div className="flex-1 max-w-[300px] overflow-hidden whitespace-nowrap text-ellipsis text-gray-50 text-sm">
                  {row.original.content_value}
                </div>
              </span>
              <span className="flex gap-1 items-center">
                <div className="flex items-center justify-center p-1 rounded-full bg-green-50 w-7! h-7!">
                  <Link2 className="w-[16px] h-[16px] text-green-600" size={16} />
                </div>
                {row.original.variants_content?.QR?.enabled && (
                  <div className="flex items-center justify-center p-1 rounded-full bg-green-50 w-7! h-7!">
                    <QrCode className="w-[16px] h-[16px] text-green-600" size={16} />
                  </div>
                )}
                {row.original.variants_content?.WIFI?.enabled && (
                  <div className="flex items-center justify-center p-1 rounded-full bg-green-50 w-7! h-7!">
                    <Wifi className="w-[16px] h-[16px] text-green-600" size={16} />
                  </div>
                )}
                {row.original.variants_content?.NFC?.enabled && (
                  <div className="flex items-center justify-center p-1 rounded-full bg-green-50 w-7! h-7!">
                    <SmartphoneNfc className="w-[16px] h-[16px] text-green-600" size={16} />
                  </div>
                )}
              </span>
            </div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'enabled',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:actions.active')} />
    ),
    cell: ({ row }) => {
      return <ActiveColumnRender row={row} />
    },
  },
  {
    accessorKey: 'tp_tag_links',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:module.tag')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          {row.original.tp_tag_links.slice(0, 1).map((tag) => (
            <Badge
              className="py-1 px-3 max-w-32 overflow-hidden border-none outline-hidden text-xs text-center items-center justify-center"
              key={tag.tags.id}
              color={tag.tags.color}
              variant="outline"
            >
              {tag.tags.name}
            </Badge>
          ))}
          <CustomToolTip
            contentClassName="bg-background rounded-[8px] px-4 py-3 border border border-slate-200"
            content={
              <div className="grid grid-cols-2 gap-2">
                {row.original.tp_tag_links.map((tag) => (
                  <Badge
                    className="py-1 px-3 max-w-32 overflow-hidden border-none outline-hidden text-xs text-center items-center justify-center"
                    key={tag.tags.id}
                    color={tag.tags.color}
                    variant="outline"
                  >
                    {tag.tags.name}
                  </Badge>
                ))}
              </div>
            }
            side="bottom"
          >
            <>
              {row.original.tp_tag_links.length > 1 && (
                <span className="flex items-center text-xs">
                  +{row.original.tp_tag_links.length - 1}
                </span>
              )}
            </>
          </CustomToolTip>
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:timestamps.created_at')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex px-2 py-1 gap-[2px] items-start justify-center flex-col text-gray-50 overflow-hidden text-ellipsis">
          <div className="flex gap-2 items-center">
            <CalendarIcon className="w-4 h-4" />
            {dayjs(row?.original?.created_at).format('LL')}
          </div>
          <div className="flex gap-2 items-center">
            <UserRoundPen className="w-4 h-4" />
            {row?.original?.profiles?.email || 'User'}
          </div>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:actions.actions')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-4 px-2 py-1">
          <Button
            variant={'secondary'}
            className="px-4 py-2 text-sm h-auto text-guest-primary-default font-normal bg-neutral-400 border-none rounded-[8px]"
          >
            <Link
              href={`/org/${row.original.organization_id}/short-links/${row.original.id}?tab=analytic`}
            >
              {t('common:actions.analytics')}
            </Link>
          </Button>
          <DataTableRowActions<TouchPointColumnDef>
            row={row}
            {...(row.original.variants_content?.QR?.enabled && {
              renderButton: (row) => (
                <Popover>
                  <PopoverTrigger asChild className="w-full">
                    <div className="relative flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm focus:bg-accent hover:text-accent-foreground hover:bg-accent text-slate-500 font-medium">
                      {t('common:actions.download')}
                      <DownloadIcon className="w-4! h-4! opacity-60" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="bg-background rounded-[8px] px-4 py-3 border border-slate-200"
                    sideOffset={0}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      {availableQrOptions.map((option) => (
                        <div
                          className="flex flex-col w-full"
                          key={option.id}
                          onClick={() =>
                            handleDownloadQrCode(
                              row.original.qr_customize_options as ExtendedOptions,
                              row.original.name,
                              row.original.short_code || '',
                              {
                                fileType: option.fileType as FileExtension,
                                fileSize: option.fileSize,
                              }
                            )
                          }
                        >
                          {option.spacer && <Separator className="mb-2" />}
                          <div className="flex gap-2 px-2 py-1 items-center cursor-pointer hover:bg-slate-100 hover:rounded-[8px]">
                            <div className="text-sm font-medium text-slate-700 uppercase">
                              {option.fileType}
                            </div>
                            {option.fileSize && option.fileType != 'svg' && (
                              <div className="text-sm text-slate-500">
                                {option.fileSize} x {option.fileSize}
                              </div>
                            )}
                            {option.note && (
                              <Badge
                                variant="outline"
                                className="text-[10px] italic font-medium leading-[16px] text-blue-600 py-[2px] px-2 gap-[10px] flex items-center justify-center rounded-full bg-blue-50 border-none outline-hidden shadow-none"
                              >
                                {t(option.note)}
                              </Badge>
                            )}
                            {option.sizeInText && (
                              <div className="text-sm text-slate-500">{option.sizeInText}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ),
            })}
          />
        </div>
      )
    },
  },
]
export const touchPointShortLinkColumns: ColumnDef<TouchPointColumnDef>[] = [
  {
    accessorKey: 'name',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:form.fields.info', { field: '' })} />
    ),
    cell: ({ row }) => {
      const isFlagged = row.original.safety_status === 'flagged'
      return (
        <div className="flex flex-col gap-2 py-2 w-full pr-2">
          <div className="flex items-start gap-2 self-stretch justify-between w-full">
            <div className="flex flex-col gap-[2px]">
              <div className="flex items-center gap-2">
                <Link
                  href={`/org/${row.original.organization_id}/short-links/${row.original.id}`}
                  className="font-semibold text-gray-50 hover:text-guest-primary-default hover:underline text-[15px] leading-[22px]"
                >
                  {row.original.name}
                </Link>
                {isFlagged && <SafetyFlaggedBadge />}
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex flex-col justify-center gap-[2px]">
                  <span className="flex gap-1 items-center">
                    <Link
                      href={row.original.short_url}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="hover:underline text-primary text-[15px] leading-[22px] font-semibold"
                    >
                      {row.original.short_url}
                    </Link>
                    <CopyIcon
                      onClick={() => {
                        navigator.clipboard.writeText(row.original.short_url)
                        toast({
                          title: t('common:toast.title_copy'),
                          description: t('common:toast.description_copy', {
                            field: '$t(label.short_link)',
                          }),
                          variant: 'success',
                        })
                      }}
                      className="w-4 h-4 cursor-pointer text-slate-600"
                    />
                  </span>
                  <span className="flex gap-1 items-center min-w-0 flex-1">
                    <LinkBranchIcon className="w-3 h-3 text-gray-50 flex-shrink-0" />
                    <div
                      className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-50 text-sm cursor-default max-w-[300] md:max-w-[450]"
                      title={row.original.content_value || ''}
                      style={{
                        display: 'block',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {row.original.content_value}
                    </div>
                  </span>
                </div>
              </div>
            </div>
            <div className="md:flex flex-row gap-2 items-center hidden">
              <DataTableRowActions<TouchPointColumnDef> row={row} />
            </div>
          </div>
          <div className="flex md:py-1 gap-2 justify-between w-full">
            <div className="flex items-center gap-2 justify-center">
              {row.original.tp_tag_links.length > 0 ? (
                <TagList tp_tag_links={row.original.tp_tag_links} />
              ) : (
                <div className="flex flex-row items-center gap-2">
                  <Tag className="w-3 h-3 min-w-3 min-h-3" />
                  <div className="flex gap-2 text-xs font-normal">
                    {t('common:form.no_field_found', { field: '$t(module.tag)' })}
                  </div>
                </div>
              )}
            </div>
            <div className="items-center gap-2 justify-center md:flex hidden text-xs text-gray-50">
              <div className="flex gap-1 items-center">
                <ScanEye className="w-4 h-4" />
                {row.original.visits?.[0]?.count || 0} {t('common:label.visits')}
              </div>
              <div className="flex gap-1 items-center">
                <UserRoundPen className="w-4 h-4" />
                {row?.original?.profiles?.email || 'User'}
              </div>
              <div className="flex gap-2 items-center">
                <CalendarIcon className="w-4 h-4" />
                {dayjs(row?.original?.created_at).format('LL')}
              </div>
            </div>
            {/* Row tool and tag details in mobile responsive */}
            <div className="items-end gap-2 justify-center md:hidden flex">
              <DataTableRowActions<TouchPointColumnDef> row={row} />
            </div>
          </div>
        </div>
      )
    },
  },
]
export const touchPointQRCodeColumns: ColumnDef<TouchPointColumnDef>[] = [
  {
    accessorKey: 'name',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('common:form.fields.info', { field: '' })} />
    ),
    cell: ({ row }) => {
      const isFlagged = row.original.safety_status === 'flagged'
      return (
        <div className="flex flex-row gap-4 items-center justify-center py-2 pr-2">
          <div className="hidden md:flex w-[116px] h-[116px]">
            <QrRenderPreview row={row.original} size={116} />
          </div>
          <div className="flex flex-col gap-2 py-0 w-full">
            <div className="flex items-start gap-2 self-stretch justify-between w-full">
              <div className="flex flex-col gap-[2px]">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/org/${row.original.organization_id}/short-links/${row.original.id}?type=qr_code`}
                    className="font-semibold text-gray-50 hover:text-guest-primary-default hover:underline text-[15px] leading-[22px]"
                  >
                    {row.original.name}
                  </Link>
                  {isFlagged && <SafetyFlaggedBadge />}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex flex-col justify-center gap-[2px]">
                    <span className="flex gap-1 items-center">
                      <Link
                        href={row.original.short_url}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="hover:underline text-primary text-[15px] leading-[22px] font-semibold"
                      >
                        {row.original.short_url}
                      </Link>
                      <CopyIcon
                        onClick={() => {
                          navigator.clipboard.writeText(row.original.short_url)
                          toast({
                            title: t('common:toast.title_copy'),
                            description: t('common:toast.description_copy', {
                              field: '$t(label.short_link)',
                            }),
                            variant: 'success',
                          })
                        }}
                        className="w-4 h-4 cursor-pointer text-slate-600"
                      />
                    </span>
                    <span className="flex gap-1 items-center min-w-0 flex-1">
                      <LinkBranchIcon className="w-3 h-3 text-gray-50 flex-shrink-0" />
                      <div
                        className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-50 text-sm cursor-default max-w-[300] md:max-w-[450]"
                        title={row.original.content_value || ''}
                        style={{
                          display: 'block',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.original.content_value}
                      </div>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex md:hidden w-[80px] h-[80px]">
                <QrRenderPreview row={row.original} size={80} />
              </div>
              <div className="md:flex flex-row gap-2 items-center hidden">
                <DataTableRowActions<TouchPointColumnDef> row={row}>
                  <div className="flex flex-rows items-center gap-2">
                    <CopyTouchPoint row={row.original} />
                    <DownloadQrPoppover row={row.original} />
                  </div>
                </DataTableRowActions>
              </div>
            </div>
            <div className="flex md:py-1 gap-2 justify-between w-full">
              <div className="flex items-center gap-2 justify-center">
                {row.original.tp_tag_links.length > 0 ? (
                  <TagList tp_tag_links={row.original.tp_tag_links} />
                ) : (
                  <div className="flex flex-row items-center gap-2">
                    <Tag className="w-3 h-3 min-w-3 min-h-3" />
                    <div className="flex gap-2 text-xs font-normal">
                      {t('common:form.no_field_found', { field: '$t(module.tag)' })}
                    </div>
                  </div>
                )}
              </div>
              <div className="items-center gap-2 justify-center md:flex hidden text-xs text-gray-50">
                <div className="flex gap-1 items-center">
                  <ScanEye className="w-4 h-4" />
                  {row.original.visits?.[0]?.count || 0} {t('common:label.visits')}
                </div>
                <div className="flex gap-1 items-center">
                  <UserRoundPen className="w-4 h-4" />
                  {row?.original?.profiles?.email || 'User'}
                </div>
                <div className="flex gap-2 items-center">
                  <CalendarIcon className="w-4 h-4" />
                  {dayjs(row?.original?.created_at).format('LL')}
                </div>
              </div>
              {/* Row tool and tag details in mobile responsive */}
              <div className="items-end gap-2 justify-center md:hidden flex">
                <DataTableRowActions<TouchPointColumnDef> row={row}>
                  <div className="flex flex-rows items-center gap-2">
                    <CopyTouchPoint row={row.original} />
                    <DownloadQrPoppover row={row.original} />
                  </div>
                </DataTableRowActions>
              </div>
            </div>
          </div>
        </div>
      )
    },
  },
]

const handleDownloadQrCode = async (
  qr_customize_options: ExtendedOptions,
  tp_name: string,
  short_code: string,
  option?: { fileType: FileExtension; fileSize: number }
) => {
  if (!qr_customize_options)
    return toast({
      title: 'Error',
      description: 'QR data is not found',
      variant: 'destructive',
    })
  const downloadQr = new QRCodeStyling({
    ...qr_customize_options,
    data: qr_customize_options.data
      ? qr_customize_options.data
      : `${process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${short_code}?t=1`,
    width: option?.fileSize || 512,
    height: option?.fileSize || 512,
    image: qr_customize_options.image,
    imageOptions: {
      ...qr_customize_options.imageOptions,
    },
  })
  downloadQr.applyExtension(await createExtensionWithBase64Logo())
  setTimeout(() => {
    downloadQr.download({
      extension: option?.fileType || 'png',
      name: tp_name,
    })
  }, 200)
}

const ActiveColumnRender = ({ row }: { row: Row<TouchPointColumnDef> }) => {
  const { org_id } = useParams<{ org_id: string }>()
  const queryClient = useQueryClient()
  const { mutate, isPending } = useUpdateTouchPoint(org_id, row.original.id)
  return (
    <LoadingMask loading={isPending}>
      <Switch
        checked={row.original.enabled}
        onCheckedChange={(enabled) => {
          mutate(
            {
              data: {
                enabled: enabled,
              },
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: ['organizations', org_id, 'touch-points'],
                })
              },
            }
          )
        }}
      />
    </LoadingMask>
  )
}

export const ViewTouchPointAction = ({ row }: { row: TouchPointColumnDef }) => {
  return (
    <CustomDialog
      button={
        <div className="flex cursor-default items-center justify-center gap-2 rounded-[8px] min-h-10 min-w-10 text-sm bg-slate-100 hover:cursor-pointer hover:bg-neutral-500">
          <ScanEye className="w-[18px]! h-[18px]!" />
        </div>
      }
      size="xs"
      noFooter
      title={t('common:actions.view') + ' ' + t('common:label.short_link')}
      className="flex justify-center items-center w-full"
    >
      {({ close }) => {
        return (
          <div className="w-full flex flex-col justify-center items-center gap-6">
            <Separator />
            <div className="w-full p-4 bg-slate-100 flex flex-col gap-3 items-center justify-center rounded-[8px]">
              <span>{row.short_url}</span>
              <Button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(row.short_url)
                  toast({
                    title: t('common:toast.title_copy'),
                    description: t('common:toast.description_copy', {
                      field: '$t(label.short_link)',
                    }),
                    variant: 'success',
                  })
                }}
                iconLeft={<CopyIcon className="cursor-pointer" />}
              >
                {t('common:actions.copy') + ' ' + t('common:label.link')}
              </Button>
            </div>
          </div>
        )
      }}
    </CustomDialog>
  )
}

export const ViewTouchPointQrAction = ({
  row,
  size = 180,
}: {
  row: TouchPointColumnDef
  size?: number
}) => {
  const handleCopyQr = async () => {
    const options: Options = {
      ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
      ...(row.qr_customize_options as Options),
      type: 'canvas',
      width: 512,
      height: 512,
    }
    const rawData = await new QRCodeStyling(options).getRawData('png')
    if (!rawData) return
    const imageBlob = new Blob([toBlobPart(rawData)], { type: 'image/png' })
    navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })])
    toast({
      title: t('common:toast.title_copy'),
      description: t('common:toast.description_copy', {
        field: '$t(label.qr_code)',
      }),
      variant: 'success',
    })
  }

  return (
    <CustomDialog
      button={
        <div className="flex cursor-default items-center justify-center gap-2 rounded-[8px] min-h-10 min-w-10 max-w-10 text-sm bg-slate-100 hover:cursor-pointer hover:bg-neutral-500">
          <ScanEye className="w-[18px]! h-[18px]! text-primary" />
        </div>
      }
      size="xs"
      noFooter
      title={t('common:text.preview_field', { field: 'QR Code' })}
      className="flex justify-center items-center w-full"
    >
      {({ close }) => {
        return (
          <div className="w-full flex flex-col justify-center items-center gap-6">
            <Separator />
            <div className="w-full flex flex-col gap-4 items-center justify-center rounded-[8px]">
              <QrRenderPreview row={row} size={180} />
              <div className="flex flex-row gap-4 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild className="w-fit">
                    <button className="px-4 py-2 flex cursor-default items-center justify-center gap-2 rounded-[8px] min-h-10 min-w-10 text-sm text-white bg-primary">
                      <DownloadIcon className="w-[18px]! h-[18px]!" />
                      {t('common:actions.download')}
                      <ChevronDownIcon className="w-[18px]! h-[18px]!" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="bg-background rounded-[8px] px-4 py-3 border border-slate-200"
                    sideOffset={0}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      {availableQrOptions.map((option) => (
                        <div
                          className="flex flex-col w-full"
                          key={option.id}
                          onClick={() =>
                            handleDownloadQrCode(
                              row.qr_customize_options as ExtendedOptions,
                              row.name,
                              row.short_code || '',
                              {
                                fileType: option.fileType as FileExtension,
                                fileSize: option.fileSize,
                              }
                            )
                          }
                        >
                          {option.spacer && <Separator className="mb-2" />}
                          <div className="flex gap-2 px-2 py-1 items-center cursor-pointer hover:bg-slate-100 hover:rounded-[8px]">
                            <div className="text-sm font-medium text-slate-700 uppercase">
                              {option.fileType}
                            </div>
                            {option.fileSize && option.fileType != 'svg' && (
                              <div className="text-sm text-slate-500">
                                {option.fileSize} x {option.fileSize}
                              </div>
                            )}
                            {option.note && (
                              <Badge
                                variant="outline"
                                className="text-[10px] italic font-medium leading-[16px] text-blue-600 py-[2px] px-2 gap-[10px] flex items-center justify-center rounded-full bg-blue-50 border-none outline-hidden shadow-none"
                              >
                                {t(option.note)}
                              </Badge>
                            )}
                            {option.sizeInText && (
                              <div className="text-sm text-slate-500">{option.sizeInText}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant={'secondary'}
                  iconLeft={<CopyIcon />}
                  onClick={handleCopyQr}
                  type="button"
                >
                  {t('common:actions:copy')}
                </Button>
              </div>
            </div>
          </div>
        )
      }}
    </CustomDialog>
  )
}

export const DownloadQrPoppover = ({ row }: { row: TouchPointColumnDef }) => {
  return (
    <Popover>
      <PopoverTrigger asChild className="w-full">
        <div className="flex cursor-default items-center justify-center gap-2 rounded-[8px] min-h-10 min-w-10 max-w-10 text-sm bg-slate-100 hover:cursor-pointer hover:bg-neutral-500">
          <DownloadIcon className="w-5! h-5! text-primary" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background rounded-[8px] px-4 py-3 border border-slate-200"
        sideOffset={0}
      >
        <div className="grid grid-cols-1 gap-2">
          {availableQrOptions.map((option) => (
            <div
              className="flex flex-col w-full"
              key={option.id}
              onClick={() =>
                handleDownloadQrCode(
                  row.qr_customize_options as ExtendedOptions,
                  row.name,
                  row.short_code || '',
                  {
                    fileType: option.fileType as FileExtension,
                    fileSize: option.fileSize,
                  }
                )
              }
            >
              {option.spacer && <Separator className="mb-2" />}
              <div className="flex gap-2 px-2 py-1 items-center cursor-pointer hover:bg-slate-100 hover:rounded-[8px]">
                <div className="text-sm font-medium text-slate-700 uppercase">
                  {option.fileType}
                </div>
                {option.fileSize && option.fileType != 'svg' && (
                  <div className="text-sm text-slate-500">
                    {option.fileSize} x {option.fileSize}
                  </div>
                )}
                {option.note && (
                  <Badge
                    variant="outline"
                    className="text-[10px] italic font-medium leading-[16px] text-blue-600 py-[2px] px-2 gap-[10px] flex items-center justify-center rounded-full bg-blue-50 border-none outline-hidden shadow-none"
                  >
                    {t(option.note)}
                  </Badge>
                )}
                {option.sizeInText && (
                  <div className="text-sm text-slate-500">{option.sizeInText}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const QrRenderPreview = ({
  row,
  size = 80,
}: {
  row: TouchPointColumnDef
  size?: number
}) => {
  return (
    <div
      className={cn(
        `flex relative w-[${size}px] h-[${size}px] min-w-[${size}px] min-h-[${size}px]`
      )}
    >
      {row.path_qr_code ? (
        <Image
          src={row.path_qr_code}
          alt=""
          className={`flex max-w-[${size}px] max-h-[${size}px]`}
          fill={true}
        />
      ) : (
        <QrRenderWithRef
          size={size}
          qrOptions={
            (row.qr_customize_options as ExtendedOptions) ||
            ({
              ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
              data: `${process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${row.short_code}?t=1`,
            } as Options)
          }
          border={false}
          className={`p-0 flex max-w-[${size}px] max-h-[${size}px]`}
        />
      )}
    </div>
  )
}

export const RemoveTouchPointFromTag = ({ row }: { row: TouchPointColumnDef }) => {
  const { org_id, tag_id }: { org_id: string; tag_id: string } = useParams()
  const { mutate: removeTagFromTouchPoint, isPending: isRemovingTag } =
    useBulkDeleteTouchPointFromTag(org_id, tag_id)

  return (
    <CustomDialog
      size="xs"
      title={t('common:buttons.remove_field', {
        field: t('common:module.touchpoint'),
      })}
      button={
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="text-slate-500 font-medium"
        >
          {t('common:buttons.remove_field', { field: '' })}
          <DropdownMenuShortcut>
            {isRemovingTag ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2Icon className="h-4 w-4" />
            )}
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      }
      children={({ close }) => (
        <div>
          <p className="text-sm font-normal text-slate-600">
            {t('common:messages.remove_dialog', {
              field: '',
            })}
          </p>
          <div className="mt-4 flex justify-end gap-6">
            <Button
              type="button"
              variant="secondary"
              onClick={close}
              className="gap-[6px] text-slate-600"
            >
              {t('common:buttons.cancel')}
            </Button>
            <LoadingButton
              isLoading={isRemovingTag}
              variant="destructive"
              onClick={() => {
                removeTagFromTouchPoint([row.id], {
                  onSuccess: () => {
                    close()
                  },
                })
              }}
            >
              <Trash2Icon className="h-4 w-4" />
              {t('common:buttons.remove_field', { field: '' })}
            </LoadingButton>
          </div>
        </div>
      )}
      noFooter
    />
  )
}

export const CopyTouchPoint = ({ row }: { row: TouchPointColumnDef }) => {
  const handleCopyQr = async () => {
    const options: Options = {
      ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
      ...(row.qr_customize_options as Options),
      type: 'canvas',
      width: 512,
      height: 512,
    }
    const rawData = await new QRCodeStyling(options).getRawData('png')
    if (!rawData) return
    const imageBlob = new Blob([toBlobPart(rawData)], { type: 'image/png' })
    navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })])
    toast({
      title: t('common:toast.title_copy'),
      description: t('common:toast.description_copy', {
        field: '$t(label.qr_code)',
      }),
      variant: 'success',
    })
  }
  return (
    <Button
      variant={'outline'}
      onClick={handleCopyQr}
      type="button"
      className="border-none items-center justify-center gap-2 rounded-[8px] min-h-10 min-w-10 max-w-10 text-sm bg-slate-100 hover:cursor-pointer hover:bg-neutral-500"
    >
      <CopyIcon className="!w-5 !h-5" />
    </Button>
  )
}
