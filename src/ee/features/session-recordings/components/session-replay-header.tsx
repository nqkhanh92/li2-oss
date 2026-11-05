'use client'

import { Monitor, Smartphone, Tablet, Globe, Clock, ArrowRight, ExternalLink, Tag } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { countryCodeToFlag } from '@/shared/lib/location/country-utils'
import dayjs from '@/shared/lib/dayjs'
import type { SessionDetail } from '../types'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'

interface SessionReplayHeaderProps {
  session: SessionDetail
  ip: string | null
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return '< 1s'
  const s = Math.floor((ms / 1000) % 60)
  const m = Math.floor(ms / 60000)
  return m === 0 ? `${s}s` : `${m}m ${s}s`
}

function toPath(url: string | null): string | null {
  if (!url) return null
  try { return new URL(url).pathname || '/' } catch { return url }
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

  return <Image src={src} alt={browser} width={14} height={14} className="opacity-70 shrink-0" />
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

  return <Image src={src} alt={os} width={14} height={14} className="opacity-70 shrink-0" />
}

function Dot() {
  return <span className="text-muted-foreground/40 select-none">·</span>
}

function Field({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-baseline gap-1.5 min-w-0 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">{label}</span>
      <span className="text-xs font-medium truncate">{value}</span>
    </div>
  )
}

export function SessionReplayHeader({ session, ip }: SessionReplayHeaderProps) {
  const { t } = useTranslation('session_recordings')
  
  const utms = [
    { label: 'Source', value: session.utm_source },
    { label: 'Medium', value: session.utm_medium },
    { label: 'Campaign', value: session.utm_campaign },
    { label: 'Term', value: session.utm_term },
    { label: 'Content', value: session.utm_content },
    { label: 'ID', value: session.utm_id },
  ].filter((u) => u.value)

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Primary Section */}
      <div className="px-4 py-3 border-b flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Time & Duration */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">Started</span>
            <span className="text-xs font-medium leading-none whitespace-nowrap">{dayjs(session.started_at).format('MMM D, YYYY HH:mm:ss')}</span>
          </div>
          {session.ended_at && (
            <>
              <div className="h-6 w-px bg-border self-center" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">Exited</span>
                <span className="text-xs font-medium leading-none whitespace-nowrap">{dayjs(session.ended_at).format('MMM D, YYYY HH:mm:ss')}</span>
              </div>
            </>
          )}
          <div className="h-6 w-px bg-border self-center" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">Duration</span>
            <div className="flex items-center gap-1.5 leading-none mt-0.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{formatDuration(session.recording_duration_ms ?? session.duration_ms)}</span>
              {session.is_bounce && <Badge variant="secondary" className="text-[10px] h-3.5 px-1 font-normal ml-1">Bounce</Badge>}
            </div>
          </div>
        </div>

        {/* Journey */}
        {(session.entry_page || session.exit_page) && (
          <div className="flex flex-col gap-1 min-w-0 max-w-[300px]">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">Journey</span>
            <div className="flex items-center gap-1 font-medium min-w-0 mt-0.5">
              <span className="truncate text-[11px]" title={session.entry_page ?? ''}>{toPath(session.entry_page) ?? '–'}</span>
              {session.exit_page && session.exit_page !== session.entry_page && (
                <>
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate text-[11px]" title={session.exit_page}>{toPath(session.exit_page)}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Location */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">Location</span>
          <div className="flex items-center gap-1.5 leading-none mt-0.5">
            <span className="text-base leading-none">
              {session.country ? countryCodeToFlag(session.country) : '🌍'}
            </span>
            <span className="text-xs font-medium">
              {[session.city, session.country].filter(Boolean).join(', ') || t('unknown')}
            </span>
          </div>
        </div>

        {/* Device Info */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">Device / OS / Browser</span>
          <div className="flex items-center gap-4 mt-0.5">
            <div className="flex items-center gap-1.5" title={session.device_type || 'unknown'}>
              <DeviceIcon type={session.device_type} />
              <span className="text-xs font-medium capitalize">{session.device_type || t('unknown')}</span>
            </div>
            <div className="flex items-center gap-1.5" title={`${session.os} ${session.os_version || ''}`}>
              <OSIcon os={session.os} />
              <span className="text-xs font-medium">{session.os || t('unknown')}</span>
            </div>
            <div className="flex items-center gap-1.5" title={`${session.browser} ${session.browser_version || ''}`}>
              <BrowserIcon browser={session.browser} />
              <span className="text-xs font-medium">
                {[session.browser, session.browser_version].filter(Boolean).join(' ') || t('unknown')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Section: IDs, Referrer, IP */}
      <div className="px-4 py-2 bg-muted/30 flex flex-wrap items-center gap-x-6 gap-y-2 border-b">
        <Field label="Visitor" value={<span className="font-mono text-xs">{session.visitor_id}</span>} />
        <Field label="Session" value={<span className="font-mono text-xs">{session.session_id}</span>} />
        {ip && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">IP</span>
            <span className="text-xs font-mono">{ip}</span>
          </div>
        )}
        {session.referrer && (
          <div className="flex items-center gap-1.5 min-w-0 flex-1 max-w-[400px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">Referrer</span>
            <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate" title={session.referrer}>{session.referrer}</span>
            </div>
          </div>
        )}
      </div>

      {/* UTM Section */}
      {utms.length > 0 && (
        <div className="px-4 py-2 bg-muted/10 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">UTM Parameters</span>
          </div>
          {utms.map((u) => (
            <div key={u.label} className="flex items-center gap-1.5 bg-background border rounded px-1.5 py-0.5">
              <span className="text-[9px] uppercase font-bold text-muted-foreground/70">{u.label}</span>
              <span className="text-[11px] font-medium">{u.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
