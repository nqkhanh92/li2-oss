import { NextResponse } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { dashboardPermissionService } from '@/core/services/dashboard-permission.service'
import { widgetDataService, executeFormula, PLAN_GATE_MAP } from '@/core/services/widget-data.service'
import { widgetConfigSchema, formulaConfigSchema } from '@/shared/schemas/dashboards'
import { getOrganizationPlan } from '@/shared/lib/plan/plans'
import { z } from 'zod'

const previewSchema = z.discriminatedUnion('widget_type', [
  z.object({
    widget_type: z.literal('standard'),
    config: widgetConfigSchema,
    date_from: z.string().datetime(),
    date_to: z.string().datetime(),
  }),
  z.object({
    widget_type: z.literal('formula'),
    formula_config: formulaConfigSchema,
    date_from: z.string().datetime(),
    date_to: z.string().datetime(),
  }),
])

export const POST = withAuth<{ org_id: string; dashboard_id: string }>(
  async (req, { params: { org_id, dashboard_id }, context }) => {
    await dashboardPermissionService.ensureEditor(org_id, dashboard_id, context.userId)

    let body
    try {
      body = await req.json()
    } catch {
      // Client aborted request mid-flight (signal cancellation) — body stream truncated
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const parsed = previewSchema.parse(body)
    const dateRange = { date_from: parsed.date_from, date_to: parsed.date_to }

    if (parsed.widget_type === 'formula') {
      // Plan gate: check all unique feature keys across both sub-metrics
      const orgPlan = await getOrganizationPlan(org_id)
      const allowedFeatures = orgPlan?.advanced_features_allowed ?? []
      const gates = new Set([
        PLAN_GATE_MAP[parsed.formula_config.metric_a.data_source],
        PLAN_GATE_MAP[parsed.formula_config.metric_b.data_source],
      ].filter(Boolean) as string[])
      for (const featureKey of gates) {
        if (!allowedFeatures.includes(featureKey)) {
          return APIResponse.ok({ data: { result: null, error: 'Plan required', errorCode: 'PLAN_GATE' } })
        }
      }
      const result = await executeFormula(org_id, parsed.formula_config, dateRange)
      return APIResponse.ok({ data: result })
    }

    const data = await widgetDataService.execute(org_id, parsed.config, dateRange)
    return APIResponse.ok({ data })
  },
)
