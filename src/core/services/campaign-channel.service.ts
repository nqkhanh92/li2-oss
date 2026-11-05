import {
  campaignChannelRepo,
  CampaignChannelRepository,
} from '../repositories/campaign-channel.repository'
import { BaseService } from './base.service'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { TablesInsert } from '@/shared/types/database.types'
import { z } from 'zod'
import { channelSchema } from '@/shared/schemas/utm-campaigns'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { orgAuditLogService } from './org-audit-log.service'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { requestContext } from '@/shared/types/request'
import { SearchFilterPagination } from '@/shared/types'
import { queryBuilderByParams } from '@/shared/lib/utils'
import { sampleTagColors } from '@/shared/constants/sample-data'

export class CampaignChannelService extends BaseService<CampaignChannelRepository> {
  constructor(repo: CampaignChannelRepository) {
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

  async updateAndGet(orgId: string, id: string, data: z.infer<typeof channelSchema>) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_CAMPAIGN)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('created_by', userId)
      }
      return q
    }

    // Get old data for audit log
    const oldChannel = await this.repo.findById(id)

    const updatedChannel = await this.repo.updateAndGetOne(
      id,
      {
        name: data.name,
        color: data.color,
      },
      modifier
    )

    // Log audit event (async, non-blocking)
    if (oldChannel) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'campaign_channel',
          action: 'update',
          target_id: id,
          target_name: oldChannel.name,
          target_table: 'campaign_channels',
        },
        oldChannel,
        { ...oldChannel, ...data }
      )
    }

    return updatedChannel
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
    const deletedChannel = await this.repo.deleteAndGet(id, modifier)

    // Log audit event (async, non-blocking)
    if (deletedChannel) {
      orgAuditLogService.logEvent({
        organization_id: orgId,
        user_id: userId,
        module: 'campaign_channel',
        action: 'delete',
        target_id: id,
        target_name: deletedChannel.name,
        target_table: 'campaign_channels',
        metadata: {
          deleted_channel: {
            name: deletedChannel.name,
            color: deletedChannel.color,
          },
        },
      })
    }

    return deletedChannel
  }

  public async createOne(orgId: string, userId: string, channel: z.infer<typeof channelSchema>) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.ADD_CAMPAIGN)

    try {
      const insertedChannel = await this.repo.create({
        name: channel.name,
        color: channel.color,
        organization_id: orgId,
        created_by: userId,
      })

      // Log audit event (async, non-blocking)
      orgAuditLogService.logEvent({
        organization_id: orgId,
        user_id: userId,
        module: 'campaign_channel',
        action: 'create',
        target_id: insertedChannel.id,
        target_name: insertedChannel.name,
        target_table: 'campaign_channels',
        metadata: {
          color: insertedChannel.color,
        },
      })

      return insertedChannel
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new BadRequestError('Channel name already exists in this organization', {
          key: 'common:messages.error.channel_name_exists',
        })
      }
      throw error
    }
  }

  public async createOrGetMany(
    orgId: string,
    userId: string,
    _channels: z.infer<typeof channelSchema>[]
  ) {
    const channels: TablesInsert<'campaign_channels'>[] = _channels.map((e) => ({
      name: e.name,
      color: e.color ?? sampleTagColors[Math.floor(Math.random() * sampleTagColors.length)],
      organization_id: orgId,
      created_by: userId,
    }))
    const insertResult = await this.repo.insertMany(channels)

    if (channels.length > insertResult.length) {
      return this.repo.getByName(
        orgId,
        channels.map((e) => e.name)
      )
    }

    return insertResult
  }
}

export const campaignChannelService =
  process.env.NODE_ENV !== 'production'
    ? new CampaignChannelService(campaignChannelRepo)
    : globalThis._campaignChannelService ??
      (globalThis._campaignChannelService = new CampaignChannelService(campaignChannelRepo))
