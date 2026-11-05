import { sampleTagColors } from '@/shared/constants/sample-data'
import { tagRepo, TagRepository } from '../repositories/tag.repository'
import { BaseService } from './base.service'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { separateTag } from '@/shared/utils'
import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { z } from 'zod'
import { createTagSchema, updateTagSchema } from '@/shared/schemas/tags'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'
import { OrgAuditLog, orgAuditLogService } from './org-audit-log.service'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { requestContext } from '@/shared/types/request'
import { SearchFilterPagination } from '@/shared/types'
import { queryBuilderByParams } from '@/shared/lib/utils'

export class TagService extends BaseService<TagRepository> {
  constructor(repo: TagRepository) {
    super(repo)
  }

  async findAll(orgId: string, queryParams: SearchFilterPagination) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TAGS)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
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
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TAGS)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }

    return this.repo.findOneById(id, modifier)
  }

  async updateAndGet(orgId: string, id: string, data: z.infer<typeof updateTagSchema>) {
    const tag = await this.repo.findById(id)
    if (!tag) throw new NotFoundError()
    const userId = requestContext.getStore()?.userId!

    const fields: TablesUpdate<'tags'> = {
      name: data.name,
      color: data.color,
      desc: data.desc,
    }
    await this.ensureCanEdit(userId, tag)

    const updatedTag = await this.repo.updateAndGetOne(id, fields)

    // Log audit event (async, non-blocking)
    if (tag) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'tag',
          action: 'update',
          target_id: id,
          target_name: tag.name,
          target_table: 'tags',
        },
        tag,
        updatedTag
      )
    }

    return updatedTag
  }

  async deleteMany(orgId: string, ids: string[]) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_TAG)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }

    const deletedTags = await this.repo.bulkDeleteAndGet(ids, modifier)
    if (deletedTags) {
      for (const tag of deletedTags) {
        orgAuditLogService.generateChangesAndLogEvent(
          {
            organization_id: orgId,
            user_id: userId,
            module: 'tag',
            action: 'delete',
            target_id: tag.id,
            target_name: tag.name,
            target_table: 'tags',
          },
          tag,
          {}
        )
      }
    }

    return deletedTags
  }

  async deleteOne(orgId: string, id: string) {
    const userId = requestContext.getStore()?.userId!
    await this.ensureCanDelete(userId, id)

    // Delete and get the deleted record in one query
    const deletedTag = await this.repo.deleteAndGet(id)

    // Log audit event (async, non-blocking)
    if (deletedTag) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'tag',
          action: 'delete',
          target_id: deletedTag.id,
          target_name: deletedTag.name,
          target_table: 'tags',
        },
        deletedTag,
        {}
      )
    }

    return deletedTag
  }

  async findByNames(orgId: string, names: string[]) {
    if (names.length === 0) return { data: [], count: 0 }
    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      return q.eq('organization_id', orgId).in('name', names)
    }
    return this.repo.findAllWithModifier(modifier)
  }

  public async bulkCreateOrLinkTags(
    orgId: string,
    tpId: string,
    userId: string,
    tagNames: string[]
  ) {
    const uniqueTagNames = Array.from(new Set(tagNames || []))
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_TAGS_PER_TP, {
      expectedValue: uniqueTagNames.length,
      errorMessage:
        "This touch point reached the maximum number of tags allowed by organization's plan",
    })

    const { existingTags, newTags: potentialNewTags } = separateTag(uniqueTagNames)

    // Check if potentialNewTags already exist in the database for this organization
    const { data: foundTags } = await this.findByNames(orgId, potentialNewTags)
    const foundTagNames = new Set(foundTags.map((t) => t.name))
    const foundTagIds = foundTags.map((t) => t.id)

    const trulyNewTags = potentialNewTags.filter((name) => !foundTagNames.has(name))

    let insertedTags: { id: string }[] = []
    if (trulyNewTags.length > 0) {
      insertedTags = await this.bulkCreateTags(orgId, userId, trulyNewTags)
    }

    const tagIdsToLink = [
      ...existingTags,
      ...foundTagIds,
      ...insertedTags.map((tag) => tag.id),
    ]
    // Filter out duplicates in case some IDs were provided twice or match found names
    const uniqueTagIdsToLink = Array.from(new Set(tagIdsToLink))

    if (uniqueTagIdsToLink.length > 0) {
      await this.repo.bulkLinkTags(tpId, uniqueTagIdsToLink)
    }
    return insertedTags
  }
  public async bulkCreateTags(orgId: string, userId: string, tagNames: string[]) {
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_TAGS_PER_ORG, {
      expectedValue: tagNames.length,
      errorMessage:
        "This organization reached the maximum number of tags allowed by organization's plan",
    })
    await ensurePolicy(orgId, nonScopePolicies.add_tag)
    const insertedTags = await this.repo.bulkCreate(
      tagNames.map((e) => {
        return {
          name: e,
          color: sampleTagColors[Math.floor(Math.random() * sampleTagColors.length)],
          organization_id: orgId,
          user_id: userId,
        }
      })
    )
    for (const tag of insertedTags) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'tag',
          action: 'create',
          target_id: tag.id,
          target_name: tag.name,
          target_table: 'tags',
        },
        {},
        tag
      )
    }

    return insertedTags
  }

  public async createOne(orgId: string, userId: string, tag: z.infer<typeof createTagSchema>) {
    await ensurePolicy(orgId, nonScopePolicies.add_tag)
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_TAGS_PER_ORG, {
      errorMessage:
        "This organization reached the maximum number of tags allowed by organization's plan",
    })
    try {
      const insertedTag = await this.repo.create({
        ...tag,
        color: tag.color ?? sampleTagColors[Math.floor(Math.random() * sampleTagColors.length)],
        organization_id: orgId,
        user_id: userId,
      })

      // Log audit event (async, non-blocking)
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'tag',
          action: 'create',
          target_id: insertedTag.id,
          target_name: insertedTag.name,
          target_table: 'tags',
        },
        {},
        insertedTag
      )

      return insertedTag
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new BadRequestError('Tag name already exists in this organization', {
          key: 'common:messages.error.tag_name_exists',
        })
      }
    }
  }

  public async replaceTpTags(orgId: string, tpId: string, userId: string, tagNames: string[]) {
    const uniqueTagNames = Array.from(new Set(tagNames || []))
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_TAGS_PER_TP, {
      expectedValue: uniqueTagNames.length,
      errorMessage:
        "This touch point reached the maximum number of tags allowed by organization's plan",
    })

    const { existingTags, newTags: potentialNewTags } = separateTag(uniqueTagNames)

    // Check if potentialNewTags already exist in the database for this organization
    const { data: foundTags } = await this.findByNames(orgId, potentialNewTags)
    const foundTagNames = new Set(foundTags.map((t) => t.name))
    const foundTagIds = foundTags.map((t) => t.id)

    const trulyNewTags = potentialNewTags.filter((name) => !foundTagNames.has(name))

    let insertedTags: { id: string }[] = []
    if (trulyNewTags.length > 0) {
      insertedTags = await this.bulkCreateTags(orgId, userId, trulyNewTags)
    }
    const tagIdsToLink = [
      ...existingTags,
      ...foundTagIds,
      ...insertedTags.map((tag) => tag.id),
    ]
    // Filter out duplicates
    const uniqueTagIdsToLink = Array.from(new Set(tagIdsToLink))

    await this.repo.setTagsForTp(tpId, uniqueTagIdsToLink)
  }

  public async bulkDeleteTags(tagIds: string[]) {
    await this.repo.bulkDelete(tagIds)
  }

  async canEdit(tag: Tables<'tags'>, userId: string) {
    const scope = await getPermissionScopeOrThrow(
      tag.organization_id,
      ROLE_PERMISSION_KEYS.EDIT_TAG
    )
    return (
      scope === RolePermissionScope.ALL ||
      (scope === RolePermissionScope.OWN && tag.user_id === userId)
    )
  }
  async canDelete(tag: Tables<'tags'>, userId: string) {
    const scope = await getPermissionScopeOrThrow(
      tag.organization_id,
      ROLE_PERMISSION_KEYS.DELETE_TAG
    )
    return (
      scope === RolePermissionScope.ALL ||
      (scope === RolePermissionScope.OWN && tag.user_id === userId)
    )
  }

  async ensureCanEdit(userId: string, tag: Tables<'tags'>): Promise<void>
  async ensureCanEdit(userId: string, tagId: string): Promise<void>
  async ensureCanEdit(userId: string, arg: Tables<'tags'> | string) {
    let tag: Tables<'tags'>

    if (typeof arg === 'string') {
      tag = await this.repo.findOneById(arg)
    } else {
      tag = arg
    }
    const canEdit = await this.canEdit(tag, userId)
    if (!canEdit) {
      throw new ForbiddenError('You do not have permission to edit this tag')
    }
  }

  async ensureCanDelete(userId: string, tag: Tables<'tags'>): Promise<void>
  async ensureCanDelete(userId: string, tagId: string): Promise<void>
  async ensureCanDelete(userId: string, arg: Tables<'tags'> | string) {
    let tag: Tables<'tags'>

    if (typeof arg === 'string') {
      tag = await this.repo.findOneById(arg)
    } else {
      tag = arg
    }
    const canDelete = await this.canDelete(tag, userId)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete this tag')
    }
  }
}

// export const tagService = globalThis._tagService ?? new TagService(tagRepo);

export const tagService =
  process.env.NODE_ENV !== 'production'
    ? new TagService(tagRepo)
    : globalThis._tagService ?? (globalThis._tagService = new TagService(tagRepo))
