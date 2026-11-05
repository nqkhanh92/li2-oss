import { NextResponse } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardPermissionService } from '@/core/services/dashboard-permission.service'
import { dashboardRepo } from '@/core/repositories/dashboard.repository'
import { widgetDataService, PLAN_GATE_MAP, executeFormula } from '@/core/services/widget-data.service'
import { getOrganizationPlan } from '@/shared/lib/plan/plans'
import { z } from 'zod'
import { resolveDateRange } from '@/ee/features/dashboards/utils/date-range'
import { AVAILABLE_DATA_SOURCES } from '@/ee/features/dashboards/constants/data-source-config'
import type { WidgetConfig, FormulaConfig, DateOverride, BatchWidgetResult } from '@/ee/features/dashboards/types'

const batchSchema = z.object({
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
})

export const POST = withAuth<{ org_id: string; dashboard_id: string }>(
  async (req, { params: { org_id, dashboard_id }, context }) => {
    await dashboardPermissionService.ensureViewer(org_id, dashboard_id, context.userId)

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = batchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 })
    }
    const { date_from, date_to } = parsed.data
    const globalRange = { date_from, date_to }

    const dashboard = await dashboardRepo.findByIdWithWidgets(org_id, dashboard_id)

    const orgPlan = await getOrganizationPlan(org_id)
    const allowedFeatures = orgPlan?.advanced_features_allowed ?? []

    const results: Record<string, BatchWidgetResult> = {}

    await Promise.all(
      dashboard.dashboard_widgets.map(async (widget) => {
        const widgetId = widget.id
        const dateOverride = widget.date_override as DateOverride | null
        const effectiveRange = dateOverride ? resolveDateRange(dateOverride) : globalRange

        // Formula widget execution
        if (widget.widget_type === 'formula') {
          const formulaConfig = widget.formula_config as unknown as FormulaConfig
          if (!formulaConfig) {
            results[widgetId] = { result: null, error: 'Missing formula_config', errorCode: 'RPC_ERROR' }
            return
          }

          // Feature flag gate: a widget saved before the flag was turned on still holds a
          // hidden data source, and its config never passes through widgetConfigSchema again
          const sources = [formulaConfig.metric_a.data_source, formulaConfig.metric_b.data_source]
          if (sources.some((source) => !AVAILABLE_DATA_SOURCES.includes(source))) {
            results[widgetId] = {
              result: null,
              error: 'Feature disabled',
              errorCode: 'FEATURE_DISABLED',
            }
            return
          }

          // Plan gate: check ALL unique feature keys from both sub-metrics
          const gates = new Set<string>()
          const gateA = PLAN_GATE_MAP[formulaConfig.metric_a.data_source]
          const gateB = PLAN_GATE_MAP[formulaConfig.metric_b.data_source]
          if (gateA) gates.add(gateA)
          if (gateB) gates.add(gateB)

          for (const featureKey of gates) {
            if (!allowedFeatures.includes(featureKey)) {
              results[widgetId] = { result: null, error: 'Plan required', errorCode: 'PLAN_GATE' }
              return
            }
          }

          try {
            const result = await executeFormula(org_id, formulaConfig, effectiveRange)
            results[widgetId] = result
          } catch (err: unknown) {
            results[widgetId] = {
              result: null,
              error: err instanceof Error ? err.message : 'Unknown error',
              errorCode: 'RPC_ERROR',
            }
          }
          return
        }

        // Standard widget execution
        const config = widget.config as unknown as WidgetConfig

        // Feature flag gate, before the plan gate: a widget saved before the flag was turned
        // on still holds a hidden data source, and stored config skips widgetConfigSchema
        if (!AVAILABLE_DATA_SOURCES.includes(config.data_source)) {
          results[widgetId] = {
            result: null,
            error: 'Feature disabled',
            errorCode: 'FEATURE_DISABLED',
          }
          return
        }

        // Per-widget plan gate via PLAN_GATE_MAP
        const gateKey = PLAN_GATE_MAP[config.data_source]
        if (gateKey && !allowedFeatures.includes(gateKey)) {
          results[widgetId] = { result: null, error: 'Plan required', errorCode: 'PLAN_GATE' }
          return
        }

        try {
          const data = await widgetDataService.execute(org_id, config, effectiveRange, { skipPlanGate: true })
          results[widgetId] = { result: data, error: null, errorCode: null }
        } catch (err: unknown) {
          results[widgetId] = {
            result: null,
            error: err instanceof Error ? err.message : 'Unknown error',
            errorCode: 'RPC_ERROR',
          }
        }
      }),
    )

    return APIResponse.ok({ data: results })
  },
)
