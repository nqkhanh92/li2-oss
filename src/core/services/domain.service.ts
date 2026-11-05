import { domainRepo, DomainRepository } from '../repositories/domain.repository'
import { Domain } from '../types/domain.type'
import { BaseService } from './base.service'
import { organizationService } from './organization.service'

export class DomainService extends BaseService<DomainRepository> {
  constructor(repo: DomainRepository) {
    super(repo)
  }

  public async findActiveDomainOrThrow(orgId: string, domainId: string): Promise<Domain> {
    return this.repo.findOrThrow(orgId, domainId)
  }

  public async getAllDomain(orgId: string): Promise<Domain[]> {
    return this.repo.getAllDomains(orgId)
  }

  public async findDefaultOrgDomain(orgId: string): Promise<Domain | null> {
    const org = await organizationService.getOrgById(orgId)

    if (org?.default_domain_id) {
      return await this.repo.findById(org.default_domain_id)
    } else {
      return await this.findDefaultSystemDomain()
    }
  }

  public async findDefaultSystemDomain(): Promise<Domain | null> {
    const domains = await this.repo.getDefaultDomains()
    const defaultDomain = domains.find((domain) => domain.default_selected)
    if (defaultDomain) {
      return defaultDomain
    }
    return null
  }

  public async getOrgDomains(orgId: string): Promise<Domain[]> {
    return this.repo.getOrgDomains(orgId)
  }
}

export const domainService = globalThis._domainService ?? new DomainService(domainRepo)

if (process.env.NODE_ENV !== 'production') globalThis._domainService = domainService
