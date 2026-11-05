'use client'

import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Label } from '@/shared/components/ui/label'
import { AVAILABLE_DATA_SOURCES, DATA_SOURCE_CONFIG } from '../constants/data-source-config'
import type { FormulaConfig, FormulaMetricConfig, DataSource } from '../types'

interface FormulaConfigFormProps {
  config: FormulaConfig
  onChange: (config: FormulaConfig) => void
  hasPageviews: boolean
}

export function FormulaConfigForm({ config, onChange, hasPageviews }: FormulaConfigFormProps) {
  const { t } = useTranslation('dashboards')

  const handleMetricChange = (
    key: 'metric_a' | 'metric_b',
    field: keyof FormulaMetricConfig,
    value: string,
  ) => {
    const updated = { ...config[key], [field]: value }
    if (field === 'data_source') {
      const sourceConfig = DATA_SOURCE_CONFIG[value as DataSource]
      updated.metric = sourceConfig?.metrics[0]?.value ?? 'count'
      updated.filters = []
    }
    onChange({ ...config, [key]: updated })
  }

  const renderMetricSection = (key: 'metric_a' | 'metric_b', label: string) => {
    const metricConfig = config[key]
    const sourceConfig = DATA_SOURCE_CONFIG[metricConfig.data_source]

    return (
      <div className="space-y-3 rounded-lg border p-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>

        <div className="space-y-1.5">
          <Label htmlFor={`${key}-source`} className="text-sm">{t('queryBuilder.dataSource', { defaultValue: 'Data Source' })}</Label>
          <Select
            value={metricConfig.data_source}
            onValueChange={(v) => handleMetricChange(key, 'data_source', v)}
          >
            <SelectTrigger id={`${key}-source`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_DATA_SOURCES.map((ds) => {
                const cfg = DATA_SOURCE_CONFIG[ds]
                const isLocked = cfg.proOnly && !hasPageviews
                return (
                  <SelectItem key={ds} value={ds} disabled={isLocked}>
                    {cfg.label}
                    {isLocked && ' (PRO)'}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${key}-metric`} className="text-sm">{t('queryBuilder.metric', { defaultValue: 'Metric' })}</Label>
          <Select
            value={metricConfig.metric}
            onValueChange={(v) => handleMetricChange(key, 'metric', v)}
          >
            <SelectTrigger id={`${key}-metric`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sourceConfig?.metrics.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {renderMetricSection('metric_a', t('queryBuilder.formulaMetricA', { defaultValue: 'Metric A' }))}

      <div className="flex items-center justify-center">
        <Select
          value={config.operator}
          onValueChange={(v) => onChange({ ...config, operator: v as FormulaConfig['operator'] })}
        >
          <SelectTrigger className="w-20" aria-label={t('queryBuilder.formulaOperator', { defaultValue: 'Operator' })}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="+">+</SelectItem>
            <SelectItem value="-">-</SelectItem>
            <SelectItem value="*">&times;</SelectItem>
            <SelectItem value="/">&divide;</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderMetricSection('metric_b', t('queryBuilder.formulaMetricB', { defaultValue: 'Metric B' }))}

      <div className="rounded-md bg-muted px-3 py-2 text-sm font-mono text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
        {sourceMetricLabel(config.metric_a)} {config.operator} {sourceMetricLabel(config.metric_b)}
      </div>
    </div>
  )
}

function sourceMetricLabel(m: FormulaMetricConfig): string {
  const src = DATA_SOURCE_CONFIG[m.data_source]
  const metric = src?.metrics.find((x) => x.value === m.metric)
  return `${metric?.label ?? m.metric}(${src?.label ?? m.data_source})`
}
