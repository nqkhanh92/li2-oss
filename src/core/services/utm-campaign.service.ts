import { utmCampaignRepo, UtmCampaignRepository } from '../repositories/utm-campaign.repository'
import { BaseService } from './base.service'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { z } from 'zod'
import {
  createUtmCampaignSchema,
  updateUtmCampaignSchema,
  utmCampaignTouchPointSchema,
} from '@/shared/schemas/utm-campaigns'
import { orgAuditLogService } from './org-audit-log.service'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { requestContext } from '@/shared/types/request'
import { SearchFilterPagination } from '@/shared/types'
import { queryBuilderByParams } from '@/shared/lib/utils'
import equal from 'fast-deep-equal'
import { utmCampaignChannelsService } from './utm-campaign-channels.service'
import { utmCampaignTouchpointsService } from './utm-campaign-touchpoints.service'
import { campaignChannelService } from './campaign-channel.service'
import { sampleTagColors } from '@/shared/constants/sample-data'
import { validateUrls } from '@/shared/lib/server-utils'
import { touchPointService } from './touch-point.service'
import { logger } from '@/infrastructure/logging/logger'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { GetUtmCampaignAnalyticsInput } from '../types/utm-campaign.type'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

const log = logger.child({ service: 'UtmCampaignService' })
export class UtmCampaignService extends BaseService<UtmCampaignRepository> {
  constructor(repo: UtmCampaignRepository) {
    super(repo)
  }

