'use client'

import { useState } from 'react'
import {
  ChevronDown,
  Eye,
  MousePointerClick,
  ChevronsDown,
  Loader2,
  Radio,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Switch } from '@/shared/components/ui/switch'
import { DebugLogsTable } from '../../debug-logs-table'
import { useToggleDebugMode } from '../../../hooks/mutations'
import { useGetDebugLogs } from '../../../hooks/queries'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { useTranslation } from 'react-i18next'

type HeatmapFilter = 'all' | 'pageview' | 'interaction' | 'scroll'

// ─── Debug panel ──────────────────────────────────────────────────────────────

const HeatmapDebugPanel = ({ org_id }: { org_id: string }) => {
  const { t } = useTranslation('analytics_settings')

  const FILTER_TABS: { id: HeatmapFilter; label: string }[] = [
    { id: 'all', label: t('onboarding.heatmap.filter_all') },
    { id: 'pageview', label: t('onboarding.heatmap.filter_pageview') },
    { id: 'interaction', label: t('onboarding.heatmap.filter_interaction') },
    { id: 'scroll', label: t('onboarding.heatmap.filter_scroll') },
  ]

  const [debugEnabled, setDebugEnabled] = useState(false)
  const [filter, setFilter] = useState<HeatmapFilter>('all')
  const [page, setPage] = useState(1)
  const toggleDebugMode = useToggleDebugMode(org_id)

  const { data: logsData, isLoading } = useGetDebugLogs(
    org_id,
    { page, limit: 10, ...(filter !== 'all' && { request_type: filter }) },
    debugEnabled
  )

  const handleToggle = async (enabled: boolean) => {
    try {
      await toggleDebugMode.mutateAsync({ enabled })
      setDebugEnabled(enabled)
      setPage(1)
    } catch {}
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'flex items-center justify-between rounded-xl border-2 p-4 transition-colors',
          debugEnabled ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
        )}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {t('onboarding.heatmap.debug_mode')}
          </span>
          <span className="text-xs text-slate-500">
            {debugEnabled ? t('onboarding.heatmap.debug_on') : t('onboarding.heatmap.debug_off')}
          </span>
        </div>
        <Switch
          checked={debugEnabled}
          onCheckedChange={handleToggle}
          disabled={toggleDebugMode.isPending}
        />
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id)
              setPage(1)
            }}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              filter === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!debugEnabled ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
          <Radio className="h-6 w-6" />
          <span className="text-sm">{t('onboarding.heatmap.debug_empty')}</span>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <DebugLogsTable
          logs={logsData?.data ?? []}
          isLoading={isLoading}
          currentPage={page}
          hasMore={logsData?.has_more ?? false}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  org_id: string
}

export const HeatmapSetupGuide = ({ org_id }: Props) => {
  const { t } = useTranslation('analytics_settings')

  const AUTO_FEATURES = [
    {
      icon: Eye,
      label: t('onboarding.heatmap.pageviews_label'),
      description: t('onboarding.heatmap.pageviews_desc'),
    },
    {
      icon: MousePointerClick,
      label: t('onboarding.heatmap.clicks_label'),
      description: t('onboarding.heatmap.clicks_desc'),
    },
    {
      icon: ChevronsDown,
      label: t('onboarding.heatmap.scroll_label'),
      description: t('onboarding.heatmap.scroll_desc'),
    },
  ]

  const [debugOpen, setDebugOpen] = useState(false)
  const org_slug = useOrganizationStore((s) => s.organization?.org_slug)

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-600">{t('onboarding.heatmap.subtitle')}</p>

      {/* Prerequisites */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t('onboarding.heatmap.before_start_title')}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('onboarding.heatmap.before_start_desc')}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {AUTO_FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="flex items-center gap-3">
                <div className="rounded-md bg-slate-100 p-1.5 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{f.label}</span>
                  <span className="text-slate-400 mx-1.5">—</span>
                  <span className="text-sm text-slate-500">{f.description}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* View heatmaps link */}
      {org_slug && (
        <a
          href={`/org/${org_slug}/heatmap`}
          className="inline-flex items-center gap-2 h-9 w-fit px-4 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          {t('onboarding.heatmap.view_heatmaps')}
        </a>
      )}

      {/* Debug tools */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setDebugOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-700">
            {t('onboarding.heatmap.debug_tools')}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform', debugOpen && 'rotate-180')}
          />
        </button>
        {debugOpen && (
          <div className="border-t px-4 py-4">
            <HeatmapDebugPanel org_id={org_id} />
          </div>
        )}
      </div>
    </div>
  )
}
