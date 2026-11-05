import { BaseService } from './base.service'
import { SiteAnalyticsRepository, siteAnalyticsRepo } from '../repositories/site-analytics.repository'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'

export class SiteAnalyticsService extends BaseService<SiteAnalyticsRepository> {
  constructor(repo: SiteAnalyticsRepository) {
    super(repo)
  }

  async getPages(orgId: string, from: string, to: string) {
    await ensureOrgMember(orgId)
    return this.repo.getPages(orgId, from, to)
  }

  async getSessions(orgId: string, from: string, to: string) {
    await ensureOrgMember(orgId)
    return this.repo.getSessions(orgId, from, to)
  }

  async getSessionAnalytics(
    orgId: string,
    from: string,
    to: string,
    hostname?: string,
    page_path?: string,
  ) {
    await ensureOrgMember(orgId)
    return this.repo.getSessionAnalytics(orgId, from, to, hostname, page_path)
  }
}

export const siteAnalyticsService =
  process.env.NODE_ENV !== 'production'
    ? new SiteAnalyticsService(siteAnalyticsRepo)
    : (globalThis._siteAnalyticsService ??
        (globalThis._siteAnalyticsService = new SiteAnalyticsService(siteAnalyticsRepo)))
