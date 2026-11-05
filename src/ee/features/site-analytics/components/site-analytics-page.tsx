'use client'

import { useMemo, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Globe,
  ExternalLink,
  Lock,
  Unlock,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { SitePageTreeSidebar } from './site-page-tree-sidebar'
import { SiteClicksTab } from './tabs/site-clicks-tab'
import { SiteScrollTab } from './tabs/site-scroll-tab'
import { SiteSessionsTab } from './tabs/site-sessions-tab'
import { SiteFormTab } from './tabs/site-form-tab'
import { useGetSitePages, useGetSitePageSessions } from '../hooks/queries'
import { useGetAnalyticsSettings } from '@/features/analytics-settings/hooks/queries'
import { useVerifyWindow } from '@/features/analytics-settings/components/link-attribution-onboarding-v2/step-conversion-tracking/hooks/use-verify-window'
import { FeatureUpgradeSection } from '@/shared/components/customize/feature-upgrade-section'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import dayjs from '@/shared/lib/dayjs'
import { useDemoMode } from '@/shared/hooks/use-demo-mode'

function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ── Validate Script Button ───────────────────────────────────────────────────

interface SdkReport {
  sdkInstalled: boolean
  publishableKey?: string
}

type ValidateStatus = 'idle' | 'success' | 'fail'

interface ValidateScriptButtonProps {
  url: string
  publishableKey?: string
  status: ValidateStatus
  onStatusChange: (status: ValidateStatus) => void
}

function ValidateScriptButton({
  url,
  publishableKey,
  status,
  onStatusChange,
}: ValidateScriptButtonProps) {
  const { t } = useTranslation('site-analytics')
  const { open, isWaiting } = useVerifyWindow<SdkReport>({
    filterMessage: (data) => {
      if (data && typeof data === 'object' && (data as Record<string, unknown>).sdkInstalled) {
        return data as SdkReport
      }
      return null
    },
    onSuccess: ({ publishableKey: detected }) => {
      if (!publishableKey) {
        onStatusChange(detected ? 'success' : 'fail')
      } else {
        onStatusChange(detected === publishableKey ? 'success' : 'fail')
      }
    },
    onClose: () => onStatusChange('fail'),
    timeoutMs: 15_000,
  })

  const handleValidate = () => {
    onStatusChange('idle')
    open(url)
  }

  if (isWaiting) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t('url_bar.validate_checking')}
      </Button>
    )
  }

  if (status === 'success') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleValidate}
        className="gap-1.5 border-semantic-success/40 bg-semantic-success/5 text-semantic-success hover:bg-semantic-success/10 text-xs"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t('url_bar.validate_success')}
        <RefreshCw className="h-3 w-3 opacity-50" />
      </Button>
    )
  }

  if (status === 'fail') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleValidate}
        className="gap-1.5 border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 text-xs"
      >
        <XCircle className="h-3.5 w-3.5" />
        {t('url_bar.validate_fail')}
        <RefreshCw className="h-3 w-3 opacity-50" />
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={handleValidate} className="gap-1.5 text-xs">
      <ShieldCheck className="h-3.5 w-3.5" />
      {t('url_bar.validate_idle')}
    </Button>
  )
}

// ── Page URL Bar ─────────────────────────────────────────────────────────────

