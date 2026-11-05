import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The filtered arrays are built once at module load from NEXT_PUBLIC_DISABLE_* variables,
 * so every case has to stub the environment and then re-import the module.
 */
async function loadWith(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, '')
    else vi.stubEnv(key, value)
  }
  const sources = await import('@/ee/features/dashboards/constants/data-source-config')
  const templates = await import('@/ee/features/dashboards/constants/templates')
  return { ...sources, ...templates }
}

describe('dashboards available data sources and templates', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps every source when no flag is set', async () => {
    const { AVAILABLE_DATA_SOURCES, AVAILABLE_DASHBOARD_TEMPLATES } = await loadWith({
      NEXT_PUBLIC_DISABLE_ATTRIBUTION: undefined,
      NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS: undefined,
    })

    expect(AVAILABLE_DATA_SOURCES).toEqual([
      'visits',
      'pageviews',
      'events',
      'interactions',
      'conversions',
    ])
    expect(AVAILABLE_DASHBOARD_TEMPLATES.map((t) => t.id)).toEqual([
      'blank',
      'link-performance',
      'website-analytics',
      'conversion-tracking',
      'engagement',
    ])
  })

  it('leaves only link data when both flags are on', async () => {
    const { AVAILABLE_DATA_SOURCES, AVAILABLE_WIDGET_TEMPLATES, AVAILABLE_DASHBOARD_TEMPLATES } =
      await loadWith({
        NEXT_PUBLIC_DISABLE_ATTRIBUTION: 'true',
        NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS: 'true',
      })

    expect(AVAILABLE_DATA_SOURCES).toEqual(['visits'])
    expect(AVAILABLE_WIDGET_TEMPLATES.every((w) => w.data_source === 'visits')).toBe(true)
    expect(AVAILABLE_DASHBOARD_TEMPLATES.map((t) => t.id)).toEqual(['blank', 'link-performance'])
  })

  it('drops conversions alone when only the attribution flag is on', async () => {
    const { AVAILABLE_DATA_SOURCES, AVAILABLE_DASHBOARD_TEMPLATES } = await loadWith({
      NEXT_PUBLIC_DISABLE_ATTRIBUTION: 'true',
      NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS: undefined,
    })

    expect(AVAILABLE_DATA_SOURCES).not.toContain('conversions')
    expect(AVAILABLE_DATA_SOURCES).toContain('pageviews')

    const ids = AVAILABLE_DASHBOARD_TEMPLATES.map((t) => t.id)
    expect(ids).not.toContain('conversion-tracking')
    expect(ids).toContain('website-analytics')
    // engagement mixes pageviews, interactions and events, none of which attribution hides
    expect(ids).toContain('engagement')
  })

  it('drops a dashboard template as soon as one of its widgets is hidden', async () => {
    const { AVAILABLE_DASHBOARD_TEMPLATES } = await loadWith({
      NEXT_PUBLIC_DISABLE_ATTRIBUTION: undefined,
      NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS: 'true',
    })

    const ids = AVAILABLE_DASHBOARD_TEMPLATES.map((t) => t.id)
    // engagement needs pageviews, interactions and events, so behavior analytics kills it
    expect(ids).not.toContain('engagement')
    expect(ids).not.toContain('website-analytics')
    expect(ids).toContain('conversion-tracking')
    expect(ids).toContain('blank')
  })
})
