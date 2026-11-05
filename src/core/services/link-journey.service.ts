import { BaseService } from './base.service'
import { LinkJourneyRepository, linkJourneyRepo } from '../repositories/link-journey.repository'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'

export class LinkJourneyService extends BaseService<LinkJourneyRepository> {
  constructor(repo: LinkJourneyRepository) {
    super(repo)
  }

  async getTouchPoints(orgId: string) {
    await ensureOrgMember(orgId)
    return this.repo.getTouchPoints(orgId)
  }

  async getTrafficSummary(orgId: string, tpId: string, from: string, to: string) {
    await ensureOrgMember(orgId)
    return this.repo.getTrafficSummary(orgId, tpId, from, to)
  }

  async getPageFlow(orgId: string, tpId: string, from: string, to: string, limit?: number) {
    await ensureOrgMember(orgId)
    return this.repo.getPageFlow(orgId, tpId, from, to, limit)
  }

  async getBehavioral(orgId: string, tpId: string, from: string, to: string) {
    await ensureOrgMember(orgId)
    return this.repo.getBehavioral(orgId, tpId, from, to)
  }

  async getConversions(orgId: string, tpId: string, from: string, to: string) {
    await ensureOrgMember(orgId)
    return this.repo.getConversions(orgId, tpId, from, to)
  }
}

export const linkJourneyService =
  process.env.NODE_ENV !== 'production'
    ? new LinkJourneyService(linkJourneyRepo)
    : (globalThis._linkJourneyService ??
        (globalThis._linkJourneyService = new LinkJourneyService(linkJourneyRepo)))
