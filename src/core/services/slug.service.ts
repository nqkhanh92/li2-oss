import { TablesInsert } from '@/shared/types/database.types'
import { BadRequestError } from '../../infrastructure/response/errors/domain.errors'
import { slugRepo, SlugRepository } from '../repositories/slug.repository'
import { BaseService } from './base.service'
import { logger } from '@/infrastructure/logging/logger'
import { supabaseService } from '@/infrastructure/database/supabase'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
const log = logger.child({ module: 'slug' })
export class SlugService extends BaseService<SlugRepository> {
  constructor(repo: SlugRepository) {
    super(repo)
  }

  public async createSlug(orgId: string, slug: string, tpId: string, userId: string) {
    try {
      const slugData: TablesInsert<'slugs'> = {
        organization_id: orgId,
        slug,
        tp_id: tpId,
        user_id: userId,
      }

      return await this.repo.create(slugData)
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new BadRequestError('Slug was taken by another user, please choose another slug!', {
          key: 'common:messages.error.slug_is_taken',
        })
      }
      throw error
    }
  }
  public async bulkCreateSlug(
    slugs: { tpId: string; slug: string; orgId: string; userId: string }[]
  ) {
    const slugData: TablesInsert<'slugs'>[] = slugs.map((slug) => ({
      organization_id: slug.orgId,
      slug: slug.slug,
      tp_id: slug.tpId,
      user_id: slug.userId,
    }))
    return this.repo.bulkCreate(slugData)
  }

  public async getTpSlugs(
    orgId: string,
    tpId: string,
    options?: {
      scope?: RolePermissionScope
      userId?: string
    }
  ) {
    const { scope, userId } = options ?? {}
    let query = supabaseService
      .from('touch_points')
      .select('id, slug, short_url, short_code, slugs(id, slug, created_at)', {
        count: 'exact',
      })
      .order('created_at', { referencedTable: 'slugs', ascending: false })
      .eq('id', tpId)
      .eq('organization_id', orgId)
    if (scope === RolePermissionScope.OWN && userId) {
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query.single()
    if (error) {
      throw error
    }
    return data
  }

  /**
   * The touch point a slug resolves to, current OR historical (SL-1 `get_short_link`).
   *
   * No permission gate and no org filter: it returns an id and nothing else, and the caller is
   * required to follow it with an org-scoped read plus `ensureCanViewTouchPoint`. See
   * `slug.repository.ts` `findTpIdBySlug` for why scoping here would be weaker rather than stronger.
   */
  public async findTpIdBySlug(slug: string): Promise<string | null> {
    return this.repo.findTpIdBySlug(slug)
  }

  /**
   * Check if a slug already exists in the slugs table
   * @param slug - The slug to check
   * @returns Promise<{ exists: boolean }> - Object with exists property
   */
  public async checkSlugExists(slug: string): Promise<{ exists: boolean }> {
    const exists = await this.repo.checkSlugExists(slug)
    return { exists }
  }
}
export const slugService =
  process.env.NODE_ENV !== 'production'
    ? new SlugService(slugRepo)
    : (globalThis._slugService ?? (globalThis._slugService = new SlugService(slugRepo)))