  async findAll(orgId: string, queryParams: SearchFilterPagination) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('created_by', userId)
      }
      q = queryBuilderByParams(q, queryParams)
      if (queryParams?.search) {
        q = q.ilike('name', `%${queryParams.search}%`)
      }
      return q
    }

    return this.repo.findAllWithModifier(modifier)
  }

  async findById(orgId: string, id: string) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('created_by', userId)
      }
      return q
    }

    return this.repo.findOneById(id, modifier)
  }

  /**
   * Helper: Create touchpoints from destinations and map them to touchpoint_id
   */
  private async createTouchpointsFromDestinations(
    orgId: string,
    userId: string,
    touchpoints: any[]
  ) {
    await ensurePolicy(orgId, nonScopePolicies.add_touch_point)

    const newTpDestinations = touchpoints.map((tp) => tp.destination).filter(Boolean) as string[]

    if (newTpDestinations.length === 0) return

    await validateUrls(newTpDestinations)
    const newTps = await touchPointService.bulkCreateFromDestinations(
      orgId,
      userId,
      newTpDestinations
    )

    for (const touchpoint of touchpoints) {
      if (touchpoint.destination) {
        const tpId = newTps.find((tp) => tp.content_value === touchpoint.destination)?.id
        if (tpId) {
          touchpoint.touchpoint_id = tpId
          newTps.splice(
            newTps.findIndex((tp) => tp.id === tpId),
            1
          )
        }
      }
    }
  }

  /**
   * Helper: Handle custom UTM channel creation and mapping
   */
  private async handleCustomUtmChannels(
    orgId: string,
    userId: string,
    campaignId: string,
    touchpoints: any[]
  ) {
    if (!touchpoints || touchpoints.length === 0) return

    // Extract unique channel names from utm_source
    const channelNames = Array.from(
      new Set(
        touchpoints
          .map((e) => e.utm_tags?.utm_source)
          .filter((source): source is string => source !== undefined)
      )
    )

    if (channelNames.length === 0) {
      // No channels to create, but still add touchpoints
      await utmCampaignTouchpointsService.addTouchpointsToCampaign(orgId, campaignId, touchpoints)
      return
    }

    // Create or get channels
    const createdChannels = await campaignChannelService.createOrGetMany(
      orgId,
      userId,
      channelNames.map((name) => ({
        name,
        color: sampleTagColors[Math.floor(Math.random() * sampleTagColors.length)],
      }))
    )

    // Add channels to campaign
    await utmCampaignChannelsService.addChannelsToCampaign(
      campaignId,
      createdChannels.map((e) => e.id)
    )

    // Map channel_id to touchpoints
    const channelMap = new Map(createdChannels.map((c) => [c.name, c.id]))
    const mappedTouchpoints = touchpoints.map((e) => ({
      ...e,
      channel_id: e.utm_tags?.utm_source ? channelMap.get(e.utm_tags.utm_source) : undefined,
    }))

    // Add touchpoints to campaign
    await utmCampaignTouchpointsService.addTouchpointsToCampaign(
      orgId,
      campaignId,
      mappedTouchpoints
    )
  }

  async createOne(orgId: string, userId: string, data: z.infer<typeof createUtmCampaignSchema>) {
    await ensurePolicy(orgId, nonScopePolicies.add_campaign)

    const fields: TablesInsert<'utm_campaigns'> = {
      name: data.name,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      custom_utm_enabled: data.custom_utm_enabled,
      organization_id: orgId,
      created_by: userId,
    }

    // Create new touchpoints from destinations
    if (data.touchpoints && data.touchpoints.length > 0) {
      await this.createTouchpointsFromDestinations(orgId, userId, data.touchpoints)
    }

    const createdCampaign = await this.repo.create(fields)

    // Handle custom UTM or standard mode
    if (data.custom_utm_enabled) {
      await this.handleCustomUtmChannels(orgId, userId, createdCampaign.id, data.touchpoints || [])
    } else {
      // Add channels to campaign first
      if (data.channels && data.channels.length > 0) {
        log.info(
          {
            campaignId: createdCampaign.id,
            channels: data.channels,
          },
          'Adding channels to campaign'
        )
        await utmCampaignChannelsService.addChannelsToCampaign(createdCampaign.id, data.channels)
      }
      // Add touchpoints to campaign
      if (data.touchpoints && data.touchpoints.length > 0) {
        log.info(
          {
            campaignId: createdCampaign.id,
            touchpoints: data.touchpoints,
          },
          'Adding touchpoints to campaign'
        )
        await utmCampaignTouchpointsService.addTouchpointsToCampaign(
          orgId,
          createdCampaign.id,
          data.touchpoints
        )
      }
    }

    // Log audit event (async, non-blocking)
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: userId,
      module: 'campaign',
      action: 'create',
      target_id: createdCampaign.id,
      target_name: createdCampaign.name,
      target_table: 'utm_campaigns',
      metadata: {
        start_date: createdCampaign.start_date,
        end_date: createdCampaign.end_date,
        custom_utm_enabled: createdCampaign.custom_utm_enabled,
      },
    })

    return createdCampaign
  }

  /**
   * Helper: Compare arrays without sorting (fixes object comparison issue)
   */
  private arraysEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return false
    return equal(arr1, arr2)
  }

  async updateAndGet(orgId: string, id: string, data: z.infer<typeof updateUtmCampaignSchema>) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_CAMPAIGN)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('created_by', userId)
      }
      return q
    }

    const oldCampaign = await this.findById(orgId, id)

    const fields: TablesUpdate<'utm_campaigns'> = {
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      custom_utm_enabled: data.custom_utm_enabled,
      updated_at: new Date().toISOString(),
    }

    const updatedCampaign = await this.repo.updateAndGetOne(id, fields, modifier)
    if (!updatedCampaign) throw new BadRequestError('Campaign not found')

    // Handle channels update
    let channelMap: Map<string, string> | undefined

    if (data.custom_utm_enabled) {
      const channelNames = Array.from(
        new Set(
          (data.touchpoints?.map((tp) => tp.utm_tags?.utm_source).filter(Boolean) || []) as string[]
        )
      )
      const oldChannelNames = (
        oldCampaign.utm_campaign_channels?.map((cc) => cc.campaign_channels.name) || []
      ).sort()

      const isChannelsChanged = !this.arraysEqual(channelNames.sort(), oldChannelNames)

      log.info({
        method: 'updateAndGet',
        isChannelsChanged,
        channelNames,
        oldChannelNames,
      })

      if (isChannelsChanged || channelNames.length > 0) {
        const upsertedChannels = await campaignChannelService.createOrGetMany(
          orgId,
          userId,
          channelNames.map((name) => ({
            name,
            color: sampleTagColors[Math.floor(Math.random() * sampleTagColors.length)],
          }))
        )
        const channelIds = upsertedChannels.map((cc) => cc.id)

        if (isChannelsChanged) {
          await utmCampaignChannelsService.replaceCampaignChannels(id, channelIds)
        }

        // Create channel map for touchpoint mapping
        channelMap = new Map(upsertedChannels.map((c) => [c.name, c.id]))
      }
    } else {
      const channelIds = (data.channels || []).sort()
      const oldChannelIds = (
        oldCampaign.utm_campaign_channels?.map((cc) => cc.channel_id) || []
      ).sort()
      const isChannelsChanged = !this.arraysEqual(channelIds, oldChannelIds)

      log.info({
        method: 'updateAndGet',
        isChannelsChanged,
        channelIds,
        oldChannelIds,
      })

      if (isChannelsChanged) {
        await utmCampaignChannelsService.replaceCampaignChannels(id, data.channels || [])
      }
    }

    // Handle touchpoints update
    const oldTouchpoints =
      oldCampaign.utm_campaign_touchpoints?.map((tp) => ({
        touchpoint_id: tp.touchpoint_id,
        channel_id: tp.channel_id,
        utm_tags: tp.utm_tags,
      })) || []

    const newTouchpoints =
      data.touchpoints?.map((tp) => ({
        touchpoint_id: tp.touchpoint_id,
        channel_id: tp.channel_id,
        utm_tags: tp.utm_tags,
      })) || []

    const isTouchpointsChanged = !this.arraysEqual(oldTouchpoints, newTouchpoints)
    const needCreateTp = data.touchpoints?.some((tp) => tp.destination)

    log.info({
      method: 'updateAndGet',
      isTouchpointsChanged,
      oldTouchpoints,
      newTouchpoints,
      needCreateTp,
    })

    if (isTouchpointsChanged || needCreateTp) {
      // Create new touchpoints from destinations
      if (needCreateTp && data.touchpoints) {
        await this.createTouchpointsFromDestinations(orgId, userId, data.touchpoints)
      }

      // Map channel_id to touchpoints (for custom UTM mode)
      if (data.custom_utm_enabled && channelMap && data.touchpoints) {
        for (const tp of data.touchpoints) {
          const utmSource = tp.utm_tags?.utm_source
          if (utmSource) {
            tp.channel_id = channelMap.get(utmSource)
          }
        }
      }

      await utmCampaignTouchpointsService.replaceCampaignTouchpoints(id, data.touchpoints || [])
    }

    // Log audit event (async, non-blocking)
    if (oldCampaign) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'campaign',
          action: 'update',
          target_id: id,
          target_name: oldCampaign.name,
          target_table: 'utm_campaigns',
        },
        oldCampaign,
        { ...oldCampaign, ...data }
      )
    }

    return updatedCampaign
  }

  async getAnalytics(input: GetUtmCampaignAnalyticsInput) {
    return this.repo.getAnalytics(input)
  }

  async deleteOne(orgId: string, id: string) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_CAMPAIGN)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('created_by', userId)
      }
      return q
    }

    // Delete and get the deleted record in one query
    const deletedCampaign = await this.repo.deleteAndGet(id, modifier)

    // Log audit event (async, non-blocking)
    if (deletedCampaign) {
      orgAuditLogService.logEvent({
        organization_id: orgId,
        user_id: userId,
        module: 'campaign',
        action: 'delete',
        target_id: id,
        target_name: deletedCampaign.name,
        target_table: 'utm_campaigns',
        metadata: {
          deleted_campaign: {
            name: deletedCampaign.name,
            start_date: deletedCampaign.start_date,
            end_date: deletedCampaign.end_date,
            custom_utm_enabled: deletedCampaign.custom_utm_enabled,
          },
        },
      })
    }

    return deletedCampaign
  }

  async deleteMany(orgId: string, ids: string[]) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_CAMPAIGN)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('created_by', userId)
      }
      return q
    }

    return this.repo.bulkDelete(ids, modifier)
  }

  async removeTouchpointsFromCampaign(orgId: string, campaignId: string, touchpointIds: string[]) {
    // Verify campaign belongs to org
    await this.findById(orgId, campaignId)

    return utmCampaignTouchpointsService.removeTouchpointsFromCampaign(campaignId, touchpointIds)
  }

  async getCampaignTouchpoints(orgId: string, campaignId: string) {
    // Verify campaign belongs to org
    await this.findById(orgId, campaignId)

    return utmCampaignTouchpointsService.getCampaignTouchpoints(campaignId)
  }

  async replaceCampaignTouchpoints(
    orgId: string,
    campaignId: string,
    touchpoints: z.infer<typeof utmCampaignTouchPointSchema>[]
  ) {
    return utmCampaignTouchpointsService.replaceCampaignTouchpoints(campaignId, touchpoints)
  }
}

export const utmCampaignService =
  process.env.NODE_ENV !== 'production'
    ? new UtmCampaignService(utmCampaignRepo)
    : globalThis._utmCampaignService ??
      (globalThis._utmCampaignService = new UtmCampaignService(utmCampaignRepo))
