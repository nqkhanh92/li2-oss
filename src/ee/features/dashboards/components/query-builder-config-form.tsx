'use client'

import { useTranslation } from 'react-i18next'
import { ProBadge } from './pro-badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'
import { X, Plus } from 'lucide-react'
import { getCurrencyOptions, DEFAULT_CURRENCY } from '@/shared/lib/currency'
import { AVAILABLE_DATA_SOURCES, DATA_SOURCE_CONFIG } from '../constants/data-source-config'
import { DateRangePicker } from './date-range-picker'
import type { DateRangeConfig } from '../utils/date-range'
import type { DataSource, Visualization, WidgetSize, WidgetFilter, WidgetConfig, DateOverride } from '../types'

interface ConfigFormProps {
  config: WidgetConfig
  widgetName: string
  hasPageviews: boolean
  dateOverride: DateOverride | null
  globalDateLabel: string
  onChange: (config: WidgetConfig) => void
  onNameChange: (name: string) => void
  onDateOverrideChange: (override: DateOverride | null) => void
}

const VIZ_OPTIONS: { value: Visualization; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
  { value: 'pie', label: 'Pie' },
  { value: 'table', label: 'Table' },
]

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

export function QueryBuilderConfigForm({
  config, widgetName, hasPageviews, dateOverride, globalDateLabel,
  onChange, onNameChange, onDateOverrideChange,
}: ConfigFormProps) {
  const { t } = useTranslation('dashboards')
  const sourceConfig = DATA_SOURCE_CONFIG[config.data_source]

  const handleDataSourceChange = (newSource: DataSource) => {
    const newConfig = DATA_SOURCE_CONFIG[newSource]
    onChange({
      data_source: newSource,
      metric: newConfig.metrics[0].value,
      group_by: 'none',
      filters: [],
      visualization: newConfig.suggestedViz['none'] ?? 'number',
      size: config.size,
    })
  }

  const handleGroupByChange = (groupBy: string) => {
    const suggestedViz = sourceConfig.suggestedViz[groupBy]
    onChange({
      ...config,
      group_by: groupBy,
      ...(suggestedViz ? { visualization: suggestedViz } : {}),
    })
  }

  const handleAddFilter = () => {
    const firstField = sourceConfig.filterFields[0]
    if (!firstField) return
    onChange({
      ...config,
      filters: [...config.filters, { field: firstField.value, op: '=', value: '' }],
    })
  }

  const handleUpdateFilter = (index: number, update: Partial<WidgetFilter>) => {
    const newFilters = config.filters.map((f, i) => i === index ? { ...f, ...update } : f)
    onChange({ ...config, filters: newFilters })
  }

  const handleRemoveFilter = (index: number) => {
    onChange({ ...config, filters: config.filters.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-4">
      {/* Widget Name */}
      <div className="space-y-1.5">
        <Label htmlFor="qb-widget-name">{t('queryBuilder.widgetName', { defaultValue: 'Widget Name' })}</Label>
        <Input
          id="qb-widget-name"
          value={widgetName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('queryBuilder.widgetNamePlaceholder', { defaultValue: 'My Widget' })}
        />
      </div>

      {/* Data Source */}
      <div className="space-y-1.5">
        <Label htmlFor="qb-data-source">{t('queryBuilder.dataSource', { defaultValue: 'Data Source' })}</Label>
        <Select value={config.data_source} onValueChange={handleDataSourceChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {AVAILABLE_DATA_SOURCES.map((key) => {
              const spec: typeof sourceConfig = DATA_SOURCE_CONFIG[key]
              return (
                <SelectItem key={key} value={key} disabled={spec.proOnly && !hasPageviews}>
                  <span className="flex items-center gap-2">
                    {spec.label}
                    {spec.proOnly && !hasPageviews && (
                      <ProBadge />
                    )}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Metric */}
      <div className="space-y-1.5">
        <Label htmlFor="qb-metric">{t('queryBuilder.metric', { defaultValue: 'Metric' })}</Label>
        <Select value={config.metric} onValueChange={(v) => onChange({ ...config, metric: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {sourceConfig.metrics.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Display Currency — only for conversions + revenue */}
      {config.data_source === 'conversions' && config.metric === 'revenue' && (
        <div className="space-y-1.5">
          <Label htmlFor="qb-display-currency">{t('queryBuilder.displayCurrency', { defaultValue: 'Display Currency' })}</Label>
          <Select
            value={config.display_currency ?? DEFAULT_CURRENCY}
            onValueChange={(v) => onChange({ ...config, display_currency: v })}
          >
            <SelectTrigger id="qb-display-currency"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getCurrencyOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Group By */}
      <div className="space-y-1.5">
        <Label htmlFor="qb-group-by">{t('queryBuilder.groupBy', { defaultValue: 'Break down by' })}</Label>
        <Select value={config.group_by} onValueChange={handleGroupByChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {sourceConfig.dimensions.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <Label>{t('queryBuilder.filters', { defaultValue: 'Filters' })}</Label>
        {config.filters.map((filter, i) => {
          const fieldSpec = sourceConfig.filterFields.find((f) => f.value === filter.field)
          const ops = fieldSpec?.ops ?? ['=', '!=']
          return (
            <div key={i} className="flex items-center gap-2">
              <Select value={filter.field} onValueChange={(v) => handleUpdateFilter(i, { field: v })}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sourceConfig.filterFields.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filter.op} onValueChange={(v) => handleUpdateFilter(i, { op: v as WidgetFilter['op'] })}>
                <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ops.map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={filter.value}
                onChange={(e) => handleUpdateFilter(i, { value: e.target.value })}
                className="flex-1"
                placeholder={t('queryBuilder.filterValue', { defaultValue: 'Value' })}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemoveFilter(i)} aria-label={t('queryBuilder.removeFilter', { defaultValue: 'Remove filter' })}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
        <Button variant="outline" size="sm" onClick={handleAddFilter} className="gap-1">
          <Plus className="h-3 w-3" /> {t('queryBuilder.addFilter', { defaultValue: 'Add Filter' })}
        </Button>
      </div>

      {/* Visualization + Size — grouped on one row */}
      <div className="flex gap-4">
        <div className="space-y-1.5 flex-1">
          <Label>{t('queryBuilder.visualization', { defaultValue: 'Visualization' })}</Label>
          <div className="flex flex-wrap gap-1">
            {VIZ_OPTIONS.map((v) => (
              <button
                key={v.value}
                onClick={() => onChange({ ...config, visualization: v.value })}
                className={`flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                  ${config.visualization === v.value
                    ? 'border-stone-800 bg-stone-800 text-white shadow-sm'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'}`}
                aria-label={v.label}
                aria-pressed={config.visualization === v.value}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t('queryBuilder.size', { defaultValue: 'Size' })}</Label>
          <div className="flex gap-1">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => onChange({ ...config, size: s.value })}
                className={`flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                  ${config.size === s.value
                    ? 'border-stone-800 bg-stone-800 text-white shadow-sm'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'}`}
                aria-pressed={config.size === s.value}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Override */}
      <div className="space-y-2 border-t border-stone-200/60 pt-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="qb-date-override"
            checked={dateOverride !== null}
            onCheckedChange={(checked) => {
              onDateOverrideChange(checked ? { preset: 'last_7d' } : null)
            }}
          />
          <Label htmlFor="qb-date-override">
            {t('queryBuilder.useCustomDateRange', { defaultValue: 'Use custom date range' })}
          </Label>
        </div>
        {dateOverride ? (
          <DateRangePicker
            value={dateOverride}
            onChange={(state) => onDateOverrideChange(state)}
          />
        ) : (
          <p className="text-xs text-stone-500">
            {t('queryBuilder.usingGlobalRange', {
              defaultValue: 'Using dashboard date range: {{range}}',
              range: globalDateLabel,
            }) as string}
          </p>
        )}
      </div>
    </div>
  )
}
