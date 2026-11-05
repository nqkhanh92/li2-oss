import { supabaseService } from '@/infrastructure/database/supabase'
import type { SitePage, SitePageSession, SessionAnalytics } from '@/ee/features/site-analytics/types'

export class SiteAnalyticsRepository {
  async getPages(
    orgId: string,
    from: string,
    to: string,
    limit: number = 500,
  ): Promise<SitePage[]> {
    const { data, error } = await supabaseService.rpc('get_top_interaction_pages', {
      _org_id: orgId,
      _from: from,
      _to: to,
      _limit: limit,
    })
    if (error) throw error
    return data as unknown as SitePage[]
  }

  async getSessions(
    orgId: string,
    from: string,
    to: string,
    limit: number = 500,
  ): Promise<SitePageSession[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseService as any).rpc('get_site_page_sessions', {
      _org_id: orgId,
      _from: from,
      _to: to,
      _limit: limit,
    })
    if (error) throw error
    return data as unknown as SitePageSession[]
  }

  async getSessionAnalytics(
    orgId: string,
    from: string,
    to: string,
    hostname?: string,
    page_path?: string,
  ): Promise<SessionAnalytics> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseService as any).rpc('get_session_analytics', {
      _org_id: orgId,
      _from: from,
      _to: to,
      _hostname: hostname ?? null,
      _page_path: page_path ?? null,
    })
    if (error) throw error
    return data as SessionAnalytics
  }
}

export const siteAnalyticsRepo =
  process.env.NODE_ENV !== 'production'
    ? new SiteAnalyticsRepository()
    : (globalThis._siteAnalyticsRepo ??
        (globalThis._siteAnalyticsRepo = new SiteAnalyticsRepository()))
