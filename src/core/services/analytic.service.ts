import { BaseService } from './base.service'
import { logger } from '@/infrastructure/logging/logger'
import { analyticRepo, AnalyticRepository } from '../repositories/analytic.repository'
import {
  AdvancedAnalyticsParams,
  AdvancedAnalytics,
  AdvancedAnalyticTypes,
  RealtimeAnalyticsTypes,
  RealtimeParams,
  RealtimeAnalytics,
} from '../types/analytics/advanced.type'
import { ensureOrgPlan, getOrganizationPlan } from '@/shared/lib/plan/plans'
import { ORG_PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { BadRequestError } from '../../infrastructure/response/errors/domain.errors'
import { orgAuditLogService } from './org-audit-log.service'
import { memberRepo } from '../repositories/member.repository'
import { collectionPermissionService } from './collection-permission.service'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { disabledFeatures } from '@/shared/constants/disabled-features'

// Sourced from conversion_events and customer_profiles, which attribution hides
const VISITOR_FIELDS = [
  'customer_profile_id',
  'customer_name',
  'customer_email',
  'customer_external_id',
  'visitor_id',
] as const
import { TypeVisitByLinks } from '../types/analytics'
import { GeoAnalytics, GeoLevel } from '../types/analytics/geo.type'
import { aggregateGeo } from '../helpers/analytics/geo-aggregate'

const log = logger.child({ module: 'analytic-service' })
export class AnalyticService extends BaseService<AnalyticRepository> {
  constructor(repo: AnalyticRepository) {
    super(repo)
  }

  /**
   * Get collection IDs that a user can access for analytics
   * Returns collectionIds and whether to include uncategorized
   *
   * Logic:
   * - Owner: See all collections and all uncategorized touch-points
   * - Org Member (has VIEW_TOUCH_POINTS): See accessible collections only
   *   - includeNull based on VIEW_TOUCH_POINTS scope (ALL = true, OWN = false)
   * - Viewer (no VIEW_TOUCH_POINTS): See accessible collections only, no uncategorized
   */
  private async getAccessibleCollectionIds(
    orgId: string,
    userId: string
  ): Promise<{
    collectionIds: string[] | undefined
    includeNull: boolean
    nullScope: RolePermissionScope | undefined
  }> {
    // 1. Check if user is Owner (bypass all restrictions)
    const isOwner = await memberRepo.isOrganizationOwner(orgId, userId)
    if (isOwner) {
      return {
        collectionIds: undefined, // No filtering - see all
        includeNull: true, // Include all uncategorized
        nullScope: RolePermissionScope.ALL,
      }
    }

    // 2. All non-owners get filtered by accessible collections
    const accessibleCollections = await collectionPermissionService.getAccessibleCollectionIds(
      orgId,
      userId,
      isOwner
    )

    // 3. Determine includeNull based on VIEW_TOUCH_POINTS permission and scope
    let includeNull = false
    let nullScope = undefined
    try {
      const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)
      // If scope is ALL or OWN, user can see their own uncategorized TPs
      // The RPC filters by p_user_id to ensure they only see their own
      includeNull = scope === RolePermissionScope.ALL || scope === RolePermissionScope.OWN
      nullScope = scope
    } catch {
      // No VIEW_TOUCH_POINTS permission = no uncategorized access
      includeNull = false
    }

    return {
      collectionIds: accessibleCollections,
      includeNull,
      nullScope,
    }
  }

  async getRankingByLinks(
    type: TypeVisitByLinks,
    orgId: string,
    tagIds: string[] | undefined,
    start_time: string,
    end_time: string,
    tpIds?: string[],
    excludeBot?: boolean,
    collectionIds?: string[],
    userId?: string,
    utmSourceValues?: string[],
    utmMediumValues?: string[],
    utmCampaignValues?: string[],
    interactionTypes?: string[],
    removeSpaceFilters: boolean = false // NEW - flag to remove empty filters
  ) {
    try {
      let effectiveCollectionIds = collectionIds
      let includeNull = false
      if (!removeSpaceFilters) {
        // If user provided and no explicit filter, apply permission-based filtering
        if (userId && (!collectionIds || collectionIds.length === 0)) {
          const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
          effectiveCollectionIds = accessInfo.collectionIds
          includeNull = accessInfo.includeNull
        }
      }

      const analyticsData = await this.repo.getRankingByLinks(
        type,
        orgId,
        tagIds,
        start_time,
        end_time,
        tpIds,
        excludeBot,
        effectiveCollectionIds,
        includeNull,
        utmSourceValues,
        utmMediumValues,
        utmCampaignValues,
        interactionTypes,
        userId
      )
      return analyticsData
    } catch (error: any) {
      log.error(error, 'getRankingByLinks')
      return null
    }
  }

  async getRankingByDestinations(
    type: 'full_urls' | 'base_urls',
    orgId: string,
    tagIds: string[] | undefined,
    start_time: string,
    end_time: string,
    tpIds?: string[],
    excludeBot?: boolean,
    collectionIds?: string[],
    userId?: string,
    utmSourceValues?: string[],
    utmMediumValues?: string[],
    utmCampaignValues?: string[],
    interactionTypes?: string[],
    removeSpaceFilters: boolean = false
  ) {
    try {
      let effectiveCollectionIds = collectionIds
      let includeNull = false
      if (!removeSpaceFilters) {
        if (userId && (!collectionIds || collectionIds.length === 0)) {
          const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
          effectiveCollectionIds = accessInfo.collectionIds
          includeNull = accessInfo.includeNull
        }
      }

      const analyticsData = await this.repo.getRankingByDestinations(
        type,
        orgId,
        tagIds,
        start_time,
        end_time,
        tpIds,
        excludeBot,
        effectiveCollectionIds,
        includeNull,
        utmSourceValues,
        utmMediumValues,
        utmCampaignValues,
        interactionTypes,
        userId
      )
      return analyticsData
    } catch (error: any) {
      log.error(error, 'getRankingByDestinations')
      return null
    }
  }

  async getRankingByUTMParameters(
    type: 'by_source' | 'by_medium' | 'by_campaign' | 'by_term' | 'by_content',
    orgId: string,
    tagIds: string[] | undefined,
    start_time: string,
    end_time: string,
    tpIds?: string[],
    excludeBot?: boolean,
    collectionIds?: string[],
    userId?: string,
    utmSourceValues?: string[],
    utmMediumValues?: string[],
    utmCampaignValues?: string[],
    interactionTypes?: string[],
    removeSpaceFilters: boolean = false
  ) {
    try {
      let effectiveCollectionIds = collectionIds
      let includeNull = false
      if (!removeSpaceFilters) {
        if (userId && (!collectionIds || collectionIds.length === 0)) {
          const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
          effectiveCollectionIds = accessInfo.collectionIds
          includeNull = accessInfo.includeNull
        }
      }

      const analyticsData = await this.repo.getRankingByUTMParameters(
        type,
        orgId,
        tagIds,
        start_time,
        end_time,
        tpIds,
        excludeBot,
        effectiveCollectionIds,
        includeNull,
        utmSourceValues,
        utmMediumValues,
        utmCampaignValues,
        interactionTypes,
        userId
      )
      return analyticsData
    } catch (error: any) {
      log.error(error, 'getRankingByUTMParameters')
      return null
    }
  }

  async getRankingByReferrers(
    type: 'referrer' | 'raw',
    orgId: string,
    tagIds: string[] | undefined,
    start_time: string,
    end_time: string,
    tpIds?: string[],
    excludeBot?: boolean,
    collectionIds?: string[],
    userId?: string,
    utmSourceValues?: string[],
    utmMediumValues?: string[],
    utmCampaignValues?: string[],
    interactionTypes?: string[],
    removeSpaceFilters: boolean = false
  ) {
    try {
      let effectiveCollectionIds = collectionIds
      let includeNull = false
      if (!removeSpaceFilters) {
        if (userId && (!collectionIds || collectionIds.length === 0)) {
          const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
          effectiveCollectionIds = accessInfo.collectionIds
          includeNull = accessInfo.includeNull
        }
      }

      const analyticsData = await this.repo.getRankingByReferrers(
        type,
        orgId,
        tagIds,
        start_time,
        end_time,
        tpIds,
        excludeBot,
        effectiveCollectionIds,
        includeNull,
        utmSourceValues,
        utmMediumValues,
        utmCampaignValues,
        interactionTypes,
        userId
      )
      return analyticsData
    } catch (error: any) {
      log.error(error, 'getRankingByReferrers')
      return null
    }
  }

  async getAnalyticByTag(
    orgId: string,
    tagIds: string[] | undefined,
    start_time: string,
    end_time: string,
    tpIds?: string[],
    excludeBot?: boolean,
    collectionIds?: string[], // NEW - from request (explicit filter)
    userId?: string, // NEW - for permission filtering
    utmSourceValues?: string[],
    utmMediumValues?: string[],
    utmCampaignValues?: string[],
    interactionTypes?: string[],
    removeSpaceFilters: boolean = false // NEW - flag to remove empty filters
  ) {
    try {
      let effectiveCollectionIds = collectionIds
      let includeNull = false
      if (!removeSpaceFilters) {
        // If user provided and no explicit filter, apply permission-based filtering
        if (userId && (!collectionIds || collectionIds.length === 0)) {
          const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
          effectiveCollectionIds = accessInfo.collectionIds
          includeNull = accessInfo.includeNull
        }
      }

      const analyticsData = await this.repo.getAnalyticByTag(
        orgId,
        tagIds,
        start_time,
        end_time,
        tpIds,
        excludeBot,
        effectiveCollectionIds,
        includeNull,
        utmSourceValues,
        utmMediumValues,
        utmCampaignValues,
        interactionTypes,
        userId
      )
      return analyticsData
    } catch (error: any) {
      log.error(error)
      return error
    }
  }
  public async getVisitsByDestinations(
    orgId: string,
    tpId: string,
    start_time: string,
    end_time: string,
    exclude_bot?: boolean,
    timezone?: string,
    collectionIds?: string[], // NEW
    userId?: string // NEW
  ) {
    let effectiveCollectionIds = collectionIds
    let includeNull = false

    if (userId && (!collectionIds || collectionIds.length === 0)) {
      const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
      effectiveCollectionIds = accessInfo.collectionIds
      includeNull = accessInfo.includeNull
    }

    const destinations = await orgAuditLogService.getDestinationHistory(
      orgId,
      tpId
      // start_time,
      // end_time,
      // timezone
    )

    const data = await this.repo.getVisitsByDestinations(
      orgId,
      tpId,
      start_time,
      end_time,
      exclude_bot,
      timezone,
      effectiveCollectionIds,
      includeNull
    )
    return { analytics: data, destinations }
  }

  async getAnalyticByTouchPoint(
    orgId: string,
    tpIds: string[] | undefined,
    start_time: string,
    end_time: string,
    excludeBot?: boolean,
    collectionIds?: string[], // NEW
    userId?: string // NEW
  ) {
    try {
      let effectiveCollectionIds = collectionIds
      let includeNull = false

      if (userId && (!collectionIds || collectionIds.length === 0)) {
        const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
        effectiveCollectionIds = accessInfo.collectionIds
        includeNull = accessInfo.includeNull
      }

      return this.repo.getAnalyticByTouchPoint(
        orgId,
        tpIds,
        start_time,
        end_time,
        excludeBot,
        effectiveCollectionIds,
        includeNull
      )
    } catch (error: any) {
      log.error(error)
      return error
    }
  }

  async getAdvancedAnalytics(
    orgId: string,
    type: AdvancedAnalyticTypes,
    params: Omit<AdvancedAnalyticsParams, 'p_is_premium'>,
    userId?: string // NEW
  ) {
    const orgPlan = await getOrganizationPlan(orgId)
    const isPremium = orgPlan?.extra_advanced_analytics ?? false
    const rpcName = AdvancedAnalytics[type]
    if (!rpcName) {
      throw new BadRequestError('Invalid analytics type')
    }

    // Apply permission filtering
    let effectiveCollectionIds = params.p_collection_ids
    let includeNull = false

    if (userId && (!params.p_collection_ids || params.p_collection_ids.length === 0)) {
      const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
      effectiveCollectionIds = accessInfo.collectionIds
      includeNull = accessInfo.includeNull
    }

    return this.repo.getAdvancedAnalytics(orgId, rpcName, {
      ...params,
      p_collection_ids: effectiveCollectionIds,
      p_include_null_collection: includeNull,
      p_is_premium: isPremium,
    })
  }

  async getRealtimeAnalytics(
    orgId: string,
    type: RealtimeAnalyticsTypes,
    params: RealtimeParams,
    userId?: string
  ) {
    const rpcName = RealtimeAnalytics[type]

    if (!rpcName) {
      throw new BadRequestError('Invalid analytics type')
    }

    // Determine collection filtering based on user permissions
    let collectionIds: string[] | null = null
    let includeNull = true

    if (userId) {
      const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)

      // If collectionIds is undefined, user can see all (Owner)
      if (accessInfo.collectionIds !== undefined) {
        // Non-owner - filter by accessible collections
        if (accessInfo.collectionIds.length === 0 && !accessInfo.includeNull) {
          // No accessible collections AND no uncategorized access - return empty
          return { data: [], rowCount: 0 }
        }
        collectionIds = accessInfo.collectionIds
        includeNull = accessInfo.includeNull
      }
    }

    return this.repo.getRealtimeAnalytics(orgId, rpcName, {
      p_last_hours: params.p_last_hours,
      p_organization_id: orgId,
      p_timezone: params.p_timezone,
      p_collection_ids: collectionIds,
      p_include_null_collection: includeNull,
      p_user_id: userId,
      p_exclude_bot: true,
      p_limit: params.p_limit,
    })
  }

  async getRawVisitData(
    orgId: string,
    tagIds: string[] | undefined,
    tpIds: string[] | undefined,
    startTime: string | undefined,
    endTime: string | undefined,
    excludeBot?: boolean,
    timezone?: string,
    lastHours?: number,
    limit?: number,
    offset?: number,
    collectionIds?: string[], // NEW
    userId?: string, // NEW
    utmSources?: string[], // NEW
    utmMediums?: string[], // NEW
    utmCampaigns?: string[], // NEW
    interactionTypes?: string[] // NEW
  ) {
    try {
      let effectiveCollectionIds = collectionIds
      let includeNull = false

      if (userId && (!collectionIds || collectionIds.length === 0)) {
        const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
        effectiveCollectionIds = accessInfo.collectionIds
        includeNull = accessInfo.includeNull
      }

      const visits = await this.repo.getRawVisitData(
        orgId,
        tagIds,
        tpIds,
        startTime,
        endTime,
        excludeBot,
        timezone,
        lastHours,
        limit,
        offset,
        effectiveCollectionIds,
        includeNull,
        utmSources,
        utmMediums,
        utmCampaigns,
        interactionTypes,
        userId
      )

      // Stripped here rather than per route, so both raw-visit endpoints are covered
      if (!disabledFeatures.ATTRIBUTION) return visits

      return visits?.map((visit) => {
        const copy = { ...visit } as Record<string, unknown>
        for (const field of VISITOR_FIELDS) delete copy[field]
        return copy
      })
    } catch (error: any) {
      log.error(error)
      throw error
    }
  }

  async getDistinctUtmValues(
    orgId: string,
    tagIds?: string[],
    tpIds?: string[],
    startTime?: string,
    endTime?: string,
    excludeBot?: boolean,
    collectionIds?: string[],
    userId?: string
  ) {
    try {
      let effectiveCollectionIds = collectionIds
      let includeNull = false

      if (userId && (!collectionIds || collectionIds.length === 0)) {
        const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
        effectiveCollectionIds = accessInfo.collectionIds
        includeNull = accessInfo.includeNull
      }

      return this.repo.getDistinctUtmValues(
        orgId,
        tagIds,
        tpIds,
        effectiveCollectionIds,
        includeNull,
        startTime,
        endTime,
        excludeBot
      )
    } catch (error: any) {
      log.error(error)
      throw error
    }
  }

  /**
   * Get analytics for a specific space/collection
   * Ensures user has permission to view the collection
   */
  async getSpaceAnalytics(
    orgId: string,
    collectionId: string,
    userId: string,
    params: {
      start_time: string
      end_time: string
      exclude_bot?: boolean
    }
  ) {
    try {
      // 1. Ensure user can view this collection (throws if not)
      await collectionPermissionService.ensureCanView(orgId, collectionId, userId)

      // 2. Get analytics filtered to this collection only
      return this.repo.getAnalyticByTag(
        orgId,
        undefined, // no tag filter
        params.start_time,
        params.end_time,
        undefined, // no tp filter
        params.exclude_bot ?? false,
        [collectionId], // filter to this collection
        false // don't include unassigned touch-points
      )
    } catch (error: any) {
      log.error(error)
      throw error
    }
  }

  /**
   * Phân bố lượt truy cập theo vị trí, phần trăm đã tính SẴN Ở ĐÂY.
   *
   * Tính ở server là mục đích chính của endpoint này: card cũ chia theo tổng toàn cầu nên hàng cấp
   * tỉnh hiện 27% thay vì 48% (`analytic-map-chart.tsx:186`). Mẫu số đúng là `parent_total`, và
   * chỉ server biết nó vì FE không có cách nào biết tổng của riêng một nước.
   */
  async getGeoAnalytics(
    orgId: string,
    params: {
      level: GeoLevel
      country?: string
      limit?: number
      anonymity_threshold?: number
      start_time: string
      end_time: string
      tag_ids?: string[]
      tp_ids?: string[]
      exclude_bot?: boolean
      collection_ids?: string[]
      interaction_types?: string[]
    },
    userId?: string
  ): Promise<GeoAnalytics> {
    if (params.level === 'region' && !params.country?.trim()) {
      throw new BadRequestError('Thiếu tham số `country` — cấp vùng luôn nằm trong một nước')
    }

    let effectiveCollectionIds = params.collection_ids
    let includeNull = false
    if (userId && (!params.collection_ids || params.collection_ids.length === 0)) {
      const accessInfo = await this.getAccessibleCollectionIds(orgId, userId)
      effectiveCollectionIds = accessInfo.collectionIds
      includeNull = accessInfo.includeNull
    }

    const rows = await this.repo.getGeoBreakdown(
      orgId,
      params.start_time,
      params.end_time,
      params.tag_ids,
      params.tp_ids,
      params.exclude_bot,
      effectiveCollectionIds,
      includeNull,
      params.interaction_types,
      userId,
      // KHÔNG đẩy bộ lọc nước xuống SQL, kể cả ở cấp vùng. `aggregateGeo` đã tự lọc theo
      // `country`, và nó cần tập CHƯA lọc để tính `grand_total` — mẫu số của phần trăm thứ hai
      // mà card hiện bên dưới phần trăm chính. Đánh đổi: kéo về mọi tổ hợp vị trí thay vì riêng
      // một nước (LiHi 2026-10-26: 5 hàng cho cả bảng), đổi lại một lượt gọi thay vì hai.
      undefined
    )

    return aggregateGeo(rows, {
      level: params.level,
      country: params.country,
      limit: params.limit,
      anonymityThreshold: params.anonymity_threshold,
    })
  }
}
export const analyticService =
  process.env.NODE_ENV !== 'production'
    ? new AnalyticService(analyticRepo)
    : (globalThis._analyticService ??
      (globalThis._analyticService = new AnalyticService(analyticRepo)))
