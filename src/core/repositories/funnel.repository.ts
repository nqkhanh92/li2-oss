import { supabaseService } from '@/infrastructure/database/supabase'
import { SearchFilterPagination } from '@/shared/types'
import { queryBuilderByParams } from '@/shared/lib/utils'
import type { FunnelResultRow } from '@/ee/features/funnels/types'

export class FunnelRepository {
  private query = () => supabaseService.from('funnels')
  private stepsQuery = () => supabaseService.from('funnel_steps')

  async findAllByOrg(orgId: string, queryParams?: SearchFilterPagination) {
    let query = this.query()
      .select('*, funnel_steps(count)', { count: 'exact' })
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (queryParams?.search) {
      query = query.ilike('name', `%${queryParams.search}%`)
    }

    if (queryParams) {
      query = queryBuilderByParams(query, queryParams)
    }

    // Default sort by created_at desc if no sorting specified
    if (!queryParams?.sorting?.length) {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  }

  async getFunnelListStats(orgId: string) {
    const { data, error } = await supabaseService.rpc('get_funnel_list_stats', { p_org_id: orgId })
    if (error) throw error
    return (data ?? []) as Array<{
      funnel_id: string
      total_entries: number
      total_conversions: number
      conversion_rate: number
      cvr_trend: number | null
      biggest_dropoff_step_position: number | null
      biggest_dropoff_step_name: string | null
      biggest_dropoff_next_step_name: string | null
      biggest_dropoff_drop_offs: number | null
      biggest_dropoff_rate: number | null
    }>
  }

  async findByIdWithSteps(orgId: string, funnelId: string) {
    const { data, error } = await this.query()
      .select('*, funnel_steps(*)')
      .eq('id', funnelId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single()
    if (error) throw error
    return data
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
    // Create funnel
    const { data: funnel, error: funnelError } = await this.query()
      .insert({
        organization_id: orgId,
        created_by: userId,
        name: data.name,
        description: data.description ?? null,
        is_active: true,
        ...(source && { source }),
      })
      .select('*')
      .single()
    if (funnelError) throw funnelError

    // Create steps
    if (steps.length > 0) {
      const { error: stepsError } = await this.stepsQuery().insert(
        steps.map((s) => ({
          funnel_id: funnel.id,
          position: s.position,
          name: s.name,
          pattern_type: s.pattern_type,
          condition: s.condition,
          pattern: s.pattern,
          is_required: s.is_required,
          event_name: s.event_name ?? null,
        }))
      )
      if (stepsError) throw stepsError
    }

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
    // Update funnel
    const { data: funnel, error: funnelError } = await this.query()
      .update({
        name: data.name,
        description: data.description ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', funnelId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (funnelError) throw funnelError

    // Replace steps: delete old, insert new
    const { error: deleteError } = await this.stepsQuery()
      .delete()
      .eq('funnel_id', funnelId)
    if (deleteError) throw deleteError

    if (steps.length > 0) {
      const { error: stepsError } = await this.stepsQuery().insert(
        steps.map((s) => ({
          funnel_id: funnelId,
          position: s.position,
          name: s.name,
          pattern_type: s.pattern_type,
          condition: s.condition,
          pattern: s.pattern,
          is_required: s.is_required,
          event_name: s.event_name ?? null,
        }))
      )
      if (stepsError) throw stepsError
    }

    return funnel
  }

  private resultsQuery = () => supabaseService.from('funnel_results')

  async getReportResults(orgId: string, funnelId: string, from: string, to: string) {
    const { data, error } = await this.resultsQuery()
      .select('*')
      .eq('funnel_id', funnelId)
      .eq('organization_id', orgId)
      .gte('period_start', from)
      .lte('period_start', to)
      .order('period_start', { ascending: true })
    if (error) throw error
    return data
  }

  async hasPageviewsInPeriod(orgId: string, from: string, to: string): Promise<boolean> {
    const { data, error } = await supabaseService
      .from('pageviews')
      .select('id')
      .eq('organization_id', orgId)
      .gte('timestamp', `${from}T00:00:00Z`)
      .lte('timestamp', `${to}T23:59:59.999Z`)
      .limit(1)
    if (error) throw error
    return (data?.length ?? 0) > 0
  }

  async hasComputationResults(orgId: string, funnelId: string, from: string, to: string): Promise<boolean> {
    const { data, error } = await this.resultsQuery()
      .select('id')
      .eq('funnel_id', funnelId)
      .eq('organization_id', orgId)
      .gte('period_start', from)
      .lte('period_start', to)
      .limit(1)
    if (error) throw error
    return (data?.length ?? 0) > 0
  }

  async getStepVisitors(
    orgId: string,
    funnelId: string,
    stepPosition: number,
    from: string,
    to: string,
    filter: string,
    page: number,
    limit: number
  ) {
    const { data, error } = await supabaseService.rpc('get_step_visitors', {
      _org_id: orgId,
      _funnel_id: funnelId,
      _step_position: stepPosition,
      _period_start: from,
      _period_end: to,
      _filter: filter,
      _page: page,
      _limit: limit,
    })
    if (error) throw error
    return data
  }

  async getSessionWithPageviews(orgId: string, sessionId: string) {
    // Get session
    const { data: session, error: sessionError } = await supabaseService
      .from('sessions')
      .select(
        'session_id, visitor_id, browser, browser_version, os, os_version, device_type, country, region, city, referrer_domain, started_at, ended_at, duration_ms, page_count, entry_page, exit_page, is_bounce'
      )
      .eq('organization_id', orgId)
      .eq('session_id', sessionId)
      .single()
    if (sessionError) throw sessionError

    // Get pageviews (and custom events) for this session
    const { data: pageviews, error: pvError } = await supabaseService
      .from('pageviews')
      .select('id, page_path, page_url, page_title, search_query, event_name, tp_id, li2_cid, timestamp, time_on_page')
      .eq('organization_id', orgId)
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
    if (pvError) throw pvError

    const clickIds = (pageviews ?? [])
      .map((pv) => pv.li2_cid)
      .filter((id): id is string => !!id)

    let convRows: {
      id: string; page_path: string; page_url: string; page_title: null;
      search_query: null; event_name: null; tp_id: string | null;
      li2_cid: null; event_type: string | null; timestamp: string; time_on_page: null
    }[] = []

    // Fetch by click_id and session_id separately, then deduplicate by id
    const convByClickId = clickIds.length > 0
      ? await supabaseService
          .from('conversion_events')
          .select('id, event_type, created_at, touch_point_id')
          .eq('organization_id', orgId)
          .in('click_id', clickIds)
      : { data: [], error: null }
    if (convByClickId.error) throw convByClickId.error

    const convBySessionId = session
      ? await supabaseService
          .from('conversion_events')
          .select('id, event_type, created_at, touch_point_id')
          .eq('organization_id', orgId)
          .eq('session_id', session.session_id)
      : { data: [], error: null }
    if (convBySessionId.error) throw convBySessionId.error

    const seenIds = new Set<string>()
    const allConversions = [...(convByClickId.data ?? []), ...(convBySessionId.data ?? [])]
      .filter((c) => { if (seenIds.has(c.id)) return false; seenIds.add(c.id); return true })

    convRows = allConversions.map((c) => ({
      id: c.id,
      page_path: '',
      page_url: '',
      page_title: null,
      search_query: null,
      event_name: null,
      tp_id: c.touch_point_id,
      li2_cid: null,
      event_type: c.event_type as string | null,
      timestamp: c.created_at,
      time_on_page: null,
    }))

    // Map pageviews — event_type is not a column on pageviews table
    const pvRows = (pageviews ?? []).map((pv) => ({ ...pv, event_type: null as string | null }))

    // Merge and sort chronologically
    const allPageviews = [...pvRows, ...convRows].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return { session, pageviews: allPageviews }
  }

  async softDelete(orgId: string, funnelId: string) {
    const { data, error } = await this.query()
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', funnelId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error) throw error
    return data
  }
}

export const funnelRepo =
  process.env.NODE_ENV !== 'production'
    ? new FunnelRepository()
    : (globalThis._funnelRepo ?? (globalThis._funnelRepo = new FunnelRepository()))
