import { BaseService } from './base.service'
import { FunnelRepository, funnelRepo } from '../repositories/funnel.repository'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { SearchFilterPagination } from '@/shared/types'
import type { FunnelListItem, FunnelReportResult, FunnelResultRow, StepMetrics } from '@/ee/features/funnels/types'
import { enqueueFunnelRetroactiveTask } from '@/infrastructure/queue/funnel-queue'

export class FunnelService extends BaseService<FunnelRepository> {
  constructor(repo: FunnelRepository) {
    super(repo)
  }

  async findAll(orgId: string, queryParams?: SearchFilterPagination) {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_FUNNELS)
    return this.repo.findAllByOrg(orgId, queryParams)
  }

  async findAllWithStats(orgId: string, queryParams?: SearchFilterPagination): Promise<{ data: FunnelListItem[]; count: number | null }> {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_FUNNELS)

    const [{ data: funnels, count }, statsRows] = await Promise.all([
      this.repo.findAllByOrg(orgId, queryParams),
      this.repo.getFunnelListStats(orgId),
    ])

    const statsMap = new Map(statsRows.map((r) => [r.funnel_id, r]))

    const data: FunnelListItem[] = (funnels ?? []).map((funnel) => {
      const s = statsMap.get(funnel.id)
      return {
        ...funnel,
        stats: s
          ? {
              total_entries: s.total_entries,
              total_conversions: s.total_conversions,
              conversion_rate: s.conversion_rate,
              cvr_trend: s.cvr_trend,
              biggest_dropoff_step_position: s.biggest_dropoff_step_position,
              biggest_dropoff_step_name: s.biggest_dropoff_step_name,
              biggest_dropoff_next_step_name: s.biggest_dropoff_next_step_name,
              biggest_dropoff_drop_offs: s.biggest_dropoff_drop_offs,
              biggest_dropoff_rate: s.biggest_dropoff_rate,
            }
          : null,
      }
    })

    return { data, count }
  }

  async findByIdWithSteps(orgId: string, funnelId: string) {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_FUNNELS)
    return this.repo.findByIdWithSteps(orgId, funnelId)
  }

  async create(
    orgId: string,
    userId: string,
    data: { name: string; description?: string | null },
    steps: Array<{
      position: number
      name: string
      pattern_type: string
      condition: string
      pattern: string
      is_required: boolean
      event_name?: string | null
    }>,
    source?: string
  ) {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.ADD_FUNNEL)
    const funnel = await this.repo.create(orgId, userId, data, steps, source)

    // Trigger retroactive computation (fire-and-forget)
    enqueueFunnelRetroactiveTask(funnel.id, orgId)

    return funnel
  }

  async update(
    orgId: string,
    funnelId: string,
    data: { name: string; description?: string | null },
    steps: Array<{
      position: number
      name: string
      pattern_type: string
      condition: string
      pattern: string
      is_required: boolean
      event_name?: string | null
    }>
  ) {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_FUNNEL)
    const funnel = await this.repo.update(orgId, funnelId, data, steps)

    // Re-trigger retroactive computation (worker deletes old results then recomputes)
    enqueueFunnelRetroactiveTask(funnelId, orgId)

    return funnel
  }

  async softDelete(orgId: string, funnelId: string) {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_FUNNEL)
    return this.repo.softDelete(orgId, funnelId)
  }

  async getStepVisitors(
    orgId: string,
    funnelId: string,
    stepPosition: number,
    params: { from: string; to: string; filter: string; page: number; limit: number }
  ) {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_FUNNELS)
    const rows = await this.repo.getStepVisitors(
      orgId,
      funnelId,
      stepPosition,
      params.from,
      params.to,
      params.filter,
      params.page,
      params.limit
    )

    const total = rows?.[0]?.total_count ?? 0
    // Strip total_count from each row before returning
    const visitors = (rows ?? []).map(({ total_count, ...rest }: any) => rest)

    return { visitors, total: Number(total), page: params.page }
  }

  async getSessionDetail(orgId: string, sessionId: string) {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_FUNNELS)
    return this.repo.getSessionWithPageviews(orgId, sessionId)
  }

  async getReport(
    orgId: string,
    funnelId: string,
    from: string,
    to: string
  ): Promise<FunnelReportResult> {
    await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_FUNNELS)

    const funnel = await this.repo.findByIdWithSteps(orgId, funnelId)
    const rows = (await this.repo.getReportResults(orgId, funnelId, from, to)) as FunnelResultRow[]

    // Check if computation covers the full date range (one row per day)
    const expectedDays = Math.ceil(
      (new Date(to).getTime() - new Date(from).getTime()) / 86400000
    ) + 1
    const isComplete = (rows?.length ?? 0) >= expectedDays

    let report: FunnelReportResult

    if (!rows || rows.length === 0) {
      report = {
        funnel_id: funnelId,
        funnel_name: funnel.name,
        period_start: from,
        period_end: to,
        total_entries: 0,
        total_conversions: 0,
        conversion_rate: 0,
        steps: funnel.funnel_steps
          .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
          .map((s: { position: number; name: string }) => ({
            step_position: s.position,
            step_name: s.name,
            visits: 0,
            entries: 0,
            proceeds: 0,
            drop_offs: 0,
            drop_off_rate: 0,
            skips: 0,
          })),
        has_pageviews_in_period: false,
        has_computation_results: false,
        is_computation_complete: false,
      }
    } else if (rows.length === 1) {
      const row = rows[0]
      report = {
        funnel_id: funnelId,
        funnel_name: funnel.name,
        period_start: from,
        period_end: to,
        total_entries: row.total_entries,
        total_conversions: row.total_conversions,
        conversion_rate: row.conversion_rate,
        steps: row.step_metrics,
        has_pageviews_in_period: true,
        has_computation_results: true,
        is_computation_complete: isComplete,
      }
    } else {
      const aggregated = this.aggregateResults(rows)
      report = {
        funnel_id: funnelId,
        funnel_name: funnel.name,
        period_start: from,
        period_end: to,
        ...aggregated,
        has_pageviews_in_period: true,
        has_computation_results: true,
        is_computation_complete: isComplete,
      }
    }

    // Only check pageviews/computation when there's no funnel data
    if (report.total_entries === 0) {
      const [hasPageviews, hasComputation] = await Promise.all([
        this.repo.hasPageviewsInPeriod(orgId, from, to),
        this.repo.hasComputationResults(orgId, funnelId, from, to),
      ])
      report.has_pageviews_in_period = hasPageviews
      report.has_computation_results = hasComputation
    }

    return report
  }

  private aggregateResults(rows: FunnelResultRow[]) {
    const stepMap = new Map<number, StepMetrics>()

    for (const row of rows) {
      for (const step of row.step_metrics) {
        const existing = stepMap.get(step.step_position)
        if (existing) {
          existing.visits += step.visits
          existing.entries += step.entries
          existing.proceeds += step.proceeds
          existing.drop_offs += step.drop_offs
          existing.skips += step.skips
        } else {
          stepMap.set(step.step_position, { ...step })
        }
      }
    }

    // Recalculate drop-off rates after aggregation
    const steps = Array.from(stepMap.values()).sort(
      (a, b) => a.step_position - b.step_position
    )
    for (const step of steps) {
      step.drop_off_rate = step.visits > 0 ? (step.drop_offs / step.visits) * 100 : 0
    }

    const totalEntries = steps[0]?.visits ?? 0
    const lastStep = steps[steps.length - 1]
    const totalConversions = lastStep?.proceeds ?? lastStep?.visits ?? 0
    const conversionRate = totalEntries > 0 ? (totalConversions / totalEntries) * 100 : 0

    return {
      total_entries: totalEntries,
      total_conversions: totalConversions,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      steps,
    }
  }
}

export const funnelService =
  process.env.NODE_ENV !== 'production'
    ? new FunnelService(funnelRepo)
    : (globalThis._funnelService ?? (globalThis._funnelService = new FunnelService(funnelRepo)))
