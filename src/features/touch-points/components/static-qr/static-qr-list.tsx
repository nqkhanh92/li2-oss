'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import {
  CalendarFoldIcon,
  Plus,
  EllipsisVertical,
  Edit,
  Trash,
  FileText,
  Link,
  Wifi,
  Lock,
  ScanLine,
  Download,
  Settings,
} from 'lucide-react'
import { useGetStaticQrs } from '@/features/touch-points/hooks/static-qr/queries'
import {
  useBulkDeleteStaticQr,
  useDeleteStaticQr,
} from '@/features/touch-points/hooks/static-qr/mutations'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import type { StaticQrItem } from './static-qr.types'
import { useFilters } from '@/shared/hooks/use-filters'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useState, memo } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { QrRenderWithRef, DownloadQrPopover } from '@/features/bootstrap/components/qr-render'
import dayjs from '@/shared/lib/dayjs'
import { Loader2 } from 'lucide-react'
import { Pagination } from '@/shared/components/customize/pagination'
import { cn } from '@/shared/lib/utils'

// ─── helpers ────────────────────────────────────────────────────────────────

const getQrData = (item: StaticQrItem): string => {
  const { payload } = item
  if (!payload) return ''
  if (payload.type === 'text') return payload.text || ''
  if (payload.type === 'url') return payload.url || ''
  if (payload.type === 'wifi') {
    const { ssid = '', password = '', security, hidden } = payload.wifi ?? {}
    return `WIFI:T:${security ?? (password ? 'WPA' : 'nopass')};S:${ssid};P:${password};H:${hidden ? 'true' : 'false'};;`
  }
  return ''
}

const getHumanReadableValue = (item: StaticQrItem): string => {
  const { payload } = item
  if (!payload) return '-'
  if (payload.type === 'text') return payload.text || '-'
  if (payload.type === 'url') return payload.url || '-'
  if (payload.type === 'wifi') {
    const ssid = payload.wifi?.ssid || ''
    const security = payload.wifi?.security || 'nopass'
    return ssid ? `${ssid} (${security.toUpperCase()})` : '-'
  }
  return '-'
}

// ─── sub-components ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; bg: string; border: string; text: string }
> = {
  text: {
    icon: FileText,
    label: 'Text',
    bg: 'bg-blue-50',
    border: 'border-blue-600',
    text: 'text-blue-600',
  },
  url: {
    icon: Link,
    label: 'URL',
    bg: 'bg-green-50',
    border: 'border-green-600',
    text: 'text-green-600',
  },
  wifi: {
    icon: Wifi,
    label: 'Wifi',
    bg: 'bg-purple-50',
    border: 'border-purple-600',
    text: 'text-purple-600',
  },
}

const TypeBadge = ({ type }: { type: string }) => {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.text
  const Icon = cfg.icon
  return (
    <div
      className={cn(
        'flex items-center gap-1 pl-3 pr-4 py-1 rounded-full border-[0.5px] shrink-0',
        cfg.bg,
        cfg.border
      )}
    >
      <Icon className={cn('size-[18px]', cfg.text)} />
      <span className={cn('text-sm font-medium whitespace-nowrap', cfg.text)}>{cfg.label}</span>
    </div>
  )
}

const QrPreview = memo(
  ({ qrOptions }: { qrOptions: any }) => {
    delete qrOptions?.qrOptions?.typeNumber
    return (
      <div className="shrink-0 flex items-center justify-center overflow-hidden">
        <QrRenderWithRef size={90} qrOptions={qrOptions} border={false} className="p-2 flex" />
      </div>
    )
  },
  (prev, next) => JSON.stringify(prev.qrOptions) === JSON.stringify(next.qrOptions)
)
QrPreview.displayName = 'QrPreview'

// ─── main component ──────────────────────────────────────────────────────────

