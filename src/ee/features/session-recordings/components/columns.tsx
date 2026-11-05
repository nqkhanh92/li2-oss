'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { SessionRecording } from '../types'
import dayjs from '@/shared/lib/dayjs'
import { t } from 'i18next'
import { countryCodeToFlag } from '@/shared/lib/location/country-utils'
import { Badge } from '@/shared/components/ui/badge'
import { Monitor, Smartphone, Tablet, Globe } from 'lucide-react'
import Image from 'next/image'

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return '< 1s'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function DeviceIcon({ type, className }: { type: string | null; className?: string }) {
  const iconProps = { className: className || 'h-3.5 w-3.5 text-muted-foreground' }
  if (type === 'mobile') return <Smartphone {...iconProps} />
  if (type === 'tablet') return <Tablet {...iconProps} />
  return <Monitor {...iconProps} />
}

function BrowserIcon({ browser }: { browser: string | null }) {
  if (!browser) return <Globe className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
  const b = browser.toLowerCase()
  let src = '/assets/icons/chrome.svg'
  if (b.includes('firefox')) src = '/assets/icons/firefox.svg'
  else if (b.includes('safari')) src = '/assets/icons/safari.svg'
  else if (b.includes('edge')) src = '/assets/icons/ms-edge.svg'
  else if (b.includes('opera')) src = '/assets/icons/opera.svg'
  else if (b.includes('brave')) src = '/assets/icons/brave.svg'
  else if (b.includes('chrome')) src = '/assets/icons/chrome.svg'
  else return <Globe className="h-3.5 w-3.5 text-muted-foreground opacity-70" />

  return <Image src={src} alt={browser} width={14} height={14} className="opacity-70" />
}

function OSIcon({ os }: { os: string | null }) {
  if (!os) return <Globe className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
  const o = os.toLowerCase()
  let src = ''
  if (o.includes('window')) src = '/assets/icons/windows.svg'
  else if (o.includes('mac') || o.includes('ios')) src = '/assets/icons/apple.svg'
  else if (o.includes('android')) src = '/assets/icons/android.svg'
  else if (o.includes('ubuntu')) src = '/assets/icons/ubuntu.svg'
  else if (o.includes('debian')) src = '/assets/icons/debian.svg'
  else if (o.includes('centos')) src = '/assets/icons/centos.svg'
  else if (o.includes('linux')) src = '/assets/icons/linux.svg'
  else return <Globe className="h-3.5 w-3.5 text-muted-foreground opacity-70" />

  return <Image src={src} alt={os} width={14} height={14} className="opacity-70" />
}

export const sessionRecordingColumns: ColumnDef<SessionRecording>[] = [
  {
    accessorKey: 'started_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('session_recordings:columns.started_at')} className="pl-4" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-0 pl-4 py-2">
        <span className="font-medium text-xs whitespace-nowrap">
          {dayjs(row.original.started_at).format('MMM D, YYYY')}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {dayjs(row.original.started_at).format('HH:mm:ss')}
        </span>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'visitor_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('session_recordings:columns.visitor')} />
    ),
    cell: ({ row }) => (
      <div className="py-2">
        <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[100px] block" title={row.original.visitor_id}>
          {row.original.visitor_id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'session_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('session_recordings:columns.session')} />
    ),
    cell: ({ row }) => (
      <div className="py-2">
        <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[100px] block" title={row.original.session_id}>
          {row.original.session_id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'recording_duration_ms',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('session_recordings:columns.duration')} />
    ),
    cell: ({ row }) => (
      <div className="py-2">
        <span className="font-mono text-xs text-muted-foreground">
          {formatDuration(row.original.recording_duration_ms ?? row.original.duration_ms)}
        </span>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'entry_page',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('session_recordings:columns.entry_page')} />
    ),
    cell: ({ row }) => {
      const page = row.original.entry_page
      if (!page) return <span className="text-muted-foreground">-</span>
      try {
        const path = new URL(page).pathname || '/'
        return (
          <div className="py-2">
            <span className="text-xs truncate max-w-[150px] block text-muted-foreground" title={page}>
              {path}
            </span>
          </div>
        )
      } catch {
        return (
          <div className="py-2">
            <span className="text-xs truncate max-w-[150px] block text-muted-foreground" title={page}>
              {page}
            </span>
          </div>
        )
      }
    },
    enableSorting: false,
  },
  {
    id: 'session_info',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('session_recordings:columns.device')} />
    ),
    cell: ({ row }) => {
      const { device_type, browser, os, browser_version, os_version, country, city } = row.original
      return (
        <div className="flex items-start gap-4 py-1">
          {/* Column 1: Country & Device */}
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <div className="flex items-center gap-1 min-w-0" title={`${city ? city + ', ' : ''}${country || ''}`}>
              <span className="text-sm leading-none flex-shrink-0">
                {country ? countryCodeToFlag(country) : <Globe className="h-3 w-3 text-muted-foreground opacity-70" />}
              </span>
              <span className="text-[11px] font-medium truncate leading-none max-w-[100px]">
                {city || country || t('session_recordings:unknown')}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0" title={device_type || 'unknown'}>
              <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                <DeviceIcon type={device_type} className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] text-muted-foreground truncate leading-none max-w-[100px]">
                {device_type ? t(`session_recordings:device.${device_type}`) : t('session_recordings:unknown')}
              </span>
            </div>
          </div>

          {/* Column 2: Browser & OS */}
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <div className="flex items-center gap-1 min-w-0" title={`${browser || ''} ${browser_version || ''}`}>
              <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                <BrowserIcon browser={browser} />
              </div>
              <span className="text-[11px] font-medium truncate leading-none max-w-[100px]">
                {browser || t('session_recordings:unknown')}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0" title={`${os || ''} ${os_version || ''}`}>
              <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                <OSIcon os={os} />
              </div>
              <span className="text-[11px] text-muted-foreground truncate leading-none max-w-[100px]">
                {os || t('session_recordings:unknown')}
              </span>
            </div>
          </div>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    id: 'is_bounce',
    accessorKey: 'is_bounce',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('session_recordings:columns.bounce')} />
    ),
    cell: ({ row }) => (
      <div className="py-2">
        {row.original.is_bounce ? (
          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
            {t('session_recordings:bounce')}
          </Badge>
        ) : null}
      </div>
    ),
    enableSorting: false,
  },
]
