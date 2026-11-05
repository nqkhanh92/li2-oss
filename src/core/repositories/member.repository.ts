import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { BaseRepository } from './base.repository'

export class MemberRepository extends BaseRepository<'org_members'> {
  constructor() {
    super('org_members')
  }

  async findByEmail(email: string, orgId: string) {
    const { data, error } = await this.query()
      .select('*, user_id!inner(*)')
      .eq('user_id.email', email)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) throw error
    return data
  }
  async getByOrgId(orgId: string) {
    const { data, error } = await this.query()
      .select('*, role_id(id, name), user_id(id, email)')
      .eq('org_id', orgId)
    if (error) throw error
    return data
  }

  async createOrUpdate(_data: TablesInsert<'org_members'>) {
    const { data, error } = await this.query()
      .upsert(_data, { onConflict: 'org_id, user_id' })
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async updateById(id: string, orgId: string, _data: TablesUpdate<'org_members'>) {
    const { data, error } = await this.query()
      .update(_data)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async deleteById(id: string, orgId: string) {
    const { data, error } = await this.query()
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async isMemberOfOrg(orgId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.query()
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  async deleteByUserId(orgId: string, userId: string) {
    const { data, error } = await this.query()
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async isOrganizationOwner(orgId: string, userId: string): Promise<boolean> {
    // Query for org member with Owner role (is_owner_role = true)
    // Using !inner to enforce the join and filter directly in query
    const { data, error } = await this.query()
      .select('id, roles!inner(id, is_owner_role, name)')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .or('is_owner_role.eq.true,name.eq.Manager', { foreignTable: 'roles' })
      .maybeSingle()

    if (error) {
      console.error('Error checking organization owner status:', {
        error,
        orgId,
        userId,
        message: error.message,
      })
      throw error
    }

    // If a record exists after filtering for is_owner_role = true, user is an owner
    return !!data
  }
}

export const memberRepo =
  process.env.NODE_ENV !== 'production'
    ? new MemberRepository()
    : globalThis._memberRepo ?? (globalThis._memberRepo = new MemberRepository())
