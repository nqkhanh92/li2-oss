import {
  utmCampaignChannelsRepo,
  UtmCampaignChannelsRepository,
} from '../repositories/utm-campaign-channels.repository'
import { BaseService } from './base.service'
import { TablesInsert } from '@/shared/types/database.types'

export class UtmCampaignChannelsService extends BaseService<UtmCampaignChannelsRepository> {
  constructor(repo: UtmCampaignChannelsRepository) {
    super(repo)
  }

  async addChannelsToCampaign(campaignId: string, channelIds: string[]) {
    return this.repo.addChannelsToCampaign(campaignId, channelIds)
  }

  async getCampaignChannels(campaignId: string) {
    return this.repo.getCampaignChannels(campaignId)
  }

  async deleteChannelsByCampaignId(campaignId: string) {
    return this.repo.deleteChannelsByCampaignId(campaignId)
  }

  async replaceCampaignChannels(campaignId: string, channelIds: string[]) {
    return this.repo.replaceCampaignChannels(campaignId, channelIds)
  }

  async bulkCreate(data: TablesInsert<'utm_campaign_channels'>[]) {
    return this.repo.bulkCreate(data)
  }
}

export const utmCampaignChannelsService =
  process.env.NODE_ENV !== 'production'
    ? new UtmCampaignChannelsService(utmCampaignChannelsRepo)
    : globalThis._utmCampaignChannelsService ??
      (globalThis._utmCampaignChannelsService = new UtmCampaignChannelsService(
        utmCampaignChannelsRepo
      ))
