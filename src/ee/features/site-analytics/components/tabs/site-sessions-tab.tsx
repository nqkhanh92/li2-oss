'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SessionOverview } from '../session-overview'
import { SessionsOverTimeChart } from '../sessions/sessions-over-time-chart'
import { BreakdownList } from '../sessions/sessions-breakdown-list'
import { SessionsTopTable } from '../sessions/sessions-top-table'
import { useGetSessionAnalytics } from '../../hooks/queries'
import { ChannelFormulaInfo } from '@/shared/components/customize/channel-formula-info'

interface SiteSessionsTabProps {
  orgId: string
  fromStr: string
  toStr: string
  selectedPage: string | null
  selectedHostname: string | null
  totalSessions: number
  uniqueVisitors: number
  bounceRate: number | null
  avgDurationSec: number | null
  title?: string
}

export function SiteSessionsTab({
  orgId,
  fromStr,
  toStr,
  selectedPage,
  selectedHostname,
  totalSessions,
  uniqueVisitors,
  bounceRate,
  avgDurationSec,
  title,
}: SiteSessionsTabProps) {
  const { t } = useTranslation('site-analytics')
  const { data, isLoading } = useGetSessionAnalytics(
    orgId,
    fromStr,
    toStr,
    selectedHostname,
    selectedPage,
  )

  const deviceItems = useMemo(
    () => (data?.by_device ?? []).map((d) => ({ name: d.device_type, count: d.count })),
    [data],
  )
  const browserItems = useMemo(
    () => (data?.by_browser ?? []).map((d) => ({ name: d.browser, count: d.count })),
    [data],
  )
  const osItems = useMemo(
    () => (data?.by_os ?? []).map((d) => ({ name: d.os, count: d.count })),
    [data],
  )
  const countryItems = useMemo(
    () => (data?.by_country ?? []).map((d) => ({ name: d.country, count: d.count })),
    [data],
  )
  const referrerItems = useMemo(
    () => (data?.by_referrer ?? []).map((d) => ({ name: d.referrer_domain, count: d.count })),
    [data],
  )
  const utmItems = useMemo(
    () => (data?.by_utm_source ?? []).map((d) => ({ name: d.utm_source, count: d.count })),
    [data],
  )
  const channelItems = useMemo(
    () => (data?.by_channel ?? []).map((d) => ({ name: d.channel, count: d.count })),
    [data],
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Metric cards */}
      <SessionOverview
        totalSessions={totalSessions}
        uniqueVisitors={uniqueVisitors}
        bounceRate={bounceRate}
        avgDurationSec={avgDurationSec}
        title={title}
      />

      {/* Sessions over time */}
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">{t('sessions.sessionsOverTime')}</p>
        <SessionsOverTimeChart data={data?.by_date ?? []} isLoading={isLoading} />
      </div>

      {/* Device / Browser / OS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">{t('sessions.deviceType')}</p>
          <BreakdownList items={deviceItems} isLoading={isLoading} emptyText={t('sessions.noDeviceData')} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">{t('sessions.browser')}</p>
          <BreakdownList items={browserItems} isLoading={isLoading} emptyText={t('sessions.noBrowserData')} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">{t('sessions.operatingSystem')}</p>
          <BreakdownList items={osItems} isLoading={isLoading} emptyText={t('sessions.noOsData')} />
        </div>
      </div>

      {/* Channel */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <p className="text-sm font-semibold">{t('sessions.marketingChannel')}</p>
          <ChannelFormulaInfo side="top" />
        </div>
        <BreakdownList items={channelItems} isLoading={isLoading} emptyText={t('sessions.noChannelData')} />
      </div>

      {/* Country / Referrer / UTM */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">{t('sessions.topCountries')}</p>
          <SessionsTopTable
            items={countryItems}
            isLoading={isLoading}
            showFlag
            emptyText={t('sessions.noCountryData')}
          />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">{t('sessions.topReferrers')}</p>
          <SessionsTopTable
            items={referrerItems}
            isLoading={isLoading}
            emptyText={t('sessions.noReferrerData')}
          />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">{t('sessions.utmSources')}</p>
          <SessionsTopTable
            items={utmItems}
            isLoading={isLoading}
            emptyText={t('sessions.noUtmSourceData')}
          />
        </div>
      </div>
    </div>
  )
}
