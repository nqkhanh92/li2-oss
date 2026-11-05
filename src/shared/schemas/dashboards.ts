import { z } from 'zod'
import {
  AVAILABLE_DATA_SOURCES,
  DATA_SOURCE_CONFIG,
} from '@/ee/features/dashboards/constants/data-source-config'

export const createDashboardSchema = z.object({
  name: z.string().min(1).max(256),
  template_id: z.string().optional(),
})

export const updateDashboardSchema = z.object({
  name: z.string().min(1).max(256).optional(),
})

const widgetFilterSchema = z.object({
  field: z.string(),
  op: z.enum(['=', '!=', 'contains']),
  value: z.string(),
})

export const widgetConfigSchema = z.object({
  data_source: z.enum(['visits', 'pageviews', 'events', 'interactions', 'conversions']),
  metric: z.string(),
  group_by: z.string(),
  filters: z.array(widgetFilterSchema).default([]),
  visualization: z.enum(['bar', 'line', 'pie', 'number', 'table']),
  size: z.enum(['small', 'medium', 'large']),
  display_currency: z.string().optional(),
}).superRefine((val, ctx) => {
  // Reject a hand-written request for a source the feature flags have turned off
  if (!AVAILABLE_DATA_SOURCES.includes(val.data_source)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Data source '${val.data_source}' is disabled`,
      path: ['data_source'],
    })
    return
  }

  const config = DATA_SOURCE_CONFIG[val.data_source]
  if (!config) return

  if (!config.metrics.some((m) => m.value === val.metric)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Metric '${val.metric}' is not valid for '${val.data_source}'`,
      path: ['metric'],
    })
  }
  if (!config.dimensions.some((d) => d.value === val.group_by)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Group by '${val.group_by}' is not valid for '${val.data_source}'`,
      path: ['group_by'],
    })
  }
  const allowedFields = config.filterFields.map((f) => f.value)
  val.filters.forEach((f, i) => {
    if (!allowedFields.includes(f.field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Filter field '${f.field}' is not valid for '${val.data_source}'`,
        path: ['filters', i, 'field'],
      })
    }
  })
})

const gridPositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().min(1).max(2),
  h: z.number().min(1),
})

const dateOverrideSchema = z.object({
  preset: z.enum(['today', 'last_7d', 'last_30d', 'last_90d', 'custom']),
  from: z.string().optional(),
  to: z.string().optional(),
}).optional().nullable()

const formulaMetricConfigSchema = z.object({
  data_source: z.enum(['visits', 'pageviews', 'events', 'interactions', 'conversions']),
  metric: z.string().min(1),
  filters: z.array(widgetFilterSchema).optional().default([]),
}).superRefine((val, ctx) => {
  // Same gate as widgetConfigSchema: a formula is the other way to reach a data source
  if (!AVAILABLE_DATA_SOURCES.includes(val.data_source)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Data source '${val.data_source}' is disabled`,
      path: ['data_source'],
    })
  }
})

// Per-metric date ranges (LOW-4) are blocked by Zod's z.object() stripping unknown keys —
// date_from/date_to on sub-metrics are silently removed before reaching the backend.
export const formulaConfigSchema = z.object({
  metric_a: formulaMetricConfigSchema,
  metric_b: formulaMetricConfigSchema,
  operator: z.enum(['+', '-', '*', '/']),
})

export const createWidgetSchema = z.object({
  name: z.string().min(1).max(256),
  widget_type: z.enum(['standard', 'formula']),
  config: widgetConfigSchema,
  formula_config: formulaConfigSchema.nullable().optional().default(null),
  position: gridPositionSchema,
  date_override: dateOverrideSchema,
}).refine(
  (data) => {
    if (data.widget_type === 'formula' && !data.formula_config) {
      return false
    }
    return true
  },
  { message: 'Formula widgets require formula_config', path: ['formula_config'] },
)

export const updateWidgetSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  widget_type: z.enum(['standard', 'formula']).optional(),
  config: widgetConfigSchema.optional(),
  formula_config: formulaConfigSchema.nullable().optional(),
  position: gridPositionSchema.optional(),
  date_override: dateOverrideSchema,
})

export const updateLayoutSchema = z.object({
  positions: z.array(z.object({
    widget_id: z.string().uuid(),
    position: gridPositionSchema,
  })),
})

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>
export type UpdateLayoutInput = z.infer<typeof updateLayoutSchema>
