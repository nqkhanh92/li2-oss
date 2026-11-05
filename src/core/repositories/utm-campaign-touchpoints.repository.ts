import { BaseRepository } from '@/core/repositories/base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import { TablesInsert } from '@/shared/types/database.types'

export class UtmCampaignTouchpointsRepository extends BaseRepository<'utm_campaign_touchpoints'> {
  constructor() {
    super('utm_campaign_touchpoints')
  }

  async addTouchpointsToCampaign(
    campaignId: string,
    touchpoints: TablesInsert<'utm_campaign_touchpoints'>[]
  ) {
    const { data, error } = await supabaseService
      .from('utm_campaign_touchpoints')
      .upsert(
        touchpoints.map((tp) => ({
          ...tp,
          campaign_id: campaignId,
        })),
        { onConflict: 'touchpoint_id' }
      )
      .select('*')
    if (error) throw error
    return data
  }

  async removeTouchpointsFromCampaign(campaignId: string, touchpointIds: string[]) {
    const { error } = await supabaseService
      .from('utm_campaign_touchpoints')
      .delete()
      .eq('campaign_id', campaignId)
      .in('touchpoint_id', touchpointIds)
    if (error) throw error
    return true
  }

  async getCampaignTouchpoints(campaignId: string) {
    const { data, error } = await supabaseService
      .from('utm_campaign_touchpoints')
      .select('*, touch_points(*), tags(*)')
      .eq('campaign_id', campaignId)
    if (error) throw error
    return data
  }

  async deleteTouchpointsByCampaignId(campaignId: string) {
    const { error } = await supabaseService
      .from('utm_campaign_touchpoints')
      .delete()
      .eq('campaign_id', campaignId)
    if (error) throw error
    return true
  }

  async replaceCampaignTouchpoints(
    campaignId: string,
    touchpoints: TablesInsert<'utm_campaign_touchpoints'>[]
  ) {
    // Delete existing touchpoints
    await this.deleteTouchpointsByCampaignId(campaignId)

    // Insert new touchpoints
    if (touchpoints.length > 0) {
      const { data, error: insertError } = await supabaseService
        .from('utm_campaign_touchpoints')
        .upsert(
          touchpoints.map((tp) => ({
            ...tp,
            campaign_id: campaignId,
          })),
          { onConflict: 'touchpoint_id' }
        )
        .select('*')
      if (insertError) throw insertError
      return data
    }
    return []
  }

  async bulkCreate(data: TablesInsert<'utm_campaign_touchpoints'>[]) {
    const { data: result, error } = await supabaseService
      .from('utm_campaign_touchpoints')
      .insert(data)
      .select('*')
    if (error) throw error
    return result
  }
}

export const utmCampaignTouchpointsRepo =
  process.env.NODE_ENV !== 'production'
    ? new UtmCampaignTouchpointsRepository()
    : globalThis._utmCampaignTouchpointsRepo ??
      (globalThis._utmCampaignTouchpointsRepo = new UtmCampaignTouchpointsRepository())
