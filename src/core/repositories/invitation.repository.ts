import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { BaseRepository } from './base.repository'

export class InvitationRepository extends BaseRepository<'org_invitations'> {
  constructor() {
    super('org_invitations')
  }

  async getByOrgId(orgId: string) {
    const { data, error } = await this.query().select('*').eq('org_id', orgId)
    if (error) throw error
    return data
  }

  async findByToken(token: string) {
    const { data, error } = await this.query()
      .select('*, org_id(id, name, org_slug), invite_by(email, id)')
      .eq('token', token)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async createOrUpdate(invitation: TablesInsert<'org_invitations'>) {
    const { data, error } = await this.query()
      .upsert(invitation, { onConflict: 'email, org_id' })
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async deleteMany(ids: string[], orgId: string) {
    const { data, error } = await this.query()
      .delete()
      .in('id', ids)
      .eq('org_id', orgId)
      .select('*')
    if (error) throw error
    return data
  }

  async deleteOne(id: string, orgId: string) {
    const { data, error } = await this.query()
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async updateOne(id: string, orgId: string, _data: TablesUpdate<'org_invitations'>) {
    const { data, error } = await this.query()
      .update(_data)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }
}

export const invitationRepo =
  process.env.NODE_ENV !== 'production'
    ? new InvitationRepository()
    : globalThis._invitationRepo ?? (globalThis._invitationRepo = new InvitationRepository())
