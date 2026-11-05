import { BaseRepository } from '@/core/repositories/base.repository'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'

export class CampaignChannelRepository extends BaseRepository<'campaign_channels'> {
  constructor() {
    super('campaign_channels')
  }

  async findAllWithModifier(
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('*', { count: 'exact' })
    if (modifier) query = modifier(query)
    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  }

  async findOneById(
    id: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('*, profiles ( id, name, email )').eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.single()
    if (error) throw error
    return data
  }

  async insertMany(channels: TablesInsert<'campaign_channels'>[]) {
    const { data, error } = await this.query()
      .upsert(channels, {
        onConflict: 'name, organization_id',
        ignoreDuplicates: true,
      })
      .select('*')
    if (error) throw error
    return data
  }
  async getByName(orgId: string, name: string[] | string) {
    const { data, error } = await this.query()
      .select('*')
      .in('name', Array.isArray(name) ? name : [name])
      .eq('organization_id', orgId)
    if (error) throw error
    return data
  }

  async updateAndGetOne(
    id: string,
    _data: TablesUpdate<'campaign_channels'>,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().update(_data).eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.select('*').single()
    if (error) throw error
    return data
  }
}

export const campaignChannelRepo =
  (globalThis as any)._campaignChannelRepo ?? new CampaignChannelRepository()

if (process.env.NODE_ENV !== 'production')
  (globalThis as any)._campaignChannelRepo = campaignChannelRepo
