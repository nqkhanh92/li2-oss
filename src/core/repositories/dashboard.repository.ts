import { supabaseService } from '@/infrastructure/database/supabase'

export class DashboardRepository {
  private query = () => supabaseService.from('dashboards')
  private widgetQuery = () => supabaseService.from('dashboard_widgets')
  private pinQuery = () => supabaseService.from('dashboard_pins')

  // ── Dashboard CRUD ──

  async findAccessible(orgId: string, userId: string) {
    // 1. Dashboards the user owns
    const { data: owned, error: e1 } = await this.query()
      .select('*, dashboard_widgets(id, name, widget_type, config, position)')
      .eq('organization_id', orgId)
      .eq('created_by', userId)
      .order('updated_at', { ascending: false })
    if (e1) throw e1

    // 2. Dashboards the user is a member of (restricted mode)
    const { data: memberOf, error: e2 } = await supabaseService
      .from('dashboard_members')
      .select('dashboard_id')
      .eq('user_id', userId)
    if (e2) throw e2
    const memberDashboardIds = (memberOf ?? []).map((m) => m.dashboard_id)

    let shared: typeof owned = []
    if (memberDashboardIds.length > 0) {
      // Member rows only grant list visibility for restricted-mode dashboards;
      // mirrors the predicate in dashboard-permission.service.ts resolveRole().
      const { data, error } = await this.query()
        .select('*, dashboard_widgets(id, name, widget_type, config, position)')
        .eq('organization_id', orgId)
        .eq('access_mode', 'restricted')
        .in('id', memberDashboardIds)
        .order('updated_at', { ascending: false })
      if (error) throw error
      shared = data ?? []
    }

    // 3. Everyone-mode dashboards (not already in owned or shared)
    const knownIds = new Set([
      ...(owned ?? []).map((d) => d.id),
      ...shared.map((d) => d.id),
    ])
    const { data: everyone, error: e3 } = await this.query()
      .select('*, dashboard_widgets(id, name, widget_type, config, position)')
      .eq('organization_id', orgId)
      .eq('access_mode', 'everyone')
      .order('updated_at', { ascending: false })
    if (e3) throw e3
    const everyoneNew = (everyone ?? []).filter((d) => !knownIds.has(d.id))

    // Merge and sort by updated_at descending
    const all = [...(owned ?? []), ...shared, ...everyoneNew]
    all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return all
  }

  async findById(orgId: string, dashboardId: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('id', dashboardId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findByIdWithWidgets(orgId: string, dashboardId: string) {
    const { data, error } = await this.query()
      .select('*, dashboard_widgets(*)')
      .eq('id', dashboardId)
      .eq('organization_id', orgId)
      .single()
    if (error) throw error
    return data
  }

  async create(input: {
    organization_id: string
    created_by: string
    name: string
    template_id: string | null
  }) {
    const { data, error } = await this.query()
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async update(orgId: string, dashboardId: string, input: {
    name?: string
    access_mode?: string
    default_role?: string
    created_by?: string
  }) {
    const { data, error } = await this.query()
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', dashboardId)
      .eq('organization_id', orgId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async delete(orgId: string, dashboardId: string) {
    const { error } = await this.query()
      .delete()
      .eq('id', dashboardId)
      .eq('organization_id', orgId)
    if (error) throw error
  }

  // ── Widget CRUD ──

  async createWidget(input: {
    dashboard_id: string
    name: string
    widget_type: string
    config: Record<string, unknown>
    formula_config?: Record<string, unknown> | null
    position: Record<string, unknown>
    date_override?: Record<string, unknown> | null
  }) {
    const { data, error } = await this.widgetQuery()
      .insert(input as any)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async createWidgets(inputs: {
    dashboard_id: string
    name: string
    widget_type: string
    config: Record<string, unknown>
    formula_config?: Record<string, unknown> | null
    position: Record<string, unknown>
    date_override?: Record<string, unknown> | null
  }[]) {
    if (inputs.length === 0) return
    const { error } = await this.widgetQuery().insert(inputs as any)
    if (error) throw error
  }

  async updateWidget(widgetId: string, dashboardId: string, input: Record<string, unknown>) {
    const { data, error } = await this.widgetQuery()
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', widgetId)
      .eq('dashboard_id', dashboardId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async deleteWidget(widgetId: string, dashboardId: string) {
    const { error } = await this.widgetQuery()
      .delete()
      .eq('id', widgetId)
      .eq('dashboard_id', dashboardId)
    if (error) throw error
  }

  async findWidget(widgetId: string, dashboardId: string) {
    const { data, error } = await this.widgetQuery()
      .select('*')
      .eq('id', widgetId)
      .eq('dashboard_id', dashboardId)
      .single()
    if (error) throw error
    return data
  }

  async updatePositions(positions: { widget_id: string; position: { x: number; y: number; w: number; h: number } }[]) {
    const now = new Date().toISOString()
    const results = await Promise.all(
      positions.map(({ widget_id, position }) =>
        this.widgetQuery()
          .update({ position, updated_at: now })
          .eq('id', widget_id)
      )
    )
    const firstError = results.find((r) => r.error)
    if (firstError?.error) throw firstError.error
  }

  // ── Pins ──

  async togglePin(dashboardId: string, userId: string) {
    // Check if pin exists
    const { data: existing } = await this.pinQuery()
      .select('*')
      .eq('dashboard_id', dashboardId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const { error } = await this.pinQuery()
        .delete()
        .eq('dashboard_id', dashboardId)
        .eq('user_id', userId)
      if (error) throw error
      return false // unpinned
    } else {
      const { error } = await this.pinQuery()
        .insert({ dashboard_id: dashboardId, user_id: userId })
      if (error) throw error
      return true // pinned
    }
  }

  async getPinnedIds(userId: string) {
    const { data, error } = await this.pinQuery()
      .select('dashboard_id')
      .eq('user_id', userId)
    if (error) throw error
    return data?.map((p) => p.dashboard_id) ?? []
  }
}

export const dashboardRepo =
  process.env.NODE_ENV !== 'production'
    ? new DashboardRepository()
    : (globalThis._dashboardRepo ?? (globalThis._dashboardRepo = new DashboardRepository()))