export const StaticQrList = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const { t } = useTranslation(['common'])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { pagination, setPagination, sorting, filters, search, setFilter, setSearch } = useFilters({
    pagination: { pageIndex: 0, pageSize: 10 },
    search: '',
    sorting: [{ id: 'created_at', desc: true }],
  })

  const { data, isLoading } = useGetStaticQrs(org_id, { pagination, search, sorting, filters })
  const { mutateAsync: deleteStaticQr } = useDeleteStaticQr(org_id)
  const { mutate: bulkDelete, isPending: isBulkDeleting } = useBulkDeleteStaticQr(org_id)
  const { confirm } = useConfirmDialog()

  const items = data?.data ?? []

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map((i) => i.id)))
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const onBulkDelete = () => {
    const ids = Array.from(selectedIds)
    confirm({
      title: t('common:buttons.delete', { field: 'Static QR' }),
      description: t('common:messages.delete_dialog', {
        field: `${ids.length} Static QR${ids.length > 1 ? 's' : ''}`,
      }),
      confirmButtonText: t('common:buttons.delete', { field: '' }),
      cancelButtonText: t('common:buttons.cancel'),
      onConfirm: () => {
        bulkDelete(ids)
        setSelectedIds(new Set())
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <DataFilterItem
            name="search"
            placeholder={t('common:filter.search_by_name')}
            type="search"
            setSearch={setSearch}
            search={search}
            className="w-[250px]"
          />
          <DataFilterItem
            name="created_at"
            label={t('common:filter.search_by_created_at')}
            placeholder={t('common:filter.search_by_created_at')}
            type="date_range"
            setFilter={setFilter}
            filters={filters}
            Icon={CalendarFoldIcon}
          />
        </div>
        <Button
          size="default"
          variant="default"
          iconLeft={<Plus />}
          onClick={() => router.push(`/org/${org_id}/touch-points/qr-code/static/create`)}
        >
          {t('common:buttons.create', { field: 'Static QR' })}
        </Button>
      </div>

      {/* ── Table header ── */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b-2 border-slate-50 h-9">
        <div className="flex items-center justify-center pl-2">
          <Checkbox
            checked={
              items.length > 0 && selectedIds.size === items.length
                ? true
                : selectedIds.size > 0
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={toggleSelectAll}
          />
        </div>

        {selectedIds.size > 0 ? (
          <LoadingButton
            type="button"
            onClick={onBulkDelete}
            size="icon"
            variant="ghost"
            isLoading={isBulkDeleting}
          >
            <Trash className="size-[18px]" />
          </LoadingButton>
        ) : null}

        <span className="flex-1 px-2 text-sm font-medium text-slate-500">
          {selectedIds.size === 0
            ? t('common:text.select_all')
            : t('common:text.selected_n', { count: selectedIds.size })}
        </span>

        <button className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
          <Settings className="size-4" />
        </button>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="animate-spin size-6 text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-sm text-slate-400">
          {t('common:text.no_data', { defaultValue: 'No data' })}
        </div>
      ) : (
        <div className="flex flex-col gap-[14px]">
          {items.map((item) => {
            const qrData = getQrData(item)
            const qrOptions = { ...(item.qr_customize_options ?? {}), data: qrData }
            const scanCount = (item as any).scan_count ?? null

            // shared dropdown used in both mobile top-bar and desktop actions
            const ItemDropdown = () => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center p-[9px] border border-slate-200 rounded-[6px] hover:bg-slate-50 transition-colors"
                  >
                    <EllipsisVertical className="size-[18px] text-slate-600" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/org/${org_id}/touch-points/qr-code/static/${item.id}/edit`)
                    }
                  >
                    <Edit className="mr-2 size-4" />
                    {t('common:buttons.edit', { field: '' })}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() =>
                      confirm({
                        title: t('common:buttons.delete', { field: 'Static QR' }),
                        description: t('common:messages.delete_dialog', {
                          field: item.name,
                        }),
                        onConfirm: () => {
                          deleteStaticQr(item.id)
                        },
                      })
                    }
                  >
                    <Trash className="mr-2 size-4" />
                    {t('common:buttons.delete', { field: '' })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-300 rounded-[8px] hover:bg-slate-50/50 transition-colors overflow-hidden"
              >
                {/* ── Main row ── */}
                <div className="flex items-center gap-2 pl-2 pr-3 lg:pr-4 py-3 lg:py-4">
                  {/* Checkbox */}
                  <div className="flex items-center justify-center shrink-0 px-1">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </div>

                  {/* QR thumbnail */}
                  <QrPreview qrOptions={qrOptions} />

                  {/* Text content */}
                  <div className="flex flex-1 min-w-0 items-center gap-9 px-2">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <p className="text-[15px] font-medium leading-[22px] text-foreground truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Lock className="size-4 text-slate-500 shrink-0" />
                        <p className="text-sm text-slate-500 truncate leading-5">
                          {getHumanReadableValue(item)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="size-4 rounded-full bg-slate-300 shrink-0" />
                        <p className="text-xs text-slate-500 leading-4">
                          {dayjs(item.created_at).format('MMM D, YYYY')}
                        </p>
                      </div>
                    </div>

                    {/* Desktop: TypeBadge + Actions */}
                    <div className="hidden lg:flex items-center gap-9 shrink-0">
                      <TypeBadge type={item.payload?.type || 'text'} />
                      <div className="flex items-center gap-3">
                        {scanCount !== null && (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-secondary-blue text-base font-medium px-3 py-2 rounded-[6px] hover:bg-blue-50 transition-colors"
                          >
                            <ScanLine className="size-[18px]" />
                            {scanCount} {t('common:label.scans', { defaultValue: 'Scans' })}
                          </button>
                        )}
                        <DownloadQrPopover
                          qrOptions={qrOptions as any}
                          popoverAlign="end"
                          button={
                            <button
                              type="button"
                              className="flex items-center justify-center p-[9px] border border-slate-200 rounded-[6px] hover:bg-slate-50 transition-colors"
                            >
                              <Download className="size-[18px] text-slate-600" />
                            </button>
                          }
                        />
                        <ItemDropdown />
                      </div>
                    </div>

                    {/* Mobile: just kebab in the top row */}
                    <div className="flex lg:hidden shrink-0 self-start pt-0.5">
                      <ItemDropdown />
                    </div>
                  </div>
                </div>

                {/* ── Mobile bottom strip ── */}
                <div className="flex lg:hidden items-center justify-between px-4 py-2.5 border-t border-slate-100 gap-2">
                  <TypeBadge type={item.payload?.type || 'text'} />
                  <div className="flex items-center gap-2">
                    {scanCount !== null && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-secondary-blue text-sm font-medium px-2 py-1.5 rounded-[6px] hover:bg-blue-50 transition-colors"
                      >
                        <ScanLine className="size-4" />
                        {scanCount} {t('common:label.scans', { defaultValue: 'Scans' })}
                      </button>
                    )}
                    <DownloadQrPopover
                      qrOptions={qrOptions as any}
                      popoverAlign="end"
                      button={
                        <button
                          type="button"
                          className="flex items-center justify-center p-2 border border-slate-200 rounded-[6px] hover:bg-slate-50 transition-colors"
                        >
                          <Download className="size-4 text-slate-600" />
                        </button>
                      }
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && data && (
        <Pagination
          pageSize={pagination.pageSize}
          pageIndex={pagination.pageIndex}
          rowCount={data.rowCount || 0}
          onPageChange={(index) => setPagination((prev) => ({ ...prev, pageIndex: index }))}
          onPageSizeChange={(size) => setPagination((prev) => ({ ...prev, pageSize: size }))}
          availablePageSize={[10, 20, 50, 100]}
        />
      )}
    </div>
  )
}
