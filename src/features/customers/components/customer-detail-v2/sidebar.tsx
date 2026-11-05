'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Calendar, Monitor, Smartphone, Tablet, Globe } from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'
import { countryCodeToFlag, formatLocation } from '@/shared/lib/location'
import { parseUserAgent } from '@/shared/lib/user-agent'
import type { CustomerProfile } from '../../types'
import type { FirstVisitInfo } from '../../hooks/queries'

function BrowserIcon({ browser }: { browser: string }) {
  const b = browser.toLowerCase()
  let src = ''
  if (b.includes('firefox')) src = '/assets/icons/firefox.svg'
  else if (b.includes('safari')) src = '/assets/icons/safari.svg'
  else if (b.includes('edge')) src = '/assets/icons/ms-edge.svg'
  else if (b.includes('opera')) src = '/assets/icons/opera.svg'
  else if (b.includes('brave')) src = '/assets/icons/brave.svg'
  else if (b.includes('chrome')) src = '/assets/icons/chrome.svg'
  else
    return (
      <Globe
        className="h-[18px] w-[18px] text-foreground dark:text-slate-200 shrink-0"
        strokeWidth={1.5}
      />
    )
  return <Image src={src} alt={browser} width={18} height={18} className="shrink-0" />
}

function OSIcon({ os }: { os: string }) {
  const o = os.toLowerCase()
  let src = ''
  if (o.includes('window')) src = '/assets/icons/windows.svg'
  else if (o.includes('mac') || o.includes('ios')) src = '/assets/icons/apple.svg'
  else if (o.includes('android')) src = '/assets/icons/android.svg'
  else if (o.includes('ubuntu')) src = '/assets/icons/ubuntu.svg'
  else if (o.includes('debian')) src = '/assets/icons/debian.svg'
  else if (o.includes('centos')) src = '/assets/icons/centos.svg'
  else if (o.includes('linux')) src = '/assets/icons/linux.svg'
  else
    return (
      <Globe
        className="h-[18px] w-[18px] text-foreground dark:text-slate-200 shrink-0"
        strokeWidth={1.5}
      />
    )
  return <Image src={src} alt={os} width={18} height={18} className="shrink-0" />
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 px-6">
      <h4 className="text-s font-semibold text-slate-700 dark:text-slate-300">{title}</h4>
      {children}
    </div>
  )
}

function TrafficRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="w-[90px] shrink-0 text-s text-foreground dark:text-slate-200">{label}</span>
      <span className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1 rounded-[6px] text-xs text-foreground dark:text-slate-200 truncate max-w-[120px]">
        {value}
      </span>
    </div>
  )
}

interface CustomerSidebarProps {
  customer: CustomerProfile
  firstVisit: FirstVisitInfo | null
}

