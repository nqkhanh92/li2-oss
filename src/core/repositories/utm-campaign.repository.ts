import { BaseRepository } from '@/core/repositories/base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { GetUtmCampaignAnalyticsInput, UtmCampaignAnalytics } from '../types/utm-campaign.type'

export class UtmCampaignRepository extends BaseRepository<'utm_campaigns'> {
  constructor() {
    super('utm_campaigns')
  }

  async getAnalytics(input: GetUtmCampaignAnalyticsInput) {
    const { data, error } = await this.getSupaInstance()
      .rpc('get_utm_campaign_analytics', {
        _organization_id: input.organizationId,
        _utm_campaign_id: input.utmCampaignId,
        _start_time: input.startTime,
        _end_time: input.endTime,
        _tp_ids: input.tpIds,
        _channel_ids: input.channelIds,
        _exclude_bot: input.excludeBot,
      })
      .overrideTypes<UtmCampaignAnalytics>()
    if (error) throw error
    return data
  }

  async findAllWithModifier(
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select(
      '*, profiles ( id, name, email ), utm_campaign_touchpoints(touchpoint_id, touch_points(id, name)), utm_campaign_channels(channel_id, campaign_channels(id, name, color))',
      { count: 'exact' }
    )
    if (modifier) query = modifier(query)
    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  }

  async findOneById(
    id: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        '*, profiles ( id, name, email ), utm_campaign_touchpoints(*, touch_points(id, name, short_url)), utm_campaign_channels(*,campaign_channels(id, name, color))'
      )
      .eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.single()
    if (error) throw error
    return data
  }

  async updateAndGetOne(
    id: string,
    _data: TablesUpdate<'utm_campaigns'>,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().update(_data).eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.select('*').single()
    if (error) throw error
    return data
  }
}

export const utmCampaignRepo =
  process.env.NODE_ENV !== 'production'
    ? new UtmCampaignRepository()
    : globalThis._utmCampaignRepo ?? (globalThis._utmCampaignRepo = new UtmCampaignRepository())
