'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { WidgetRenderer } from './widget-renderer'
import { FormulaWidget } from './widgets/formula-widget'
import { usePreviewWidgetData } from '../hooks/queries'
import { DATA_SOURCE_CONFIG } from '../constants/data-source-config'
import type { WidgetConfig, FormulaConfig, WidgetDataResult, BatchWidgetResult } from '../types'

interface LivePreviewProps {
  orgId: string
  dashboardId: string
  widgetType: 'standard' | 'formula'
  config: WidgetConfig
  formulaConfig: FormulaConfig
  dateRange: { date_from: string; date_to: string }
}

export function QueryBuilderLivePreview({
  orgId, dashboardId, widgetType, config, formulaConfig, dateRange,
}: LivePreviewProps) {
  const { t } = useTranslation('dashboards')

  const isStandardComplete = widgetType === 'standard' && config.data_source && config.metric && config.group_by
  const previewInput = useMemo(() => {
    if (widgetType === 'formula') {
      return { widget_type: 'formula' as const, formula_config: formulaConfig }
    }
    if (isStandardComplete) {
      return { widget_type: 'standard' as const, config }
    }
    return undefined
  }, [widgetType, config, formulaConfig, isStandardComplete])

  const { data, isLoading, isError } = usePreviewWidgetData(
    orgId, dashboardId, previewInput, dateRange,
  )

  const summary = useMemo(() => {
    if (widgetType !== 'standard' || !isStandardComplete) return ''
    const source = DATA_SOURCE_CONFIG[config.data_source]
    const metricLabel = source?.metrics.find((m) => m.value === config.metric)?.label ?? config.metric
    const dimLabel = config.group_by === 'none'
      ? ''
      : `, grouped by ${source?.dimensions.find((d) => d.value === config.group_by)?.label ?? config.group_by}`
    const filterDesc = config.filters.length > 0
      ? `, where ${config.filters.map((f) => `${f.field} ${f.op} ${f.value}`).join(' and ')}`
      : ''
    return `${metricLabel} from ${source?.label ?? config.data_source}${dimLabel}${filterDesc}`
  }, [widgetType, config, isStandardComplete])

  if (widgetType === 'standard' && !isStandardComplete) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-stone-400">
        {t('queryBuilder.configureToPreview', { defaultValue: 'Configure the widget to see a preview' })}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col p-4 gap-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
        {t('queryBuilder.previewLabel', { defaultValue: 'Preview' })}
      </p>
      <div className="flex-1 min-h-0 rounded-xl bg-stone-50/60 border border-stone-200/40">
        {isLoading ? (
          <div className="flex h-full items-center justify-center" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" aria-hidden="true" />
            <span className="sr-only">{t('queryBuilder.loadingPreview', { defaultValue: 'Loading preview...' })}</span>
          </div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center text-sm text-stone-400" role="alert">
            {t('queryBuilder.previewError', { defaultValue: 'Unable to load preview' })}
          </div>
        ) : widgetType === 'formula' ? (
          <FormulaWidget
            total={(data as BatchWidgetResult)?.result?.total ?? null}
            formula={(data as BatchWidgetResult)?.formula ?? null}
            error={(data as BatchWidgetResult)?.errorCode}
          />
        ) : data ? (
          <WidgetRenderer config={config} data={data as WidgetDataResult} />
        ) : null}
      </div>

      {summary && (
        <p className="text-xs text-stone-500 border-t border-stone-200/60 pt-3">{summary}</p>
      )}
    </div>
  )
}
