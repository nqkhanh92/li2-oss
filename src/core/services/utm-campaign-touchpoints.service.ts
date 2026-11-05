import {
  utmCampaignTouchpointsRepo,
  UtmCampaignTouchpointsRepository,
} from '../repositories/utm-campaign-touchpoints.repository'
import { BaseService } from './base.service'
import { TablesInsert } from '@/shared/types/database.types'
import { z } from 'zod'
import { utmCampaignTouchPointSchema } from '@/shared/schemas/utm-campaigns'
import { touchPointService } from './touch-point.service'
import { requestContext } from '@/shared/types/request'

export class UtmCampaignTouchpointsService extends BaseService<UtmCampaignTouchpointsRepository> {
  constructor(repo: UtmCampaignTouchpointsRepository) {
    super(repo)
  }

  async addTouchpointsToCampaign(
    orgId: string,
    campaignId: string,
    touchpoints: z.infer<typeof utmCampaignTouchPointSchema>[]
  ) {
    const userId = requestContext.getStore()?.userId!
    const tpIds = touchpoints.map((tp) => tp.touchpoint_id).filter((id): id is string => !!id)
    //TODO: Optimize this query
    const editableTps = await touchPointService.getEditableFromIds(orgId, userId, tpIds)

    if (editableTps.length === 0) return []
    const tps: TablesInsert<'utm_campaign_touchpoints'>[] = []
    for (const tp of touchpoints) {
      if (editableTps.includes(tp.touchpoint_id!)) {
        tps.push({
          campaign_id: campaignId,
          touchpoint_id: tp.touchpoint_id!,
          channel_id: tp.channel_id!,
          utm_tags: tp.utm_tags,
        })
      }
    }
    return this.repo.addTouchpointsToCampaign(campaignId, tps)
  }

  async removeTouchpointsFromCampaign(campaignId: string, touchpointIds: string[]) {
    return this.repo.removeTouchpointsFromCampaign(campaignId, touchpointIds)
  }

  async getCampaignTouchpoints(campaignId: string) {
    return this.repo.getCampaignTouchpoints(campaignId)
  }

  async deleteTouchpointsByCampaignId(campaignId: string) {
    return this.repo.deleteTouchpointsByCampaignId(campaignId)
  }

  async replaceCampaignTouchpoints(
    campaignId: string,
    touchpoints: z.infer<typeof utmCampaignTouchPointSchema>[]
  ) {
    const touchpointData = touchpoints.map((tp) => {
      return {
        campaign_id: campaignId,
        touchpoint_id: tp.touchpoint_id!,
        channel_id: tp.channel_id!,
        utm_tags: tp.utm_tags,
      }
    })

    return this.repo.replaceCampaignTouchpoints(campaignId, touchpointData)
  }

  async bulkCreate(data: TablesInsert<'utm_campaign_touchpoints'>[]) {
    return this.repo.bulkCreate(data)
  }
}

export const utmCampaignTouchpointsService =
  process.env.NODE_ENV !== 'production'
    ? new UtmCampaignTouchpointsService(utmCampaignTouchpointsRepo)
    : globalThis._utmCampaignTouchpointsService ??
      (globalThis._utmCampaignTouchpointsService = new UtmCampaignTouchpointsService(
        utmCampaignTouchpointsRepo
      ))
