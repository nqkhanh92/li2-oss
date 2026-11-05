'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { QueryBuilderConfigForm } from './query-builder-config-form'
import { FormulaConfigForm } from './formula-config-form'
import { QueryBuilderLivePreview } from './query-builder-live-preview'
import { WidgetTemplateCatalog } from './widget-template-catalog'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAddWidget, useUpdateWidget } from '../hooks/mutations'
import { resolveDateRange, PRESET_LABELS } from '../utils/date-range'
import type { DateRangeConfig } from '../utils/date-range'
import { computePosition } from '../utils/grid-position'
import { WIDGET_SIZE_MAP } from '../types'
import type { WidgetConfig, WidgetSize, GridPosition, DashboardWidget, DashboardWithWidgets, WidgetTemplate, DateOverride, FormulaConfig } from '../types'

const DEFAULT_CONFIG: WidgetConfig = {
  data_source: 'visits',
  metric: 'count',
  group_by: 'none',
  filters: [],
  visualization: 'number',
  size: 'small',
}

const DEFAULT_FORMULA_CONFIG: FormulaConfig = {
  metric_a: { data_source: 'visits', metric: 'count', filters: [] },
  metric_b: { data_source: 'visits', metric: 'count', filters: [] },
  operator: '/',
}

interface WidgetQueryBuilderProps {
  orgId: string
  dashboardId: string
  existingWidgets: DashboardWidget[]
  hasPageviews: boolean
  dateRangeState: DateRangeConfig
  editWidget?: DashboardWidget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAfterMutate?: () => void
}

