import { supabaseService } from '@/infrastructure/database/supabase'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS, type OrgAdvancedFeatureKey } from '@/shared/types/plan-permission'
import type { DataSource, WidgetConfig, WidgetDataResult, FormulaConfig, FormulaMetricConfig, BatchWidgetResult } from '@/ee/features/dashboards/types'

/**
 * Per-data-source plan gate. Missing entries = Free tier (no gate).
 * `visits` is intentionally ungated — link click analytics is a Free feature.
 */
export const PLAN_GATE_MAP: Partial<Record<DataSource, OrgAdvancedFeatureKey>> = {
  pageviews: ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS,
  events: ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS,
  interactions: ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS,
  conversions: ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING,
}

const RPC_MAP: Partial<Record<DataSource, string>> = {
  visits: 'get_widget_data_visits',
  pageviews: 'get_widget_data_pageviews',
  events: 'get_widget_data_events',
  interactions: 'get_widget_data_interactions',
  conversions: 'get_widget_data_conversions',
}

export class WidgetDataService {
  /**
   * @param skipPlanGate - Set true when caller already verified plan access (e.g. batch route).
   *                       Avoids redundant DB round-trip for plan check.
   */
  async execute(
    orgId: string,
    config: WidgetConfig,
    dateRange: { date_from: string; date_to: string },
    { skipPlanGate = false }: { skipPlanGate?: boolean } = {}
  ): Promise<WidgetDataResult> {
    // Plan gate: per-data-source feature key
    if (!skipPlanGate) {
      const featureKey = PLAN_GATE_MAP[config.data_source]
      if (featureKey) {
        await ensureOrgPlan(orgId, featureKey)
      }
    }

    const rpcName = RPC_MAP[config.data_source]
    if (!rpcName) {
      throw new Error(`No RPC configured for data source: ${config.data_source}`)
    }

    const params: Record<string, unknown> = {
      _organization_id: orgId,
      _metric: config.metric,
      _group_by: config.group_by,
      _filters: config.filters,
      _date_from: dateRange.date_from,
      _date_to: dateRange.date_to,
    }

    if (config.data_source === 'pageviews') {
      params._exclude_bot = true
    }

    if (config.data_source === 'conversions' && config.display_currency) {
      params._target_currency = config.display_currency
    }

    const { data, error } = await supabaseService.rpc(rpcName as any, params as any)
    if (error) throw error

    // RPC returns JSONB { total: number, rows: [{label, value}, ...] }
    const result = typeof data === 'string' ? JSON.parse(data) : data
    return result as WidgetDataResult
  }
}

/**
 * Execute a formula widget: run 2 sub-metric RPCs and compute the result.
 * Used by both batch and preview routes.
 */
export async function executeFormula(
  orgId: string,
  formulaConfig: FormulaConfig,
  dateRange: { date_from: string; date_to: string },
): Promise<BatchWidgetResult> {
  const makeConfig = (m: FormulaMetricConfig): WidgetConfig => ({
    data_source: m.data_source,
    metric: m.metric,
    group_by: 'none',
    filters: m.filters ?? [],
    visualization: 'number',
    size: 'small',
  })

  const [resultA, resultB] = await Promise.all([
    widgetDataService.execute(orgId, makeConfig(formulaConfig.metric_a), dateRange, { skipPlanGate: true }),
    widgetDataService.execute(orgId, makeConfig(formulaConfig.metric_b), dateRange, { skipPlanGate: true }),
  ])

  const numerator = resultA?.total ?? 0
  const denominator = resultB?.total ?? 0

  if (formulaConfig.operator === '/' && denominator === 0) {
    return {
      result: null,
      error: null,
      errorCode: 'DIVISION_BY_ZERO',
      formula: { numerator, denominator, operator: formulaConfig.operator },
    }
  }

  let total: number
  switch (formulaConfig.operator) {
    case '+': total = numerator + denominator; break
    case '-': total = numerator - denominator; break
    case '*': total = numerator * denominator; break
    case '/': total = numerator / denominator; break
    default: return { result: null, error: `Unsupported operator: ${formulaConfig.operator}`, errorCode: 'RPC_ERROR', formula: null }
  }

  return {
    result: { total, rows: [] },
    error: null,
    errorCode: null,
    formula: { numerator, denominator, operator: formulaConfig.operator },
  }
}

export const widgetDataService =
  process.env.NODE_ENV !== 'production'
    ? new WidgetDataService()
    : (globalThis._widgetDataService ??
      (globalThis._widgetDataService = new WidgetDataService()))
