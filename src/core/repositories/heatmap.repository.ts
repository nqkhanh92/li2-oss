import { supabaseService } from '@/infrastructure/database/supabase'
import type { HeatmapClicksResponse, TopInteractionPage, RageClickElement, ScrollHeatmapResponse } from '@/ee/features/heatmap/types'

export class HeatmapRepository {
  async getHeatmapClicks(
    orgId: string,
    pagePath: string,
    from: string,
    to: string,
    deviceType?: string,
    gridSize: number = 10,
    hostname?: string,
    targetWidth: number = 1440,
    tpId?: string,
    targetHeight?: number
  ): Promise<HeatmapClicksResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseService.rpc as any)('get_heatmap_clicks_v2', {
      _org_id: orgId,
      _page_path: pagePath,
      _from: from,
      _to: to,
      _device_type: deviceType,
      _grid_size: gridSize,
      _hostname: hostname,
      _target_width: targetWidth,
      _tp_id: tpId,
      // _target_height added by migration 20260507000001; cast until types are regenerated
      _target_height: targetHeight ?? null,
    })
    if (error) throw error
    return data as unknown as HeatmapClicksResponse
  }

  async getRageClickSummary(
    orgId: string,
    pagePath: string,
    from: string,
    to: string,
    deviceType?: string,
    hostname?: string,
    tpId?: string
  ): Promise<RageClickElement[]> {
    const { data, error } = await supabaseService.rpc('get_rage_click_summary', {
      _org_id: orgId,
      _page_path: pagePath,
      _from: from,
      _to: to,
      _device_type: deviceType,
      _hostname: hostname,
      _tp_id: tpId,
    })
    if (error) throw error
    return data as unknown as RageClickElement[]
  }

  async getScrollHeatmap(
    orgId: string,
    pagePath: string | undefined,
    from: string,
    to: string,
    deviceType?: string,
    hostname?: string,
  ): Promise<ScrollHeatmapResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseService.rpc as any)('get_scroll_heatmap_v2', {
      p_organization_id: orgId,
      p_page_path: (pagePath ?? null) as string,
      p_from: from,
      p_to: to,
      p_device_type: deviceType,
      p_hostname: hostname,
    })
    if (error) throw error
    const rows = data as { scroll_depth_percent: number; sessions_reached: number; avg_time_at_depth: number; total_sessions: number }[]
    const totalSessions = rows.length > 0 ? (rows[0].total_sessions ?? 0) : 0
    return {
      total_sessions: totalSessions,
      milestones: rows.map((r) => ({
        scroll_depth_percent: r.scroll_depth_percent,
        sessions_reached: r.sessions_reached,
        pct_of_total: totalSessions > 0 ? Math.round((r.sessions_reached / totalSessions) * 100) : 0,
        avg_time_at_depth: r.avg_time_at_depth,
      })),
    }
  }

  async getTopPages(
    orgId: string,
    from: string,
    to: string,
    limit: number = 200,
    tpId?: string
  ): Promise<TopInteractionPage[]> {
    const { data, error } = await supabaseService.rpc('get_top_interaction_pages', {
      _org_id: orgId,
      _from: from,
      _to: to,
      _limit: limit,
      _tp_id: tpId,
    })
    if (error) throw error
    return data as unknown as TopInteractionPage[]
  }
}

export const heatmapRepo =
  process.env.NODE_ENV !== 'production'
    ? new HeatmapRepository()
    : (globalThis._heatmapRepo ?? (globalThis._heatmapRepo = new HeatmapRepository()))