export function WidgetQueryBuilder({
  orgId, dashboardId, existingWidgets, hasPageviews, dateRangeState,
  editWidget, open, onOpenChange, onAfterMutate,
}: WidgetQueryBuilderProps) {
  const { t } = useTranslation('dashboards')
  const queryClient = useQueryClient()
  const addWidget = useAddWidget(orgId, dashboardId)
  const updateWidget = useUpdateWidget(orgId, dashboardId)

  const isEditMode = !!editWidget
  const [activeTab, setActiveTab] = useState(isEditMode ? 'custom' : 'templates')
  const [widgetName, setWidgetName] = useState('')
  const [widgetType, setWidgetType] = useState<'standard' | 'formula'>('standard')
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG)
  const [formulaConfig, setFormulaConfig] = useState<FormulaConfig>(DEFAULT_FORMULA_CONFIG)
  const [dateOverride, setDateOverride] = useState<DateOverride | null>(null)

  // Sync form state when editWidget changes (open edit / close dialog)
  useEffect(() => {
    if (editWidget) {
      setWidgetName(editWidget.name)
      setWidgetType(editWidget.widget_type)
      setConfig(editWidget.config)
      if (editWidget.widget_type === 'formula' && editWidget.formula_config) {
        setFormulaConfig(editWidget.formula_config)
      }
      setDateOverride(editWidget.date_override ?? null)
      setActiveTab('custom')
    } else {
      setWidgetName('')
      setWidgetType('standard')
      setConfig(DEFAULT_CONFIG)
      setFormulaConfig(DEFAULT_FORMULA_CONFIG)
      setDateOverride(null)
      setActiveTab('templates')
    }
  }, [editWidget])

  // Debounce config for preview (prevents rapid API calls while typing filter values)
  const deferredConfig = useDebounce(config, 500)
  const deferredFormulaConfig = useDebounce(formulaConfig, 500)
  // Preview uses widget's date override if set, otherwise global
  const previewDateRange = resolveDateRange(dateOverride ?? dateRangeState)
  const globalDateLabel = PRESET_LABELS[dateRangeState.preset] ?? 'Custom'

  const isSaving = addWidget.isPending || updateWidget.isPending

  // Compute fresh position at submit time from query cache
  const getPosition = (size: WidgetSize): GridPosition => {
    const cached = queryClient.getQueryData<DashboardWithWidgets>(
      ['organizations', orgId, 'dashboards', dashboardId],
    )
    const widgets = cached?.dashboard_widgets ?? existingWidgets
    return computePosition(size, widgets)
  }

  const closeOnSuccess = { onSuccess: () => onOpenChange(false) }

  const handleSave = () => {
    if (!widgetName.trim()) return

    if (isEditMode && editWidget) {
      const input: Record<string, unknown> = {
        name: widgetName.trim(),
        widget_type: widgetType,
        config,
        formula_config: widgetType === 'formula' ? formulaConfig : null,
        date_override: dateOverride,
      }

      // If size changed, recompute position w/h (keep x/y)
      const effectiveSize = widgetType === 'formula' ? 'small' : config.size
      if (editWidget.config.size !== effectiveSize) {
        const dims = WIDGET_SIZE_MAP[effectiveSize]
        input.position = {
          x: editWidget.position.x,
          y: editWidget.position.y,
          w: dims.w,
          h: dims.h,
        }
      }

      updateWidget.mutate(
        { widgetId: editWidget.id, input },
        closeOnSuccess,
      )
    } else if (widgetType === 'formula') {
      onAfterMutate?.()
      addWidget.mutate(
        {
          name: widgetName.trim(),
          widget_type: 'formula',
          config: { ...DEFAULT_CONFIG, size: 'small' },
          formula_config: formulaConfig,
          position: getPosition('small'),
          date_override: dateOverride,
        },
        closeOnSuccess,
      )
    } else {
      onAfterMutate?.()
      addWidget.mutate(
        {
          name: widgetName.trim(),
          widget_type: 'standard',
          config,
          position: getPosition(config.size),
          date_override: dateOverride,
        },
        closeOnSuccess,
      )
    }
  }

  const handleTemplateSelect = (template: WidgetTemplate) => {
    onAfterMutate?.()
    addWidget.mutate(
      {
        name: t(`templates.widgets.${template.id}.name`, { defaultValue: template.id }),
        widget_type: 'standard',
        config: template.config,
        position: getPosition(template.config.size),
      },
      closeOnSuccess,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[95vw] md:w-[90vw] h-[90vh] md:h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {isEditMode
              ? t('queryBuilder.editTitle', { defaultValue: 'Edit Widget' })
              : t('queryBuilder.createTitle', { defaultValue: 'Create Widget' })}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          className="flex-1 flex flex-col min-h-0"
          onValueChange={setActiveTab}
        >
          {!isEditMode && (
            <TabsList className="mx-6">
              <TabsTrigger value="templates">
                {t('queryBuilder.templatesTab', { defaultValue: 'Templates' })}
              </TabsTrigger>
              <TabsTrigger value="custom">
                {t('queryBuilder.customTab', { defaultValue: 'Custom' })}
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="templates" className="flex-1 overflow-y-auto px-6 pb-6">
            <WidgetTemplateCatalog
              hasPageviews={hasPageviews}
              isPending={addWidget.isPending}
              onSelect={handleTemplateSelect}
            />
          </TabsContent>

          <TabsContent value="custom" className="flex-1 min-h-0">
            <div className="flex flex-col md:flex-row h-full">
              {/* Left panel: config form */}
              <div className="w-full md:w-[400px] md:border-r md:border-stone-200/60 border-b border-stone-200/60 md:border-b-0 overflow-y-auto max-h-[50vh] md:max-h-none">
                {/* Standard / Formula toggle */}
                <div className="flex gap-1.5 px-4 pt-4">
                  <button
                    onClick={() => setWidgetType('standard')}
                    aria-pressed={widgetType === 'standard'}
                    className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      widgetType === 'standard'
                        ? 'bg-stone-800 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                    }`}
                  >
                    {t('queryBuilder.standard', { defaultValue: 'Standard' })}
                  </button>
                  <button
                    onClick={() => setWidgetType('formula')}
                    aria-pressed={widgetType === 'formula'}
                    className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      widgetType === 'formula'
                        ? 'bg-stone-800 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                    }`}
                  >
                    {t('queryBuilder.formula', { defaultValue: 'Formula' })}
                  </button>
                </div>

                {widgetType === 'standard' ? (
                  <QueryBuilderConfigForm
                    config={config}
                    widgetName={widgetName}
                    hasPageviews={hasPageviews}
                    dateOverride={dateOverride}
                    globalDateLabel={globalDateLabel}
                    onChange={setConfig}
                    onNameChange={setWidgetName}
                    onDateOverrideChange={setDateOverride}
                  />
                ) : (
                  <div className="flex flex-col gap-5 p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="qb-formula-name">{t('queryBuilder.widgetName', { defaultValue: 'Widget Name' })}</Label>
                      <Input
                        id="qb-formula-name"
                        value={widgetName}
                        onChange={(e) => setWidgetName(e.target.value)}
                        placeholder={t('queryBuilder.widgetNamePlaceholder', { defaultValue: 'My Widget' })}
                      />
                    </div>
                    <FormulaConfigForm
                      config={formulaConfig}
                      onChange={setFormulaConfig}
                      hasPageviews={hasPageviews}
                    />
                  </div>
                )}
              </div>
              {/* Right panel: live preview */}
              <div className="flex-1 min-h-0">
                <QueryBuilderLivePreview
                  orgId={orgId}
                  dashboardId={dashboardId}
                  widgetType={widgetType}
                  config={deferredConfig}
                  formulaConfig={deferredFormulaConfig}
                  dateRange={previewDateRange}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer — only visible on Custom tab or edit mode */}
        {(activeTab === 'custom' || isEditMode) && (
          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!widgetName.trim() || isSaving}
            >
              {isEditMode
                ? t('queryBuilder.saveChanges', { defaultValue: 'Save Changes' })
                : t('queryBuilder.createWidget', { defaultValue: 'Create Widget' })}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