function PageUrlBar({
  url,
  scheme,
  hostname,
  pagePath,
  publishableKey,
  validateStatus,
  onValidateStatusChange,
  isNonRecent,
}: {
  url: string
  scheme: string
  hostname: string
  pagePath: string | null
  publishableKey?: string
  validateStatus: ValidateStatus
  onValidateStatusChange: (s: ValidateStatus) => void
  isNonRecent: boolean
}) {
  const { t } = useTranslation('site-analytics')
  const isHttps = scheme === 'https'

  return (
    <div className="flex flex-col gap-0 rounded-xl border bg-card overflow-hidden">
      {/* Address row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-1 min-w-0 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
          {isHttps ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-semantic-success" />
          ) : (
            <Unlock className="h-3.5 w-3.5 shrink-0 text-semantic-warning" />
          )}
          <div className="flex min-w-0 flex-1 items-center text-xs">
            <span className="shrink-0 text-muted-foreground">{scheme}://</span>
            <span className="shrink-0 font-semibold text-foreground">{hostname}</span>
            {pagePath ? (
              <span className="truncate text-muted-foreground">{pagePath}</span>
            ) : (
              <span className="ml-1.5 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t('url_bar.all_pages')}
              </span>
            )}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted transition-colors"
            title={t('url_bar.open_tab')}
          >
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>

        <ValidateScriptButton
          url={url}
          publishableKey={publishableKey}
          status={validateStatus}
          onStatusChange={onValidateStatusChange}
        />
      </div>

      {/* No-recent-data alert */}
      {isNonRecent && (
        <div className="flex items-center gap-2.5 border-t border-semantic-warning/20 bg-semantic-warning/8 px-3.5 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-semantic-warning" />
          <p className="text-[11px] text-muted-foreground">
            {t('url_bar.no_recent_title')}.{' '}
            {pagePath !== null ? t('url_bar.no_recent_page') : t('url_bar.no_recent_domain')}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function SiteAnalyticsPage({ blocked = false }: { blocked?: boolean }) {
  const { t } = useTranslation('site-analytics')

  if (blocked) {
    return (
      <FeatureUpgradeSection
        title={t('plan_upgrade.title')}
        description={t('plan_upgrade.description')}
      />
    )
  }

  return <SiteAnalyticsPageContent />
}

function SiteAnalyticsPageContent() {
  const { org_id } = useParams<{ org_id: string }>()

  const { isDemoMode } = useDemoMode()

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: isDemoMode ? dayjs().subtract(1, 'year').toDate() : dayjs().subtract(30, 'day').toDate(),
    to: new Date(),
  }))

  const fromStr = useMemo(
    () => (dateRange?.from ? formatDateParam(dateRange.from) : ''),
    [dateRange?.from]
  )
  const toStr = useMemo(() => (dateRange?.to ? formatDateParam(dateRange.to) : ''), [dateRange?.to])

  // Human-readable range for the sidebar caption — counts are scoped to this window.
  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined
    const from = dayjs(dateRange.from)
    const to = dayjs(dateRange.to)
    return from.year() === to.year()
      ? `${from.format('D MMM')} – ${to.format('D MMM YYYY')}`
      : `${from.format('D MMM YYYY')} – ${to.format('D MMM YYYY')}`
  }, [dateRange?.from, dateRange?.to])

  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [selectedHostname, setSelectedHostname] = useState<string | null>(null)
  const [selectedScheme, setSelectedScheme] = useState<string>('https')

  const { data: pages, isLoading } = useGetSitePages(org_id, fromStr, toStr)
  const { data: sessionPages } = useGetSitePageSessions(org_id, fromStr, toStr)

  // Auto-select when there is exactly one page and nothing is selected yet
  useEffect(() => {
    if (pages?.length === 1 && !selectedHostname) {
      const p = pages[0]
      setSelectedPage(p.page_path)
      setSelectedHostname(p.hostname)
      setSelectedScheme(p.scheme ?? 'https')
    }
  }, [pages, selectedHostname])

  // Fixed 3-day window for recency markers in the page tree (independent of selected date range)
  const recentFrom = useMemo(() => formatDateParam(dayjs().subtract(3, 'day').toDate()), [])
  const recentTo = useMemo(() => formatDateParam(new Date()), [])
  const { data: recentPages } = useGetSitePages(org_id, recentFrom, recentTo)
  const recentPathKeys = useMemo(() => {
    const s = new Set<string>()
    for (const p of recentPages ?? []) s.add(`${p.hostname}:${p.page_path}`)
    return s
  }, [recentPages])

  const { data: analyticsSettings } = useGetAnalyticsSettings(org_id)

  // Per-URL validate status — persists across page selections within the session
  const [validateStatuses, setValidateStatuses] = useState<Map<string, ValidateStatus>>(new Map())
  const handleValidateStatusChange = (url: string, status: ValidateStatus) => {
    setValidateStatuses((prev) => new Map(prev).set(url, status))
  }

  // ── Interaction data ────────────────────────────────────────────────────────

  const selectedPageData = useMemo(
    () =>
      selectedPage !== null
        ? pages?.find((p) => p.page_path === selectedPage && p.hostname === selectedHostname)
        : undefined,
    [pages, selectedPage, selectedHostname]
  )

  const domainInteractionData = useMemo(() => {
    if (selectedPage !== null || !selectedHostname) return undefined
    const domainPages = pages?.filter((p) => p.hostname === selectedHostname) ?? []
    const total_count = domainPages.reduce((sum, p) => sum + p.total_count, 0)
    const typeMap = new Map<string, number>()
    for (const p of domainPages) {
      for (const t of p.by_type) {
        typeMap.set(t.type, (typeMap.get(t.type) ?? 0) + t.count)
      }
    }
    const by_type = [...typeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
    return { total_count, by_type }
  }, [pages, selectedPage, selectedHostname])

  const activeByType = selectedPageData?.by_type ?? domainInteractionData?.by_type ?? []

  // ── Session data ────────────────────────────────────────────────────────────

  const selectedSessionData = useMemo(
    () =>
      selectedPage !== null
        ? sessionPages?.find((p) => p.page_path === selectedPage && p.hostname === selectedHostname)
        : undefined,
    [sessionPages, selectedPage, selectedHostname]
  )

  const domainSessionData = useMemo(() => {
    if (selectedPage !== null || !selectedHostname) return undefined
    const domainPages = sessionPages?.filter((p) => p.hostname === selectedHostname) ?? []
    const total_sessions = domainPages.reduce((sum, p) => sum + p.total_sessions, 0)
    const unique_visitors = domainPages.reduce((sum, p) => sum + p.unique_visitors, 0)
    const validBounce = domainPages.filter((p) => p.bounce_rate !== null)
    const bounce_rate =
      validBounce.length > 0
        ? validBounce.reduce((sum, p) => sum + (p.bounce_rate ?? 0), 0) / validBounce.length
        : null
    const validDuration = domainPages.filter(
      (p) => p.avg_duration_sec !== null && p.avg_duration_sec > 0
    )
    const avg_duration_sec =
      validDuration.length > 0
        ? validDuration.reduce((sum, p) => sum + (p.avg_duration_sec ?? 0), 0) /
          validDuration.length
        : null
    return { total_sessions, unique_visitors, bounce_rate, avg_duration_sec }
  }, [sessionPages, selectedPage, selectedHostname])

  const activeSessionData = selectedPage !== null ? selectedSessionData : domainSessionData

  // ── URL ─────────────────────────────────────────────────────────────────────

  const pageUrl = useMemo(
    () =>
      selectedHostname && selectedPage
        ? `${selectedScheme}://${selectedHostname}${selectedPage}`
        : selectedHostname
          ? `${selectedScheme}://${selectedHostname}`
          : null,
    [selectedScheme, selectedHostname, selectedPage]
  )

  const overviewTitle =
    selectedPage === null && selectedHostname ? `${selectedHostname} — All Pages` : undefined

  const currentValidateStatus: ValidateStatus = pageUrl
    ? (validateStatuses.get(pageUrl) ?? 'idle')
    : 'idle'

  // True only when recency data has loaded AND the current selection has no recent activity
  const isCurrentPageNonRecent = useMemo(() => {
    if (!recentPages || !selectedHostname) return false
    if (selectedPage !== null) {
      return !recentPathKeys.has(`${selectedHostname}:${selectedPage}`)
    }
    // Domain view: non-recent if no page under this domain has recent data
    return !recentPages.some((p) => p.hostname === selectedHostname)
  }, [recentPages, recentPathKeys, selectedHostname, selectedPage])

  return (
    <div className="flex h-[calc(100dvh-52px)] overflow-hidden">
      <SitePageTreeSidebar
        pages={pages ?? []}
        isLoading={isLoading}
        selectedPage={selectedPage}
        selectedHostname={selectedHostname}
        recentPathKeys={recentPathKeys}
        dateRangeLabel={dateRangeLabel}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onPageChange={(page, hostname, scheme) => {
          setSelectedPage(page)
          setSelectedHostname(hostname)
          setSelectedScheme(scheme ?? 'https')
        }}
        onDomainSelect={(hostname, scheme) => {
          setSelectedPage(null)
          setSelectedHostname(hostname)
          setSelectedScheme(scheme)
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {!selectedHostname ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Globe className="mb-3 h-12 w-12 opacity-40" />
              <p className="text-sm font-medium">Select a domain or page from the sidebar</p>
              <p className="mt-1 text-xs">
                Click a domain to see total stats, or a page for individual stats
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {/* URL bar with validate action and optional no-data alert */}
            {pageUrl && (
              <PageUrlBar
                url={pageUrl}
                scheme={selectedScheme}
                hostname={selectedHostname}
                pagePath={selectedPage}
                publishableKey={analyticsSettings?.publishable_key}
                validateStatus={currentValidateStatus}
                onValidateStatusChange={(s) => handleValidateStatusChange(pageUrl, s)}
                isNonRecent={isCurrentPageNonRecent}
              />
            )}

            <Tabs defaultValue="sessions">
              <TabsList className="h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0">
                {(['sessions', 'clicks', 'scroll', 'forms'] as const).map((tab) => {
                  const label = tab.charAt(0).toUpperCase() + tab.slice(1)
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-none border-b-[1.5px] border-border px-4 py-2 !text-s font-normal text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <span className="relative">
                        <span className="invisible font-medium">{label}</span>
                        <span className="absolute inset-0 flex items-center justify-center">{label}</span>
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              <TabsContent value="sessions" className="mt-4">
                <SiteSessionsTab
                  orgId={org_id}
                  fromStr={fromStr}
                  toStr={toStr}
                  selectedPage={selectedPage}
                  selectedHostname={selectedHostname}
                  totalSessions={activeSessionData?.total_sessions ?? 0}
                  uniqueVisitors={activeSessionData?.unique_visitors ?? 0}
                  bounceRate={activeSessionData?.bounce_rate ?? null}
                  avgDurationSec={activeSessionData?.avg_duration_sec ?? null}
                  title={overviewTitle}
                />
              </TabsContent>

              <TabsContent value="clicks" className="mt-4">
                <SiteClicksTab
                  orgId={org_id}
                  selectedPage={selectedPage}
                  selectedHostname={selectedHostname}
                  fromStr={fromStr}
                  toStr={toStr}
                  byType={activeByType}
                />
              </TabsContent>

              <TabsContent value="scroll" className="mt-4">
                <SiteScrollTab
                  orgId={org_id}
                  selectedPage={selectedPage}
                  selectedHostname={selectedHostname}
                  selectedScheme={selectedScheme}
                  fromStr={fromStr}
                  toStr={toStr}
                />
              </TabsContent>

              <TabsContent value="forms" className="mt-4">
                <SiteFormTab
                  orgId={org_id}
                  fromStr={fromStr}
                  toStr={toStr}
                  selectedPage={selectedPage}
                  selectedHostname={selectedHostname}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
