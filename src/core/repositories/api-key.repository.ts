import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { BaseRepository } from './base.repository'
import { ApiKeyType } from '@/shared/types/api-key'

export class ApiKeyRepository extends BaseRepository<'api_keys'> {
  constructor() {
    super('api_keys')
  }

  async findByOrganization(organizationId: string) {
    const { data, error } = await this.query()
      .select(
        `
        *,
        created_by_user:created_by(id, email, display_name),
        bot_user:bot_user_id(id, email, display_name)
      `
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
  async checkIfExistByName(orgId: string, name: string) {
    const { data, error } = await this.query()
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', name)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  async findOneById(id: string, organizationId: string) {
    const { data, error } = await this.query()
      .select(
        `
        *,
        created_by_user:created_by(id, email, display_name),
        bot_user:bot_user_id(id, email, display_name)
      `
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error) throw error
    return data
  }

  async findByKeyHash(keyHash: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findByPrefixAndSuffix(prefix: string, suffix: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('key_prefix', prefix)
      .eq('key_suffix', suffix)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async create(_data: TablesInsert<'api_keys'>) {
    const { data, error } = await this.query().insert(_data).select('*').single()

    if (error) throw error
    return data
  }

  async updateById(id: string, organizationId: string, _data: TablesUpdate<'api_keys'>) {
    const { data, error } = await this.query()
      .update(_data)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  async deleteById(id: string, organizationId: string) {
    const { data, error } = await this.query()
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  async updateLastUsedAt(id: string) {
    const { error } = await this.query()
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  async countByOrganization(organizationId: string): Promise<number> {
    const { count, error } = await this.query()
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (error) throw error
    return count || 0
  }

  async countBotsByOrganization(organizationId: string): Promise<number> {
    const { count, error } = await this.query()
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('key_type', ApiKeyType.BOT)

    if (error) throw error
    return count || 0
  }
}

export const apiKeyRepo =
  process.env.NODE_ENV !== 'production'
    ? new ApiKeyRepository()
    : globalThis._apiKeyRepo ?? (globalThis._apiKeyRepo = new ApiKeyRepository())
