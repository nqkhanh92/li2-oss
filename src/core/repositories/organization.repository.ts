import { TablesUpdate } from '@/shared/types/database.types'
import { Organization } from '../types/organization.type'
import { BaseRepository } from './base.repository'
import { validate } from 'uuid'

export class OrganizationRepository extends BaseRepository<'organizations'> {
  constructor() {
    super('organizations')
  }

  async getOrgFromUserId(userId: string) {
    const { data, error } = await this.query().select('*').eq('user_id', userId).single()
    if (error) throw error
    return data
  }
  async getFirstOrgByUserId(userId: string) {
    return this.query().select('*').eq('user_id', userId).limit(1).single<Organization>()
  }
  async findBySlug(slug: string) {
    return this.query().select('*').eq('org_slug', slug).limit(1).single<Organization>()
  }

  async updateByIdentifier(identifier: string, _data: TablesUpdate<'organizations'>) {
    let query = this.query().update(_data)
    if (validate(identifier)) {
      query = query.eq('id', identifier)
    } else {
      query = query.eq('org_slug', identifier)
    }
    const { data, error } = await query.select('*').single()
    if (error) throw error
    return data
  }

  async getUserOrgs(userId: string) {
    const { data, error } = await this.query()
      .select('*, org_members!inner(*)')
      .eq('org_members.user_id', userId)
    if (error) throw error
    return data
  }
}

export const organizationRepo =
  process.env.NODE_ENV !== 'production'
    ? new OrganizationRepository()
    : (globalThis._organizationRepo ??
      (globalThis._organizationRepo = new OrganizationRepository()))
