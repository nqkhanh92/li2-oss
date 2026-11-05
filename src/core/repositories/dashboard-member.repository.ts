import { supabaseService } from '@/infrastructure/database/supabase'

export class DashboardMemberRepository {
  private query = () => supabaseService.from('dashboard_members')

  async findByDashboard(dashboardId: string) {
    const { data, error } = await this.query()
      .select(`
        *,
        profile:profiles!dashboard_members_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('dashboard_id', dashboardId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  }

  async findMemberRole(dashboardId: string, userId: string) {
    const { data, error } = await this.query()
      .select('role')
      .eq('dashboard_id', dashboardId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data?.role as 'viewer' | 'editor' | null
  }

  async addMember(dashboardId: string, userId: string, role: 'viewer' | 'editor') {
    const { data, error } = await this.query()
      .insert({ dashboard_id: dashboardId, user_id: userId, role })
      .select(`
        *,
        profile:profiles!dashboard_members_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .single()
    if (error) throw error
    return data
  }

  async updateRole(memberId: string, dashboardId: string, role: 'viewer' | 'editor') {
    const { data, error } = await this.query()
      .update({ role })
      .eq('id', memberId)
      .eq('dashboard_id', dashboardId)
      .select(`
        *,
        profile:profiles!dashboard_members_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .single()
    if (error) throw error
    return data
  }

  async remove(memberId: string, dashboardId: string) {
    const { error } = await this.query()
      .delete()
      .eq('id', memberId)
      .eq('dashboard_id', dashboardId)
    if (error) throw error
  }

  async removeByUserId(dashboardId: string, userId: string) {
    const { error } = await this.query()
      .delete()
      .eq('dashboard_id', dashboardId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async removeAllByDashboard(dashboardId: string) {
    const { error } = await this.query()
      .delete()
      .eq('dashboard_id', dashboardId)
    if (error) throw error
  }
}

export const dashboardMemberRepo =
  process.env.NODE_ENV !== 'production'
    ? new DashboardMemberRepository()
    : (globalThis._dashboardMemberRepo ?? (globalThis._dashboardMemberRepo = new DashboardMemberRepository()))
