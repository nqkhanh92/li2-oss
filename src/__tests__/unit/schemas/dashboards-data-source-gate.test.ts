import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The schemas read AVAILABLE_DATA_SOURCES, which is built once at module load from
 * NEXT_PUBLIC_DISABLE_* variables. Every case stubs the environment and re-imports.
 */
async function loadSchemas(env: Record<string, string>) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_DISABLE_ATTRIBUTION', env.ATTRIBUTION ?? '')
  vi.stubEnv('NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS', env.BEHAVIOR_ANALYTICS ?? '')
  return import('@/shared/schemas/dashboards')
}

const standardWidget = (dataSource: string) => ({
  name: 'My widget',
  widget_type: 'standard' as const,
  config: {
    data_source: dataSource,
    metric: 'count',
    group_by: 'day',
    filters: [],
    visualization: 'line' as const,
    size: 'small' as const,
  },
  position: { x: 0, y: 0, w: 1, h: 1 },
})

const formulaWidget = (sourceA: string, sourceB: string) => ({
  name: 'My formula',
  widget_type: 'formula' as const,
  config: standardWidget('visits').config,
  formula_config: {
    metric_a: { data_source: sourceA, metric: 'count', filters: [] },
    metric_b: { data_source: sourceB, metric: 'count', filters: [] },
    operator: '/' as const,
  },
  position: { x: 0, y: 0, w: 1, h: 1 },
})

describe('dashboards schema data source gate', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts a hidden source when no flag is set', async () => {
    const { createWidgetSchema } = await loadSchemas({})

    expect(() => createWidgetSchema.parse(standardWidget('pageviews'))).not.toThrow()
    expect(() => createWidgetSchema.parse(formulaWidget('events', 'visits'))).not.toThrow()
  })

  it('rejects a standard widget on a disabled source', async () => {
    const { createWidgetSchema } = await loadSchemas({ BEHAVIOR_ANALYTICS: 'true' })

    expect(() => createWidgetSchema.parse(standardWidget('pageviews'))).toThrow(/disabled/)
    expect(() => createWidgetSchema.parse(standardWidget('visits'))).not.toThrow()
  })

  // A formula is the second way into a data source, and it used to skip this gate
  it('rejects a formula widget on a disabled source', async () => {
    const { createWidgetSchema } = await loadSchemas({ BEHAVIOR_ANALYTICS: 'true' })

    expect(() => createWidgetSchema.parse(formulaWidget('events', 'visits'))).toThrow(/disabled/)
    expect(() => createWidgetSchema.parse(formulaWidget('visits', 'interactions'))).toThrow(
      /disabled/
    )
    expect(() => createWidgetSchema.parse(formulaWidget('visits', 'visits'))).not.toThrow()
  })

  it('rejects a conversions formula when only the attribution flag is on', async () => {
    const { createWidgetSchema } = await loadSchemas({ ATTRIBUTION: 'true' })

    expect(() => createWidgetSchema.parse(formulaWidget('conversions', 'visits'))).toThrow(
      /disabled/
    )
    expect(() => createWidgetSchema.parse(formulaWidget('pageviews', 'visits'))).not.toThrow()
  })

  it('rejects a disabled source on update too', async () => {
    const { updateWidgetSchema } = await loadSchemas({ BEHAVIOR_ANALYTICS: 'true' })

    expect(() => updateWidgetSchema.parse({ name: 'Renamed' })).not.toThrow()
    expect(() =>
      updateWidgetSchema.parse({ config: standardWidget('pageviews').config })
    ).toThrow(/disabled/)
  })
})
