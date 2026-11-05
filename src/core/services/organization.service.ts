import { BaseService } from './base.service'
import { organizationRepo, OrganizationRepository } from '../repositories/organization.repository'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { Organization } from '../types/organization.type'
import { deletePlanCache, ensureUserPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'

/**
 * Service class for managing organizations in the proximity marketing system.
 * Handles organization retrieval, updates, and permission checks.
 *
 * @extends BaseService<OrganizationRepository>
 */
export class OrganizationService extends BaseService<OrganizationRepository> {
  /**
   * Creates an instance of OrganizationService.
   *
   * @param {OrganizationRepository} repo - The organization repository instance
   */
  constructor(repo: OrganizationRepository) {
    super(repo)
  }

  /**
   * Retrieves the first organization associated with a user.
   * Useful for getting the default organization when a user logs in.
   *
   * @param {string} userId - The user ID to search for
   * @returns {Promise<Organization | null>} The first organization found or null
   */
  public async getFirstOrgByUserId(userId: string) {
    return this.repo.getFirstOrgByUserId(userId)
  }

  public async getOrgBySlug(slug: string) {
    return this.repo.findBySlug(slug)
  }

  public async getUserOrgs(userId: string) {
    return this.repo.getUserOrgs(userId)
  }

  /**
   * Retrieves an organization by its ID.
   *
   * @param {string} id - The organization ID
   * @returns {Promise<Organization | null>} The organization details or null if not found
   */
  public async getOrgById(id: string) {
    return this.repo.findById(id)
  }

  /**
   * Updates an organization with the provided data.
   * Validates that the user has permission to manage the organization.
   *
   * @param {string} orgId - The organization ID to update
   * @param {Partial<Organization>} data - The partial organization data to update
   * @returns {Promise<Organization>} The updated organization
   * @throws {Error} When permission check fails
   */
  public async createOrganization(userId: string, data: { name: string; org_slug: string }) {
    await ensureUserPlan(PLAN_LIMIT_KEYS.MAX_ORGS_PER_USER)
    const org = await this.repo.create({ name: data.name, org_slug: data.org_slug, user_id: userId })
    await deletePlanCache()
    return org
  }

  public async updateOrganization(orgId: string, data: Partial<Organization>) {
    await ensurePolicy(orgId, nonScopePolicies.manage_organization)
    return this.repo.updateByIdentifier(orgId, data)
  }
}

export const organizationService =
  process.env.NODE_ENV !== 'production'
    ? new OrganizationService(organizationRepo)
    : (globalThis._organizationService ??
      (globalThis._organizationService = new OrganizationService(organizationRepo)))
