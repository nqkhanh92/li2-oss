import { BaseRepository } from '@/core/repositories/base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import { TablesInsert } from '@/shared/types/database.types'

export class UtmCampaignChannelsRepository extends BaseRepository<'utm_campaign_channels'> {
  constructor() {
    super('utm_campaign_channels')
  }

  async addChannelsToCampaign(campaignId: string, channelIds: string[]) {
    const { data, error } = await supabaseService
      .from('utm_campaign_channels')
      .insert(
        channelIds.map((channelId) => ({
          campaign_id: campaignId,
          channel_id: channelId,
        }))
      )
      .select('*')
    if (error) throw error
    return data
  }

  async getCampaignChannels(campaignId: string) {
    const { data, error } = await supabaseService
      .from('utm_campaign_channels')
      .select('*, campaign_channels(*)')
      .eq('campaign_id', campaignId)
    if (error) throw error
    return data
  }

  async deleteChannelsByCampaignId(campaignId: string) {
    const { error } = await supabaseService
      .from('utm_campaign_channels')
      .delete()
      .eq('campaign_id', campaignId)
    if (error) throw error
    return true
  }

  async replaceCampaignChannels(campaignId: string, channelIds: string[]) {
    // Delete existing channels
    await this.deleteChannelsByCampaignId(campaignId)

    // Insert new channels
    if (channelIds.length > 0) {
      return this.addChannelsToCampaign(campaignId, channelIds)
    }
    return []
  }

  async bulkCreate(data: TablesInsert<'utm_campaign_channels'>[]) {
    const { data: result, error } = await supabaseService
      .from('utm_campaign_channels')
      .insert(data)
      .select('*')
    if (error) throw error
    return result
  }
}

export const utmCampaignChannelsRepo =
  process.env.NODE_ENV !== 'production'
    ? new UtmCampaignChannelsRepository()
    : globalThis._utmCampaignChannelsRepo ??
      (globalThis._utmCampaignChannelsRepo = new UtmCampaignChannelsRepository())