export function CustomerSidebar({ customer, firstVisit }: CustomerSidebarProps) {
  const { t } = useTranslation('customers')

  const parsedUA = firstVisit?.userAgent ? parseUserAgent(firstVisit.userAgent) : null

  const DeviceIcon =
    parsedUA?.device?.type === 'mobile'
      ? Smartphone
      : parsedUA?.device?.type === 'tablet'
        ? Tablet
        : Monitor

  const hasLocation = !!(firstVisit?.country || firstVisit?.city)
  const hasDevice = !!(parsedUA?.os?.name || parsedUA?.browser?.name || parsedUA?.device?.type)
  const hasUtm = !!(firstVisit?.utmTags && Object.values(firstVisit.utmTags).some(Boolean))
  const hasTrafficSource = hasUtm || !!firstVisit?.referrer

  const flag = firstVisit?.country ? countryCodeToFlag(firstVisit.country) : null

  return (
    <div className="w-full lg:w-[252px] lg:shrink-0 flex flex-col gap-6">
      {/* Since */}
      <SidebarSection title={t('detail.sections.since', 'Since')}>
        <div className="flex gap-1 items-center">
          <Calendar
            className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500 shrink-0"
            strokeWidth={1.5}
          />
          <span className="text-s text-slate-500 dark:text-slate-400">
            {dayjs(customer.created_at).format('MMM D, YYYY')}
          </span>
        </div>
      </SidebarSection>

      {/* Location */}
      {hasLocation && (
        <SidebarSection title={t('detail.sections.location', 'Location')}>
          <div className="flex gap-2 items-start">
            {flag ? (
              <span className="text-xl leading-5 shrink-0">{flag}</span>
            ) : (
              <Globe className="h-5 w-5 text-slate-400 shrink-0" strokeWidth={1.5} />
            )}
            <span className="text-s text-foreground dark:text-slate-200">
              {formatLocation(firstVisit!.city, firstVisit!.region, firstVisit!.country, {
                showFlag: false,
              })}
            </span>
          </div>
        </SidebarSection>
      )}

      {/* Device Info */}
      {hasDevice && (
        <SidebarSection title={t('detail.sections.device', 'Device Info')}>
          <div className="flex flex-col gap-2">
            {parsedUA?.device?.type && parsedUA.device.type !== 'unknown' && (
              <div className="flex gap-2 items-center">
                <DeviceIcon
                  className="h-[18px] w-[18px] text-foreground dark:text-slate-200 shrink-0"
                  strokeWidth={1.5}
                />
                <span className="text-s text-foreground dark:text-slate-200 capitalize">
                  {parsedUA.device.type}
                </span>
              </div>
            )}
            {parsedUA?.browser?.name && (
              <div className="flex gap-2 items-center">
                <BrowserIcon browser={parsedUA.browser.name} />
                <span className="text-s text-foreground dark:text-slate-200">
                  {parsedUA.browser.name}
                  {parsedUA.browser.version ? ` ${parsedUA.browser.version}` : ''}
                </span>
              </div>
            )}
            {parsedUA?.os?.name && (
              <div className="flex gap-2 items-center">
                <OSIcon os={parsedUA.os.name} />
                <span className="text-s text-foreground dark:text-slate-200">
                  {parsedUA.os.name}
                  {parsedUA.os.version ? ` ${parsedUA.os.version}` : ''}
                </span>
              </div>
            )}
          </div>
        </SidebarSection>
      )}

      {/* Traffic Source */}
      {hasTrafficSource && (
        <SidebarSection title={t('detail.sections.traffic_source', 'Traffic Source')}>
          <div className="flex flex-col gap-2">
            {firstVisit?.referrer && (
              <TrafficRow label={t('detail.referrer', 'Referrer')} value={firstVisit.referrer} />
            )}
            {firstVisit?.utmTags?.utm_source && (
              <TrafficRow label="Source" value={firstVisit.utmTags.utm_source} />
            )}
            {firstVisit?.utmTags?.utm_medium && (
              <TrafficRow label="Medium" value={firstVisit.utmTags.utm_medium} />
            )}
            {firstVisit?.utmTags?.utm_campaign && (
              <TrafficRow label="Campaign" value={firstVisit.utmTags.utm_campaign} />
            )}
            {firstVisit?.utmTags?.utm_term && (
              <TrafficRow label="Term" value={firstVisit.utmTags.utm_term} />
            )}
            {firstVisit?.utmTags?.utm_content && (
              <TrafficRow label="Content" value={firstVisit.utmTags.utm_content} />
            )}
          </div>
        </SidebarSection>
      )}

      {/* Metadata */}
      {customer.metadata && Object.keys(customer.metadata).length > 0 && (
        <SidebarSection title={t('detail.metadata', 'Metadata')}>
          <div className="flex flex-col gap-2">
            {Object.entries(customer.metadata).map(([key, value]) => (
              <TrafficRow
                key={key}
                label={key}
                value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
              />
            ))}
          </div>
        </SidebarSection>
      )}
    </div>
  )
}
