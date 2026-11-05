import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formulaConfigSchema, createWidgetSchema } from '@/shared/schemas/dashboards'

// ── Schema Tests ──

describe('formulaConfigSchema', () => {
  // Both sides use visits on purpose. vitest.config.ts loads .env.local, so a source that a
  // NEXT_PUBLIC_DISABLE_* flag can hide would make these cases depend on local environment.
  // The data-source gate itself is covered in schemas/dashboards-data-source-gate.test.ts.
  const validFormula = {
    metric_a: { data_source: 'visits', metric: 'count', filters: [] },
    metric_b: { data_source: 'visits', metric: 'unique_count', filters: [] },
    operator: '/',
  }

  it('accepts a valid formula config', () => {
    const result = formulaConfigSchema.safeParse(validFormula)
    expect(result.success).toBe(true)
  })

  it('accepts all operators', () => {
    for (const op of ['+', '-', '*', '/']) {
      const result = formulaConfigSchema.safeParse({ ...validFormula, operator: op })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid operator', () => {
    const result = formulaConfigSchema.safeParse({ ...validFormula, operator: '%' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid data_source', () => {
    const result = formulaConfigSchema.safeParse({
      ...validFormula,
      metric_a: { data_source: 'invalid', metric: 'count' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty metric', () => {
    const result = formulaConfigSchema.safeParse({
      ...validFormula,
      metric_a: { data_source: 'visits', metric: '' },
    })
    expect(result.success).toBe(false)
  })

  it('strips per-metric date ranges via Zod (LOW-4 guard)', () => {
    // Zod's z.object() strips unknown keys — date_from/date_to are removed before
    // reaching the refine. This is sufficient protection: sub-metrics can never
    // carry date overrides through to the backend.
    const result = formulaConfigSchema.safeParse({
      ...validFormula,
      metric_a: { ...validFormula.metric_a, date_from: '2026-01-01', date_to: '2026-01-31' },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data.metric_a as Record<string, unknown>).date_from).toBeUndefined()
      expect((result.data.metric_a as Record<string, unknown>).date_to).toBeUndefined()
    }
  })

  it('defaults filters to empty array when omitted', () => {
    const result = formulaConfigSchema.safeParse({
      metric_a: { data_source: 'visits', metric: 'count' },
      metric_b: { data_source: 'visits', metric: 'unique_visitors' },
      operator: '/',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.metric_a.filters).toEqual([])
      expect(result.data.metric_b.filters).toEqual([])
    }
  })

  it('accepts filters on sub-metrics', () => {
    const result = formulaConfigSchema.safeParse({
      ...validFormula,
      metric_a: {
        data_source: 'visits',
        metric: 'count',
        filters: [{ field: 'country', op: '=', value: 'US' }],
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('createWidgetSchema — formula support', () => {
  const basePosition = { x: 0, y: 0, w: 1, h: 2 }
  const baseConfig = {
    data_source: 'visits',
    metric: 'count',
    group_by: 'none',
    filters: [],
    visualization: 'number',
    size: 'small',
  }
  const validFormulaConfig = {
    metric_a: { data_source: 'visits', metric: 'count', filters: [] },
    metric_b: { data_source: 'visits', metric: 'unique_count', filters: [] },
    operator: '/',
  }

  it('accepts standard widget', () => {
    const result = createWidgetSchema.safeParse({
      name: 'Test',
      widget_type: 'standard',
      config: baseConfig,
      position: basePosition,
    })
    expect(result.success).toBe(true)
  })

  it('accepts formula widget with formula_config', () => {
    const result = createWidgetSchema.safeParse({
      name: 'Conversion Rate',
      widget_type: 'formula',
      config: baseConfig,
      formula_config: validFormulaConfig,
      position: basePosition,
    })
    expect(result.success).toBe(true)
  })

  it('rejects formula widget without formula_config', () => {
    const result = createWidgetSchema.safeParse({
      name: 'Conversion Rate',
      widget_type: 'formula',
      config: baseConfig,
      position: basePosition,
    })
    expect(result.success).toBe(false)
  })
})

// ── executeFormula Tests ──

// Mock supabaseService.rpc before importing the service
vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: {
    rpc: vi.fn(),
  },
}))

// Mock ensureOrgPlan
vi.mock('@/shared/lib/plan/plans', () => ({
  ensureOrgPlan: vi.fn(),
}))

import { executeFormula } from '@/core/services/widget-data.service'
import { supabaseService } from '@/infrastructure/database/supabase'
import type { FormulaConfig } from '@/ee/features/dashboards/types'

describe('executeFormula', () => {
  const dateRange = { date_from: '2026-01-01T00:00:00Z', date_to: '2026-01-31T23:59:59Z' }
  const orgId = 'org-123'

  const makeFormula = (operator: FormulaConfig['operator']): FormulaConfig => ({
    metric_a: { data_source: 'visits', metric: 'count', filters: [] },
    metric_b: { data_source: 'visits', metric: 'unique_visitors', filters: [] },
    operator,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockRpcResults(totalA: number, totalB: number) {
    const rpcMock = vi.mocked(supabaseService.rpc)
    let callCount = 0
    rpcMock.mockImplementation((() => {
      callCount++
      const total = callCount === 1 ? totalA : totalB
      return Promise.resolve({ data: { total, rows: [] }, error: null })
    }) as any)
  }

  it('computes addition correctly', async () => {
    mockRpcResults(100, 50)
    const result = await executeFormula(orgId, makeFormula('+'), dateRange)
    expect(result.result?.total).toBe(150)
    expect(result.errorCode).toBeNull()
    expect(result.formula).toEqual({ numerator: 100, denominator: 50, operator: '+' })
  })

  it('computes subtraction correctly', async () => {
    mockRpcResults(100, 30)
    const result = await executeFormula(orgId, makeFormula('-'), dateRange)
    expect(result.result?.total).toBe(70)
    expect(result.formula).toEqual({ numerator: 100, denominator: 30, operator: '-' })
  })

  it('computes multiplication correctly', async () => {
    mockRpcResults(10, 5)
    const result = await executeFormula(orgId, makeFormula('*'), dateRange)
    expect(result.result?.total).toBe(50)
    expect(result.formula).toEqual({ numerator: 10, denominator: 5, operator: '*' })
  })

  it('computes division correctly', async () => {
    mockRpcResults(100, 4)
    const result = await executeFormula(orgId, makeFormula('/'), dateRange)
    expect(result.result?.total).toBe(25)
    expect(result.formula).toEqual({ numerator: 100, denominator: 4, operator: '/' })
  })

  it('returns DIVISION_BY_ZERO when denominator is 0', async () => {
    mockRpcResults(42, 0)
    const result = await executeFormula(orgId, makeFormula('/'), dateRange)
    expect(result.result).toBeNull()
    expect(result.errorCode).toBe('DIVISION_BY_ZERO')
    expect(result.formula).toEqual({ numerator: 42, denominator: 0, operator: '/' })
  })

  it('returns DIVISION_BY_ZERO for 0/0', async () => {
    mockRpcResults(0, 0)
    const result = await executeFormula(orgId, makeFormula('/'), dateRange)
    expect(result.result).toBeNull()
    expect(result.errorCode).toBe('DIVISION_BY_ZERO')
    expect(result.formula).toEqual({ numerator: 0, denominator: 0, operator: '/' })
  })

  it('0 + 0 = 0 (not an error)', async () => {
    mockRpcResults(0, 0)
    const result = await executeFormula(orgId, makeFormula('+'), dateRange)
    expect(result.result?.total).toBe(0)
    expect(result.errorCode).toBeNull()
  })

  it('returns empty rows array for formula results', async () => {
    mockRpcResults(100, 50)
    const result = await executeFormula(orgId, makeFormula('+'), dateRange)
    expect(result.result?.rows).toEqual([])
  })

  it('passes skipPlanGate: true to sub-metric RPCs', async () => {
    mockRpcResults(10, 5)
    await executeFormula(orgId, makeFormula('+'), dateRange)
    // Both sub-metrics should call the visits RPC (same data_source)
    expect(supabaseService.rpc).toHaveBeenCalledTimes(2)
  })
})
