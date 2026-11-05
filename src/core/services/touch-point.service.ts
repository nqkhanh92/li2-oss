import { getChangedFields, getObjectDiff, queryBuilderByParams } from '@/shared/lib/utils'
import { touchPointRepo, TouchPointRepository } from '../repositories/touch-point.repository'
import { BaseService } from './base.service'
import { SearchFilterPagination } from '@/shared/types'
import { logger } from '@/infrastructure/logging/logger'
import { artifactRepo } from '../repositories/artifact.repository'
import {
  ARTIFACT_STATUS_BY_BUCKET,
  NO_CUSTOM_DOMAIN,
  type MergedStatus,
} from '../helpers/merged-status'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { z } from 'zod'
import {
  allowedMetaTagImageFormat,
  metaTagsSchema,
  touchPointFormCreateWithAdvanceSchema,
  touchPointFormSchema,
  touchPointUpdateSchema,
} from '@/shared/schemas/touch-points'
import { encode } from 'base62'
import { SHORT_ID_OFFSET } from '@/shared/constants/utils'
import { TouchPointContentType } from '@/features/touch-points/types'
import { tagService } from './tag.service'
import { slugService } from './slug.service'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS, PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { domainService } from './domain.service'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { simpleUploadFile, uploadFile } from '@/shared/lib/storage/upload'
import { parse } from 'tldts'
import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { MetaTags } from '../types/meta-tags.type'
import { Options } from 'qr-code-styling'
import { JSDOM } from 'jsdom'
import nodeCanvas from 'canvas'
import QrCodeStyling from 'qr-code-styling'
import { addWatermark } from '@/shared/lib/storage/add-overlay'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { pickDefined, pickDefinedAndNotNull } from '@/shared/utils'
import { TouchPointExportType } from '../types/touch-point.type'
import {
  getOptimizeSize,
  getQrDefaultOptions,
  QR_CUSTOMIZE_DEFAULT_OPTIONS,
  FORCE_QR_ENABLED,
} from '@/features/touch-points/constants'
import equal from 'fast-deep-equal'
import { orgAuditLogService } from './org-audit-log.service'
import {
  accessControlSchema,
  redirectSettingSchema,
} from '@/shared/schemas/touch-points/advanced.schema'
import { trackingSchema } from '@/shared/schemas/touch-points/tracking.schema'
import { collectionPermissionService } from './collection-permission.service'
import { ForbiddenError } from '@/infrastructure/response/errors/domain.errors'
import { isBlacklisted } from '@/shared/lib/blacklist/domain-blacklist'
import { validateUrls } from '@/shared/lib/server-utils'
import { dynamicTargetingSchema } from '@/shared/schemas/touch-points/dynamic-targeting'
import { privacySecuritySchema } from '@/shared/schemas/touch-points/privacy-security'
import { requestContext } from '@/shared/types/request'
import { memberRepo } from '../repositories/member.repository'
import { memberService } from './member.service'
import { facebookGraphService } from '@/infrastructure/external/facebook/graph-service'
import { ConversionSummary, TouchPointInList } from '../types/touch-point.type'

const log = logger.child({ module: 'touch-point-service' })

/**
 * Service class for managing touch points in the proximity marketing system.
 * Handles CRUD operations, permissions, plan validations, and business logic for touch points.
 *
 * @extends BaseService<TouchPointRepository>
 */

/**
 * Đọc một bộ lọc dạng chuỗi từ query param. Giá trị không phải chuỗi (mảng, object do URL lặp
 * khoá) đều về `undefined` thay vì chảy tiếp vào câu truy vấn.
 */
function readStringFilter(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

/** Giá trị `content_type` của hàng artifact. So khớp luôn dùng `ilike` — dữ liệu lẫn chữ hoa thường. */
const ARTIFACT_CONTENT_TYPE = 'ARTIFACT'

/** Dùng khi nối `userId` vào ngữ pháp `.or()` của PostgREST — xem `applyCollectionPermissionFilter`. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class TouchPointService extends BaseService<TouchPointRepository> {
  /**
   * Creates an instance of TouchPointService.
   *
   * @param {TouchPointRepository} repo - The touch point repository instance
   */
  constructor(repo: TouchPointRepository) {
    super(repo)
  }

  /**
   * Check if user has permission to view a touch point.
   * - If touch-point has collection_id: Check collection view permission
   * - If no collection_id (uncategorized): Check org-level VIEW_TOUCH_POINTS permission
   *
   * @param {string} orgId - Organization ID
   * @param {string} touchPointId - Touch point ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user can view, false otherwise
   */
  async canViewTouchPoint(orgId: string, touchPointId: string, userId: string): Promise<boolean> {
    try {
      const touchPoint = await this.repo.getTouchPointById(orgId, touchPointId)
      if (!touchPoint) return false

      /**
       * ⭐ Người tạo luôn XEM được link của chính mình, bất kể collection và quyền collection.
       * Lý do đầy đủ (và con số 44/38/6 đo trên prod) ở `applyCollectionPermissionFilter`.
       * Phải đặt TRƯỚC nhánh collection, nếu không nhánh đó trả về trước và vế này vô nghĩa.
       */
      if (touchPoint.user_id && touchPoint.user_id === userId) return true

      // If touch-point belongs to a collection, check collection permissions
      if (touchPoint.collection_id) {
        const permissions = await collectionPermissionService.getCollectionPermissions(
          orgId,
          touchPoint.collection_id,
          userId
        )
        return permissions.canView
      }

      // Uncategorized touch-point: use org-level permissions
      const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)
      if (scope === RolePermissionScope.OWN) {
        return touchPoint.user_id === userId
      }
      return true // RolePermissionScope.ALL
    } catch (error) {
      return false
    }
  }

  async getEditableFromIds(
    orgId: string,
    userId: string,
    touchPointIds: string[] | undefined
  ): Promise<string[]> {
    if (!touchPointIds || touchPointIds.length === 0) return []
    const tps = await this.repo.findByIds(touchPointIds)

    if (!tps || tps.length === 0) return []

    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)
    const editableTps = []
    for (const tp of tps) {
      // ⭐ Người tạo luôn sửa được link của chính mình, kể cả khi nó nằm trong collection của
      //    người khác. Cùng chốt với `canEditTouchPoint`.
      if (tp.user_id && tp.user_id === userId) {
        editableTps.push(tp.id)
      } else if (!tp.collection_id) {
        if (scope === RolePermissionScope.ALL) {
          editableTps.push(tp.id)
        }
      } else {
        const permissions = await collectionPermissionService.getCollectionPermissions(
          orgId,
          tp.collection_id,
          userId
        )
        if (permissions.canEdit) {
          editableTps.push(tp.id)
        }
      }
    }

    return editableTps
  }

  /**
   * Check if user has permission to edit a touch point.
   * - If touch-point has collection_id: Check collection edit permission
   * - If no collection_id (uncategorized): Check org-level EDIT_TOUCH_POINT permission
   *
   * @param {string} orgId - Organization ID
   * @param {string} touchPointId - Touch point ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user can edit, false otherwise
   */
  async canEditTouchPoint(orgId: string, touchPointId: string, userId: string): Promise<boolean> {
    try {
      const touchPoint = await this.repo.getTouchPointById(orgId, touchPointId)
      if (!touchPoint) return false

      /**
       * ⭐ Người tạo luôn SỬA được link của chính mình — cùng chốt với `canViewTouchPoint`.
       *
       * ⚠ CỐ Ý không áp cho `canDeleteTouchPoint`: đề bài nói "xem/sửa", và xoá là thao tác
       * không đảo ngược được. Nới quyền xoá mà không ai yêu cầu là tự thêm một đường mất dữ liệu.
       */
      if (touchPoint.user_id && touchPoint.user_id === userId) return true

      // If touch-point belongs to a collection, check collection content permissions
      if (touchPoint.collection_id) {
        const permissions = await collectionPermissionService.getCollectionPermissions(
          orgId,
          touchPoint.collection_id,
          userId
        )
        return permissions.canEditContent // Use canEditContent for collaborative editing
      }

      // Uncategorized touch-point: use org-level permissions
      const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)
      if (scope === RolePermissionScope.OWN) {
        return touchPoint.user_id === userId
      }
      return true // RolePermissionScope.ALL
    } catch (error) {
      return false
    }
  }

  /**
   * Check if user has permission to delete a touch point.
   * - If touch-point has collection_id: Check collection delete permission
   * - If no collection_id (uncategorized): Check org-level DELETE_TOUCH_POINT permission
   *
   * @param {string} orgId - Organization ID
   * @param {string} touchPointId - Touch point ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user can delete, false otherwise
   */
  async canDeleteTouchPoint(orgId: string, touchPointId: string, userId: string): Promise<boolean> {
    try {
      const touchPoint = await this.repo.getTouchPointById(orgId, touchPointId)
      if (!touchPoint) return false

      // If touch-point belongs to a collection, check collection permissions
      if (touchPoint.collection_id) {
        const permissions = await collectionPermissionService.getCollectionPermissions(
          orgId,
          touchPoint.collection_id,
          userId
        )
        return permissions.canDelete
      }

      // Uncategorized touch-point: use org-level permissions
      const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_TOUCH_POINT)
      if (scope === RolePermissionScope.OWN) {
        return touchPoint.user_id === userId
      }
      return true // RolePermissionScope.ALL
    } catch (error) {
      return false
    }
  }

  /**
   * Ensure user can view touch point - throws error if not permitted
   */
  async ensureCanViewTouchPoint(
    orgId: string,
    touchPointId: string,
    userId: string
  ): Promise<void> {
    const canView = await this.canViewTouchPoint(orgId, touchPointId, userId)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view this touch-point')
    }
  }

  /**
   * Ensure user can edit touch point - throws error if not permitted
   */
  async ensureCanEditTouchPoint(
    orgId: string,
    touchPointId: string,
    userId: string
  ): Promise<void> {
    const canEdit = await this.canEditTouchPoint(orgId, touchPointId, userId)
    if (!canEdit) {
      throw new ForbiddenError('You do not have permission to edit this touch-point')
    }
  }

  /**
   * Ensure user can delete touch point - throws error if not permitted
   */
  async ensureCanDeleteTouchPoint(
    orgId: string,
    touchPointId: string,
    userId: string
  ): Promise<void> {
    const canDelete = await this.canDeleteTouchPoint(orgId, touchPointId, userId)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete this touch-point')
    }
  }

  /**
   * Get all touch point IDs that user can access based on collection permissions.
   * Returns IDs of touch-points in accessible collections + uncategorized touch-points user can access.
   */
  async getAccessibleTouchPointIds(
    orgId: string,
    userId: string
  ): Promise<{
    accessibleCollectionIds: string[]
    canAccessUncategorized: boolean
    uncategorizedScope?: RolePermissionScope
  }> {
    // Get accessible collection IDs
    const accessibleCollectionIds = await collectionPermissionService.getAccessibleCollectionIds(
      orgId,
      userId
    )

    // Check if user can access uncategorized touch-points
    let canAccessUncategorized = false
    let uncategorizedScope: RolePermissionScope | undefined
    try {
      uncategorizedScope = await getPermissionScopeOrThrow(
        orgId,
        ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS
      )
      canAccessUncategorized = true
    } catch {
      canAccessUncategorized = false
    }

    return { accessibleCollectionIds, canAccessUncategorized, uncategorizedScope }
  }

  /**
   * Get all touch point IDs that user can EDIT based on collection permissions.
   * Returns IDs of editable collections + uncategorized touch-points user can edit.
   * Used for filtering touch-points available to add to collections.
   */
  async getEditableTouchPointIds(
    orgId: string,
    userId: string
  ): Promise<{
    editableCollectionIds: string[]
    canEditUncategorized: boolean
    uncategorizedEditScope?: RolePermissionScope
  }> {
    // Get editable collection IDs (where user is Owner or Editor)
    const editableCollectionIds = await collectionPermissionService.getEditableCollectionIds(
      orgId,
      userId
    )

    // Check if user can edit uncategorized touch-points
    let canEditUncategorized = false
    let uncategorizedEditScope: RolePermissionScope | undefined
    try {
      uncategorizedEditScope = await getPermissionScopeOrThrow(
        orgId,
        ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT
      )
      canEditUncategorized = true
    } catch {
      canEditUncategorized = false
    }

    return { editableCollectionIds, canEditUncategorized, uncategorizedEditScope }
  }

  /**
   * Retrieves a touch point by its ID with optional permission scoping.
   *
   * @param {string} orgId - The organization ID
   * @param {string} tpId - The touch point ID
   * @param {Object} [options] - Optional parameters for scoping and user filtering
   * @param {RolePermissionScope} [options.scope] - Permission scope for filtering results
   * @param {string} [options.userId] - User ID for OWN scope filtering
   * @returns {Promise<any>} The touch point details
   */
  async getTouchPointById(
    orgId: string,
    tpId: string,
    options?: {
      scope?: RolePermissionScope
      userId?: string
    }
  ) {
    const { scope, userId } = options ?? {}
    const modifier = (query: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN && userId) {
        query = query.eq('user_id', userId)
      }
      return query
    }
    return this.repo.getTouchPointById(orgId, tpId, modifier)
  }
  /**
   * Retrieves detailed touch point information including related data (tags, domain, etc.).
   *
   * @param {string} orgId - The organization ID
   * @param {string} tpId - The touch point ID
   * @param {Object} [options] - Optional parameters for scoping and user filtering
   * @param {RolePermissionScope} [options.scope] - Permission scope for filtering results
   * @param {string} [options.userId] - User ID for OWN scope filtering
   * @returns {Promise<any>} The detailed touch point information
   */
  async getTouchPointDetail(
    orgId: string,
    tpId: string,
    options?: {
      scope?: RolePermissionScope
      userId?: string
    }
  ) {
    const { scope, userId } = options ?? {}
    const modifier = (query: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN && userId) {
        query = query.eq('user_id', userId)
      }
      return query
    }
    const touchPoint = await this.repo.getTouchPointDetail(orgId, tpId, modifier)
    const visits = await this.repo.enrichWithVisitCounts([touchPoint])
    return visits[0] ?? touchPoint
  }

  async getViewableTouchpointIds(orgId: string, userId: string) {
    const isOwner = await memberService.isOrgOwner(orgId, userId)

    if (isOwner) {
      const allTouchpoints = await this.repo.findAllByOrgId(orgId)
      return allTouchpoints.map((tp) => tp.id)
    }

    const accessibleCollectionIds = await collectionPermissionService.getAccessibleCollectionIds(
      orgId,
      userId,
      isOwner
    )
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)
    const filteredTouchpoints = await this.repo.findAllByOrgId(orgId, (q) => {
      if (scope === RolePermissionScope.ALL) {
        // Return all touchpoints in accessible collections + uncategorized touchpoints
        return q.or(`collection_id.in.(${accessibleCollectionIds.join(',')}),collection_id.is.null`)
      }
      // Return only touchpoints in accessible collections + own uncategorized touchpoints
      return q.or(
        `collection_id.in.(${accessibleCollectionIds.join(',')}),and(collection_id.is.null,user_id.eq.${userId})`
      )
    })
    return filteredTouchpoints.map((tp) => tp.id)
  }

  /**
   * Retrieves all touch points for an organization with optional filtering and pagination.
   * Supports search by name, tag filtering, and permission-based scoping.
   * NOW WITH COLLECTION PERMISSIONS: Filters touch-points based on collection access.
   *
   * @param {string} orgId - The organization ID
   * @param {Object} [options] - Optional parameters for filtering and scoping
   * @param {RolePermissionScope} [options.scope] - Permission scope for filtering results (for uncategorized touch-points)
   * @param {string} [options.userId] - User ID for permission filtering
   * @param {SearchFilterPagination} [options.queryParams] - Query parameters for search, filtering, and pagination
   * @param {boolean} [options.applyCollectionPermissions] - Whether to apply collection-based permission filtering (default: false for backward compatibility)
   * @param {boolean} [options.editableOnly] - When true, returns only touch-points user can EDIT (for add-to-collection dialogs)
   * @param {string} [options.excludeCollectionId] - Exclude touch-points already in this collection (for add-to-collection dialogs)
   * @returns {Promise<any>} Array of touch points matching the criteria
   */

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildExportSelectQuery(
    fields: (keyof TouchPointExportType)[],
    filterByTagIds: boolean
  ): string {
    let select = 'id'
    const added = new Set<string>()

    for (const field of fields) {
      let col: string
      switch (field) {
        case 'qr_enabled':
          col = 'variants_content'
          break
        case 'tags':
          col = 'tp_tag_links(tag_id, tags ( id, name, color ))'
          break
        case 'content_value':
          col = 'content_value, privacy_security'
          break
        case 'created_by':
          col = 'profiles(id, email)'
          break
        case 'collection_name':
          col = 'collections(id, name)'
          break
        case 'utm_source':
        case 'utm_medium':
        case 'utm_campaign':
        case 'utm_term':
        case 'utm_content':
          col = 'utm_tags'
          break
        default:
          col = `${field}`
      }
      if (!added.has(col)) {
        select += `, ${col}`
        added.add(col)
      }
    }

    if (filterByTagIds) {
      if (select.includes('tp_tag_links(')) {
        select = select.replace('tp_tag_links(', 'tp_tag_links!inner(')
      } else {
        select += ', tp_tag_links!inner(tag_id)'
      }
    }

    return select
  }

  private applyCollectionPermissionFilter(
    query: PostgrestFilterBuilder<any, any, any>,
    collectionFilterData:
      Awaited<ReturnType<TouchPointService['getAccessibleTouchPointIds']>> | undefined,
    userId: string | undefined,
    options?: {
      fallbackScope?: RolePermissionScope
      excludeCollectionId?: string
    }
  ): PostgrestFilterBuilder<any, any, any> {
    if (collectionFilterData) {
      const { accessibleCollectionIds, canAccessUncategorized, uncategorizedScope } =
        collectionFilterData
      const conditions: string[] = []

      /**
       * ⭐ NGƯỜI TẠO luôn thấy và sửa được link của chính mình — chốt chủ sản phẩm 2026-10-28,
       * sau khi đo production.
       *
       * Vì sao cần, bằng số đo trên prod: 44 touch point nằm trong collection, **38** có
       * `tp.user_id = collection.user_id` (người tạo link cũng là chủ collection nên vốn đã có
       * quyền). Còn **6** hàng là link của A nằm trong collection của B. Giao diện Spaces vừa bị
       * ẩn, nên không còn chỗ nào cấp lại quyền collection — nếu A mất quyền trên collection của
       * B thì 6 link **do chính A tạo** trở thành vô hình với A, và không ai sửa được từ UI.
       *
       * ⚠ Phạm vi **cố ý hẹp**: chỉ người tạo, KHÔNG mở cho thành viên khác trong org. Vế này
       * đứng cạnh hai vế cũ bằng `OR`, nên nó chỉ **thêm** hàng của chính người gọi — không nới
       * một hàng nào của người khác.
       *
       * ⚠ Hệ quả phải biết: vế này **không kèm điều kiện quyền org**, đúng như đề bài ("LUÔN xem
       * được link mình tạo"). Nghĩa là một thành viên bị thu hồi `VIEW_TOUCH_POINTS` vẫn thấy
       * những link do chính họ tạo. Nếu đó không phải điều mong muốn thì phải chốt lại, vì nó
       * không suy ra được từ code.
       *
       * Kiểm UUID trước khi nối: chuỗi này đi thẳng vào **ngữ pháp** của `.or()`, nơi dấu phẩy và
       * ngoặc là ký tự cú pháp. `userId` đến từ JWT nên không phải dữ liệu tự do, nhưng một phép
       * kiểm ở ngay chỗ nối thì rẻ và không phụ thuộc vào việc ai gọi.
       */
      if (userId && UUID_RE.test(userId)) {
        conditions.push(`user_id.eq.${userId}`)
      }

      if (accessibleCollectionIds.length > 0) {
        conditions.push(`collection_id.in.(${accessibleCollectionIds.join(',')})`)
      }

      if (canAccessUncategorized) {
        if (uncategorizedScope === RolePermissionScope.OWN) {
          conditions.push(`and(collection_id.is.null,user_id.eq.${userId})`)
        } else {
          conditions.push('collection_id.is.null')
        }
      }

      query =
        conditions.length > 0
          ? query.or(conditions.join(','))
          : query.eq('id', '00000000-0000-0000-0000-000000000000')

      if (options?.excludeCollectionId) {
        query = query.or(`collection_id.neq.${options.excludeCollectionId},collection_id.is.null`)
      }
    } else if (options?.fallbackScope === RolePermissionScope.OWN && userId) {
      query = query.eq('user_id', userId)
    }

    return query
  }

  /**
   * Count all touch-points in an organization (count-only, no rows). Used by the agent org-overview
   * tool, which needs a cheap total rather than a fetched page.
   */
  async countByOrganization(orgId: string): Promise<number> {
    return this.repo.countByOrganization(orgId)
  }

  /**
   * Retrieves one touch-point's raw config columns by id (primary key), scoped to the org. Used by
   * the agent link-details tool's preferred `id` path — the exact lookup, no name/short_code
   * guessing. Returns null (never throws) when no match exists in this org — the route maps that
   * to a 404, not a 500.
   */
  async getByIdForOrg(orgId: string, id: string) {
    return this.repo.getByIdForOrg(orgId, id)
  }

  /**
   * Retrieves one touch-point's raw config columns by slug/short_code/name, scoped to the org.
   * Used by the agent link-details tool's fallback `slug` path. Returns null (never throws) when
   * no match exists in this org — the route maps that to a 404, not a 500. A `name` match on more
   * than one row is a user error (400), not a lookup miss — `name` is not unique, so the caller
   * must retry with the link's code or slug instead of us silently guessing which row was meant.
   */
  async getBySlugForOrg(orgId: string, slug: string) {
    const { row, ambiguousName } = await this.repo.getBySlugShortCodeOrNameForOrg(orgId, slug)
    if (ambiguousName) {
      throw new BadRequestError(
        'Nhiều liên kết dùng chung tên này, vui lòng dùng mã liên kết (code) hoặc đường ' +
          'dẫn tuỳ chỉnh (slug) để tra cứu.',
        { key: 'common:messages.error.ambiguous_link_name' }
      )
    }
    return row
  }

  async getAllTouchPoints(
    orgId: string,
    options?: {
      scope?: RolePermissionScope
      userId?: string
      queryParams?: SearchFilterPagination
      applyCollectionPermissions?: boolean
      editableOnly?: boolean
      excludeCollectionId?: string
    }
  ) {
    const {
      scope,
      userId,
      queryParams,
      applyCollectionPermissions = false,
      editableOnly = false,
      excludeCollectionId,
    } = options ?? {}

    // Check if tag filtering is needed to use inner join
    const useInnerJoinForTags = Boolean(queryParams?.filters?.tag_ids?.length)

    /**
     * Hai bộ lọc của thanh công cụ danh sách gộp: **trạng thái** và **loại**.
     *
     * Rút khỏi `filters` TRƯỚC `queryBuilderByParams`, giống `tag_ids`: bộ dựng chung sẽ biến
     * chúng thành `.match({ status: … })` trên `touch_points`, mà cột đó KHÔNG tồn tại ở đó —
     * PostgREST trả 400 và cả danh sách chết.
     *
     * `domain_id` thì KHÔNG rút: nó là cột thật của `touch_points`, bộ dựng chung xử lý đúng.
     */
    const statusFilter = readStringFilter(queryParams?.filters?.status) as MergedStatus | undefined
    const rowTypeFilter = readStringFilter(queryParams?.filters?.row_type)

    /**
     * `domain_id = NO_CUSTOM_DOMAIN` → `domain_id IS NULL`.
     *
     * Cần một mục riêng vì ĐO ĐƯỢC rằng nhóm này không với tới bằng bất kỳ domain nào trong bảng
     * `domains`: 8/9 hàng phục vụ trên `app.example.com` (host artifact, **không**
     * có hàng trong `domains`), 1 hàng còn lại có `domain_id` rỗng dù chạy trên domain hệ thống.
     * Thiếu mục này thì người dùng chọn lần lượt hết mọi domain vẫn không thấy đủ 65 hàng.
     */
    const domainFilter = readStringFilter(queryParams?.filters?.domain_id)
    const wantsNoCustomDomain = domainFilter === NO_CUSTOM_DOMAIN

    const artifactStatuses = statusFilter ? ARTIFACT_STATUS_BY_BUCKET[statusFilter] : undefined
    /** Ô artifact thuần (đã gỡ, chưa xuất bản, bị chặn, hết hạn) lọc bằng inner join. */
    const artifactOnlyStatuses =
      statusFilter && statusFilter !== 'live' ? artifactStatuses : undefined

    /**
     * "Đang phục vụ" là ô DUY NHẤT bắc qua cả hai loại, và PostgREST không biểu diễn được `OR`
     * giữa bảng cha và bảng nhúng — đã thử hai cú pháp trên DB thật, cả hai hỏng. Nên lấy trước
     * id của artifact đang live rồi ghép vào một `or(...)` chỉ trên bảng cha.
     *
     * Danh sách id bị chặn trần bởi hạn mức live (50/tổ chức), xem `findTouchPointIdsByStatus`.
     */
    const liveArtifactTpIds =
      statusFilter === 'live' && rowTypeFilter !== 'link'
        ? await artifactRepo.findTouchPointIdsByStatus(orgId, ARTIFACT_STATUS_BY_BUCKET.live!)
        : undefined

    const needsArtifactJoin = Boolean(artifactOnlyStatuses?.length) || rowTypeFilter === 'artifact'

    // Get permission data upfront so we can use it in the DB query modifier
    // This allows filtering at the database level for correct pagination count
    let collectionFilterData:
      Awaited<ReturnType<TouchPointService['getAccessibleTouchPointIds']>> | undefined

    if ((applyCollectionPermissions || editableOnly) && userId) {
      if (editableOnly) {
        const data = await this.getEditableTouchPointIds(orgId, userId)
        collectionFilterData = {
          accessibleCollectionIds: data.editableCollectionIds,
          canAccessUncategorized: data.canEditUncategorized,
          uncategorizedScope: data.uncategorizedEditScope,
        }
      } else {
        collectionFilterData = await this.getAccessibleTouchPointIds(orgId, userId)
      }
    }

    const modifier = (query: PostgrestFilterBuilder<any, any, any>) => {
      if (queryParams) {
        const paramsForBuilder = {
          ...queryParams,
          filters: { ...queryParams.filters },
        }

        if (queryParams.filters?.tag_ids) {
          delete paramsForBuilder.filters.tag_ids
          paramsForBuilder.filters['tp_tag_links.tag_id'] = queryParams.filters?.tag_ids
        }

        delete paramsForBuilder.filters.status
        delete paramsForBuilder.filters.row_type
        if (wantsNoCustomDomain) delete paramsForBuilder.filters.domain_id

        query = queryBuilderByParams(query, paramsForBuilder)
        if (queryParams.search) {
          const slugSearch = queryParams.search.replace(/\s+/g, '-')
          query = query.or(
            `name.ilike.%${queryParams.search}%,slug.ilike.%${slugSearch}%,short_code.ilike.%${queryParams.search}%`
          )
        }
      }

      query = this.applyCollectionPermissionFilter(query, collectionFilterData, userId, {
        fallbackScope: scope,
        excludeCollectionId,
      })

      // Áp SAU `queryBuilderByParams`: khoá có dấu chấm trỏ vào bảng nhúng, không phải cột của
      // `touch_points`, và bộ dựng chung không phân biệt được hai thứ đó.
      if (artifactOnlyStatuses?.length) query = query.in('artifacts.status', artifactOnlyStatuses)

      // `ilike` không phân biệt chữ: LiHi có cả `URL` và `url`. Xem `isArtifactContentType`.
      if (rowTypeFilter === 'artifact') query = query.ilike('content_type', ARTIFACT_CONTENT_TYPE)
      if (rowTypeFilter === 'link')
        query = query.not('content_type', 'ilike', ARTIFACT_CONTENT_TYPE)

      if (statusFilter === 'live') {
        const linkIsHealthy = `and(content_type.not.ilike.${ARTIFACT_CONTENT_TYPE},enabled.is.true,safety_status.is.null)`
        if (rowTypeFilter === 'link') {
          query = query.eq('enabled', true).is('safety_status', null)
        } else if (rowTypeFilter === 'artifact') {
          query = query.in('id', liveArtifactTpIds ?? [])
        } else {
          query = query.or(`id.in.(${(liveArtifactTpIds ?? []).join(',')}),${linkIsHealthy}`)
        }
      }

      if (wantsNoCustomDomain) query = query.is('domain_id', null)

      if (statusFilter === 'flagged') query = query.eq('safety_status', 'flagged')
      if (statusFilter === 'disabled') {
        // `flagged` thắng `disabled` (xem `getMergedStatus`), nên loại hàng bị gắn cờ ra khỏi đây
        // — nếu không, một hàng vừa tắt vừa bị gắn cờ sẽ đếm vào hai ô và phá bất biến tổng.
        query = query.eq('enabled', false).or('safety_status.is.null,safety_status.neq.flagged')
      }

      return query
    }

    const result = await this.repo.findAllByOrganization(orgId, modifier, {
      useInnerJoinForTags,
      filterArtifactStatus: needsArtifactJoin,
    })
    return result
  }

  /**
   * Số link thường (`content_type = 'URL'`) của tổ chức, cho phần quota trên header danh sách gộp.
   *
   * CỐ Ý không nhận `queryParams`: đây là con số tồn kho ("bạn có 24 link"), không phải số kết quả
   * tìm kiếm. Cho nó đổi theo ô tìm kiếm thì nó đứng cạnh `3/50 artifact` — một hạn mức không đổi —
   * và hai con số cạnh nhau sẽ có nghĩa khác nhau mà không gì nói ra.
   *
   * Phần artifact và dung lượng KHÔNG đếm ở đây: `GET …/artifacts/quota` đã là nguồn của chúng.
   */
  async countLinks(
    orgId: string,
    options?: { scope?: RolePermissionScope; userId?: string }
  ): Promise<number> {
    const { scope, userId } = options ?? {}

    const collectionFilterData = userId
      ? await this.getAccessibleTouchPointIds(orgId, userId)
      : undefined

    const modifier = (query: PostgrestFilterBuilder<any, any, any>) =>
      this.applyCollectionPermissionFilter(query, collectionFilterData, userId, {
        fallbackScope: scope,
      })

    return this.repo.countByContentType(orgId, TouchPointContentType.URL, modifier)
  }

  /**
   * Retrieves touch points for export with specified fields and filtering.
   * Validates organization has export feature access and applies permission scoping.
   * Includes detailed logging for export operations.
   *
   * @param {string} orgId - The organization ID
   * @param {(keyof TouchPointExportType)[]} fields - Array of field names to export
   * @param {SearchFilterPagination} [queryParams] - Optional query parameters for filtering and pagination
   * @returns {Promise<any[]>} Array of touch points with selected fields
   * @throws {Error} When organization doesn't have export feature access
   */
  async getAllTouchPointsForExport(
    orgId: string,
    fields: (keyof TouchPointExportType)[],
    queryParams?: SearchFilterPagination
  ) {
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.EXPORT_TOUCHPOINTS)

    const startTime = Date.now()

    log.info(
      {
        method: 'getAllTouchPointsForExport',
        orgId,
        fieldsCount: fields.length,
        fields,
        queryParams,
      },
      'Starting touch points export'
    )

    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const filterByTagIds = Boolean(queryParams?.filters?.tag_ids?.length)
    const select = this.buildExportSelectQuery(fields, filterByTagIds)

    log.info(
      { method: 'getAllTouchPointsForExport', orgId, select },
      'Generated select query for export'
    )

    const userId = requestContext.getStore()?.userId!
    const collectionFilterData = await this.getAccessibleTouchPointIds(orgId, userId)

    const modifier = (query: PostgrestFilterBuilder<any, any, any>) => {
      if (queryParams) {
        log.debug(
          {
            method: 'getAllTouchPointsForExport',
            orgId,
            filters: queryParams.filters,
            search: queryParams.search,
          },
          'Applying query parameters to export query'
        )

        const paramsForBuilder = {
          ...queryParams,
          filters: { ...queryParams.filters },
        }

        if (paramsForBuilder.filters?.tag_ids) {
          paramsForBuilder.filters['tp_tag_links.tag_id'] = paramsForBuilder.filters.tag_ids
          delete paramsForBuilder.filters.tag_ids
        }

        query = queryBuilderByParams(query, paramsForBuilder)
        if (queryParams.search) {
          const slugSearch = queryParams.search.replace(/\s+/g, '-')
          query = query.or(
            `name.ilike.%${queryParams.search}%,slug.ilike.%${slugSearch}%,short_code.ilike.%${queryParams.search}%`
          )
        }
      }

      return this.applyCollectionPermissionFilter(query, collectionFilterData, userId, {
        fallbackScope: scope,
      })
    }

    const result = await this.repo.getAllTouchPointForExport(orgId, select, modifier)
    const duration = Date.now() - startTime

    log.info(
      {
        method: 'getAllTouchPointsForExport',
        orgId,
        duration,
        recordsCount: result.length,
        fieldsCount: fields.length,
      },
      'Touch points export completed successfully'
    )

    return result
  }

  /**
   * Retrieves all touch points with qr_code enabled for an organization with optional filtering and pagination.
   * Supports search by name, tag filtering, and permission-based scoping.
   * NOW WITH COLLECTION PERMISSIONS: Filters touch-points based on collection access.
   *
   * @param {string} orgId - The organization ID
   * @param {Object} [options] - Optional parameters for filtering and scoping
   * @param {RolePermissionScope} [options.scope] - Permission scope for filtering results (for uncategorized touch-points)
   * @param {string} [options.userId] - User ID for permission filtering
   * @param {SearchFilterPagination} [options.queryParams] - Query parameters for search, filtering, and pagination
   * @param {boolean} [options.applyCollectionPermissions] - Whether to apply collection-based permission filtering (default: false for backward compatibility)
   * @returns {Promise<any>} Array of touch points matching the criteria
   */
  async getAllTouchPointsWithQrCode(
    orgId: string,
    options?: {
      scope?: RolePermissionScope
      userId?: string
      queryParams?: SearchFilterPagination
      applyCollectionPermissions?: boolean
    }
  ) {
    const { scope, userId, queryParams, applyCollectionPermissions = false } = options ?? {}

    // Check if tag filtering is needed to use inner join
    const useInnerJoinForTags = Boolean(queryParams?.filters?.tag_ids?.length)

    // Get permission data upfront so we can use it in the DB query modifier
    // This allows filtering at the database level for correct pagination count
    let collectionFilterData:
      | {
          allowedCollectionIds: string[]
          canAccessUncategorized: boolean
          uncategorizedScope?: RolePermissionScope
        }
      | undefined

    if (applyCollectionPermissions && userId) {
      const data = await this.getAccessibleTouchPointIds(orgId, userId)
      collectionFilterData = {
        allowedCollectionIds: data.accessibleCollectionIds,
        canAccessUncategorized: data.canAccessUncategorized,
        uncategorizedScope: data.uncategorizedScope,
      }
    }

    const modifier = (query: PostgrestFilterBuilder<any, any, any>) => {
      if (queryParams) {
        const paramsForBuilder = {
          ...queryParams,
          filters: { ...queryParams.filters },
        }

        if (queryParams.filters?.tag_ids) {
          delete paramsForBuilder.filters.tag_ids
          paramsForBuilder.filters['tp_tag_links.tag_id'] = queryParams.filters?.tag_ids
        }

        query = queryBuilderByParams(query, paramsForBuilder)
        if (queryParams.search) {
          const slugSearch = queryParams.search.replace(/\s+/g, '-')
          query = query.or(
            `name.ilike.%${queryParams.search}%,slug.ilike.%${slugSearch}%,short_code.ilike.%${queryParams.search}%`
          )
        }
      }

      // Apply collection-based permissions IN THE QUERY for correct pagination count
      if (collectionFilterData) {
        const { allowedCollectionIds, canAccessUncategorized, uncategorizedScope } =
          collectionFilterData

        // Build OR conditions for collection filtering
        const conditions: string[] = []

        // Condition 1: Touch-points in accessible collections
        if (allowedCollectionIds.length > 0) {
          conditions.push(`collection_id.in.(${allowedCollectionIds.join(',')})`)
        }

        // Condition 2: Uncategorized touch-points (if allowed)
        if (canAccessUncategorized) {
          if (uncategorizedScope === RolePermissionScope.OWN) {
            // Can only access own uncategorized touch-points
            conditions.push(`and(collection_id.is.null,user_id.eq.${userId})`)
          } else {
            // Can access all uncategorized touch-points
            conditions.push('collection_id.is.null')
          }
        }

        // Apply the OR filter
        if (conditions.length > 0) {
          query = query.or(conditions.join(','))
        } else {
          // No accessible touch-points - return empty result by matching impossible condition
          query = query.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      } else if (scope === RolePermissionScope.OWN && userId) {
        // Legacy behavior: filter by user_id for uncategorized touch-points
        query = query.eq('user_id', userId)
      }

      return query
    }

    const result = await this.repo.findAllByOrganizationWithQrCodeEnabled(orgId, modifier, {
      useInnerJoinForTags,
    })
    return result
  }

  /**
   * Creates a new touch point with comprehensive validation and setup.
   * Handles permission checks, plan limits, tag creation, meta tag extraction,
   * short URL generation, and QR code customization.
   *
   * @param {string} orgId - The organization ID
   * @param {z.infer<typeof touchPointFormSchema>} validatedData - Validated touch point form data
   * @param {string} userId - The user ID creating the touch point
   * @returns {Promise<any>} The created touch point with generated short URL and metadata
   * @throws {Error} When permission checks fail, plan limits are exceeded, or validation errors occur
   */
  async createTouchPoint(
    orgId: string,
    // validatedData: z.infer<typeof touchPointFormSchema>,
    validatedData: z.infer<typeof touchPointFormCreateWithAdvanceSchema>,
    userId: string
  ) {
    let createdTagIds: string[] = []
    let createdTpId: string | null = null
    try {
      if (validatedData.content_value) {
        await validateUrls([validatedData.content_value])
      }

      const optionalFields: Partial<TablesInsert<'touch_points'>> = {}

      if (validatedData.meta_tags && validatedData.meta_tags.enabled) {
        await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.ALLOW_CUSTOM_META_TAGS, {
          errorMessage: "This organization doesn't allow custom meta tags",
        })
        optionalFields.meta_tags = await this.parseMetaTags(validatedData.meta_tags)
      }

      if (validatedData.utm_tags && validatedData.utm_tags.enabled) {
        await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.ALLOW_CUSTOM_UTM_TAGS, {
          errorMessage: "This organization doesn't allow custom utm tags",
        })
        optionalFields.utm_tags = validatedData.utm_tags
      }

      if (validatedData.targeting) {
        optionalFields.targeting = await this.parseTargeting(orgId, validatedData.targeting)
      }

      if (validatedData.access_control) {
        optionalFields.access_control = await this.parseAccessControl(
          orgId,
          validatedData.access_control
        )
      }

      if (validatedData.redirect_setting) {
        optionalFields.redirect_setting = await this.parseRedirectSettings(
          orgId,
          validatedData.redirect_setting
        )
      }

      if (validatedData.privacy_security) {
        optionalFields.privacy_security = await this.parsePrivacySecurity(
          orgId,
          validatedData.privacy_security
        )
      }

      if (validatedData.conversion_tracking) {
        optionalFields.conversion_tracking = validatedData.conversion_tracking
      }

      if (validatedData.tracking) {
        optionalFields.tracking = await this.parseTrackingSettings(orgId, validatedData.tracking)
      }

      // Add collection_id if provided
      if (validatedData.collection_id) {
        optionalFields.collection_id = validatedData.collection_id
      }

      if (FORCE_QR_ENABLED) {
        validatedData.variants_content = {
          ...validatedData.variants_content,
          QR: { enabled: true, ...validatedData.variants_content?.QR },
        }
      }

      const enabledVariants = Object.entries(validatedData.variants_content || {})
        .map(([variant, { enabled }]) => (enabled ? variant : null))
        .filter(Boolean) as string[]

      //** Permission check */
      await ensurePolicy(orgId, nonScopePolicies.add_touch_point)

      //** Plan check */
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_TPS_PER_MONTH, {
        errorMessage:
          "This organization reached the maximum number of touch points allowed organization's plan in this month",
      })

      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_TPS_PER_ORG, {
        errorMessage:
          "This organization reached the maximum number of touch points allowed organization's plan",
      })

      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.ALLOWED_TP_TYPES, {
        expectedValue: enabledVariants,
        errorMessage: "This touch point use types that are not allowed by organization's plan",
      })

      let domain = process.env.NEXT_PUBLIC_SHORT_LINK_URL
      if (validatedData.domain_id) {
        const result = await domainService.findActiveDomainOrThrow(orgId, validatedData.domain_id)
        domain = `https://${result.domain}`
      } else {
        const defaultDomain = await domainService.findDefaultOrgDomain(orgId)
        if (defaultDomain) {
          domain = `https://${defaultDomain.domain}`
          validatedData.domain_id = defaultDomain.id
        }
      }

      const nextShortId = await this.repo.getNextShortId()
      const shortCode = encode(nextShortId + SHORT_ID_OFFSET)
      const shortUrl = `${domain}/${validatedData.slug || shortCode}`

      let qrPath: string | null = null
      if (validatedData.variants_content?.QR?.enabled) {
        const { options, qrImage } = await this.parseQrCustomizeOptions(
          validatedData.qr_customize_options ?? {},
          validatedData.qr_logo_image,
          shortUrl,
          nextShortId
        )
        optionalFields.qr_customize_options =
          options as TablesInsert<'touch_points'>['qr_customize_options']

        qrPath = qrImage
      }

      const requiredFields: TablesInsert<'touch_points'> = {
        name: validatedData.name || shortCode,
        desc: validatedData.desc,
        short_id: nextShortId,
        short_code: shortCode,
        organization_id: orgId,
        short_url: shortUrl,
        slug: validatedData.slug,
        variants_content: validatedData.variants_content,
        content_type: validatedData.content_type,
        content_value: validatedData.content_value,
        user_id: userId,
        path_qr_code: qrPath,
        domain_id: validatedData.domain_id,
      }

      const insertedTp = await this.repo.create({
        ...requiredFields,
        ...optionalFields,
      })

      createdTpId = insertedTp.id
      if (validatedData.slug) {
        await slugService.createSlug(orgId, validatedData.slug, createdTpId, userId)
      }

      if (validatedData.tags) {
        const createdTags = await tagService.bulkCreateOrLinkTags(
          orgId,
          insertedTp.id,
          userId,
          validatedData.tags
        )
        createdTagIds = createdTags.map((tag) => tag.id)
      }

      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'touch_point',
          action: 'create',
          target_id: insertedTp.id,
          target_name: insertedTp.name,
          target_table: 'touch_points',
          target_extra: insertedTp,
        },
        {},
        insertedTp
      )

      return insertedTp
    } catch (error: any) {
      if (createdTpId) {
        await this.rollBackCreateTp(createdTpId, createdTagIds)
      }
      if (error?.code === '23505') {
        throw new BadRequestError('Slug was taken by another user, please choose another slug!', {
          key: 'common:messages.error.slug_is_taken',
        })
      }
      throw error
    }
  }

  public async bulkCreateFromDestinations(orgId: string, userId: string, destinations: string[]) {
    const domain = await domainService.findDefaultOrgDomain(orgId)
    await validateUrls(destinations)
    const shortIds = await touchPointService.getNextShortIds(destinations.length)

    const touchPoints: TablesInsert<'touch_points'>[] = destinations.map((destination, index) => {
      const shortCode = encode(shortIds[index].id + SHORT_ID_OFFSET)
      return {
        organization_id: orgId,
        user_id: userId,
        name: shortCode,
        content_type: TouchPointContentType.URL,
        content_value: destination,
        short_id: shortIds[index].id,
        short_code: shortCode,
        short_url: `${domain?.domain || process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${shortCode}`,
        ...(FORCE_QR_ENABLED && {
          variants_content: {
            QR: { enabled: true },
            NFC: { enabled: false },
            WIFI: { enabled: false },
          },
        }),
      }
    })
    const createdTps = await this.bulkCreateBasicTp(touchPoints)
    return createdTps
  }
  /**
   * Creates multiple basic touch points in bulk without advanced features.
   * Validates permissions and plan limits, then logs audit events for each created touch point.
   *
   * @param {TablesInsert<'touch_points'>[]} touchPoints - Array of touch point data to create
   * @returns {Promise<any[]>} Array of created touch points
   * @throws {Error} When permission checks fail or plan limits are exceeded
   */
  public async bulkCreateBasicTp(touchPoints: TablesInsert<'touch_points'>[]) {
    const createdTpIds: string[] = []
    try {
      if (touchPoints.length > 0) {
        await ensurePolicy(touchPoints[0].organization_id, nonScopePolicies.add_touch_point)

        //** Plan check */
        await ensureOrgPlan(touchPoints[0].organization_id, PLAN_LIMIT_KEYS.MAX_TPS_PER_MONTH, {
          errorMessage:
            "This organization reached the maximum number of touch points allowed organization's plan in this month",
        })
      }
      const createdTps = await this.repo.bulkCreate(touchPoints)

      orgAuditLogService.bulkLogEvent(
        createdTps.map((tp) => ({
          organization_id: tp.organization_id,
          user_id: tp.user_id,
          module: 'touch_point',
          action: 'create',
          target_id: tp.id,
          target_name: tp.name,
          target_table: 'touch_points',
          target_extra: tp,
          changes: getObjectDiff({}, tp),
        }))
      )

      return createdTps
    } catch (error: any) {
      await this.rollBackCreateTp(createdTpIds, [])
      throw error
    }
  }
  /**
   * Creates a single basic touch point without advanced features.
   * Validates permissions and plan limits, then logs an audit event.
   *
   * @param {TablesInsert<'touch_points'>} touchPoint - Touch point data to create
   * @returns {Promise<any>} The created touch point
   * @throws {Error} When permission checks fail or plan limits are exceeded
   */
  public async createBasicTp(touchPoint: TablesInsert<'touch_points'>) {
    await ensurePolicy(touchPoint.organization_id, nonScopePolicies.add_touch_point)

    //** Plan check */
    await ensureOrgPlan(touchPoint.organization_id, PLAN_LIMIT_KEYS.MAX_TPS_PER_MONTH, {
      errorMessage:
        "This organization reached the maximum number of touch points allowed organization's plan in this month",
    })

    const insertedTp = await this.repo.create(touchPoint)
    orgAuditLogService.logEvent({
      organization_id: touchPoint.organization_id,
      user_id: touchPoint.user_id,
      module: 'touch_point',
      action: 'create',
      target_id: insertedTp.id,
      target_name: insertedTp.name,
      target_table: 'touch_points',
      target_extra: insertedTp,
      changes: getObjectDiff({}, insertedTp),
      metadata: {},
    })
    return insertedTp
  }

  /**
   * Retrieves the next available short ID for touch point creation.
   *
   * @returns {Promise<number>} The next short ID
   */
  public async getNextShortId() {
    return this.repo.getNextShortId()
  }
  /**
   * Generates a QR code image from the provided options.
   *
   * @param {Options} options - QR code styling options
   * @returns {Promise<Buffer>} The QR code image as a PNG buffer
   */
  public async getQrImage(options: Options) {
    const qrImage = new QrCodeStyling({ ...options, jsdom: JSDOM, nodeCanvas })
    return qrImage.getRawData('png')
  }

  /**
   * Parses and processes QR code customization options, including logo upload and image generation.
   * Uploads the logo to storage if provided as a file, generates the QR code with watermark,
   * and returns both the options and the uploaded QR image URL.
   *
   * @param {Object} qrCustomizeOptions - QR code customization options
   * @param {string} [qrCustomizeOptions.qrCodePath] - Optional existing QR code path
   * @param {File | string} qrLogoImage - QR code logo (File to upload or existing URL)
   * @param {string} shortUrl - The short URL to encode in the QR code
   * @param {number} shortId - The touch point short ID for file naming
   * @returns {Promise<{options: Options, qrImage: string}>} The QR options and uploaded image URL
   */
  public async parseQrCustomizeOptions(
    qrCustomizeOptions: z.infer<typeof touchPointFormSchema.shape.qr_customize_options> & {
      qrCodePath?: string
    },
    qrLogoImage: z.infer<typeof touchPointFormSchema.shape.qr_logo_image>,
    shortUrl: string,
    shortId: number
  ): Promise<{ options: Options; qrImage: string }> {
    let qrLogo: string | undefined = undefined
    if (qrLogoImage instanceof File) {
      const { uploadRespone } = await uploadFile({
        folder: 'qr-logo',
        logo_type: 'qr-logo',
        file: qrLogoImage,
      })
      qrLogo = `${process.env.SUPABASE_URL}/storage/v1/object/public/${uploadRespone?.fullPath}`
    } else {
      qrLogo = qrLogoImage
    }
    const qrUrl = new URL(shortUrl)
    qrUrl.searchParams.set('t', '1')

    const defaultOptions = getQrDefaultOptions(qrUrl.toString())
    const options = {
      ...defaultOptions,
      ...qrCustomizeOptions,
      ...(qrLogo && { image: qrLogo }),
      data: qrUrl.toString(),
      // always use server-computed typeNumber — client default (5) can't encode longer URLs
      qrOptions: {
        ...defaultOptions.qrOptions,
        ...qrCustomizeOptions?.qrOptions,
        typeNumber: defaultOptions.qrOptions?.typeNumber,
      },
    }
    const optimizeSize = getOptimizeSize(options.qrOptions?.typeNumber)

    const qr = new QrCodeStyling({
      type: 'svg',
      jsdom: JSDOM,
      nodeCanvas,
      ...options,
      ...(qrLogo && { image: qrLogo }),
      width: optimizeSize,
      height: optimizeSize,
    })

    const qrImage = await qr.getRawData('svg')
    let uploadRespone: { id: string; path: string; fullPath: string } | null = null
    if (qrImage) {
      const svg = await addWatermark(qrImage)
      const file = new File([svg], `${shortId}`, { type: 'image/svg+xml' })
      uploadRespone = await simpleUploadFile({
        folder: 'qr-images',
        file,
        options: {
          skipValidateFileType: true,
          fallbackFileType: 'image/svg+xml',
        },
      })
    }

    return {
      options,
      qrImage: `${process.env.SUPABASE_URL}/storage/v1/object/public/${uploadRespone?.fullPath}`,
    }
  }

  /**
   * Updates the slug for an existing touch point and regenerates the short URL.
   * Validates permissions, plan limits, and ensures slug uniqueness.
   *
   * @param {string} orgId - The organization ID
   * @param {string} tpId - The touch point ID to update
   * @param {string} slug - The new slug to assign
   * @param {string} userId - The user ID performing the update
   * @returns {Promise<any>} The updated touch point with new slug and short URL
   * @throws {Error} When permission checks fail or plan limits are exceeded
   */
  public async updateTpSlug(orgId: string, tpId: string, slug: string, userId: string) {
    // NOTE: Permission check is already done by ensureCanEditTouchPoint() in the caller (updateAndReturn)
    // which handles collection-based permissions correctly. We don't need to re-apply scope filtering here
    // because that would break collaborative editing in shared collections (org_permission = CAN_EDIT).
    // The scope filtering below has been commented out to allow users to edit touch-points in collections
    // where they have edit permission via org_permission, even if they didn't create the touch-point.

    // const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)

    const tp = await slugService.getTpSlugs(orgId, tpId)
    // Previous code with scope filtering:
    // const tp = await slugService.getTpSlugs(orgId, tpId, {
    //   scope,
    //   userId,
    // })

    if (slug === tp.slug) {
      return
    }

    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_SLUGS_PER_TP, {
      expectedValue: tp.slugs?.length || 0,
      errorMessage:
        "This touch point reached the maximum number of slugs allowed by organization's plan",
    })

    const createdSlug = await slugService.createSlug(orgId, slug, tpId, userId)
    // log.info({ createdSlug })
    const shortUrlUpdated = `https://${parse(tp.short_url).hostname}/${createdSlug.slug}`

    // NOTE: Modifier with user_id filter commented out for collaborative editing support.
    // Permission is already validated by the caller via ensureCanEditTouchPoint().
    // const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
    //   if (scope === RolePermissionScope.OWN) {
    //     q = q.eq('user_id', userId)
    //   }
    //   return q
    // }

    const updatedTp = await this.repo.updateById(
      orgId,
      tpId,
      { slug: createdSlug.slug, short_url: shortUrlUpdated }
      // modifier  // Removed for collaborative editing support
    )
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: userId,
      module: 'touch_point',
      action: 'update',
      target_id: tpId,
      target_table: 'touch_points',
      changes: getObjectDiff(
        {
          slug: tp.slug,
          short_url: tp.short_url,
        },
        { slug: createdSlug.slug, short_url: shortUrlUpdated }
      ),
    })

    return updatedTp
  }

  /**
   * Updates a touch point with comprehensive validation and returns the updated data.
   * Handles updates to all touch point fields including meta tags, UTM tags, targeting,
   * access control, redirect settings, tracking, privacy/security, QR codes, and tags.
   * Only updates changed fields and logs all changes to audit log.
   *
   * @param {string} orgId - The organization ID
   * @param {string} tpId - The touch point ID to update
   * @param {z.infer<typeof touchPointUpdateSchema>} data - Validated update data
   * @param {string} userId - The user ID performing the update
   * @returns {Promise<any>} The updated touch point
   * @throws {Error} When permission checks fail or plan limits are exceeded
   */
  async updateAndReturn(
    orgId: string,
    tpId: string,
    data: z.infer<typeof touchPointUpdateSchema>,
    userId: string
  ) {
    // Note: Permission check is done by the caller (ensureCanEditTouchPoint)
    // which handles collection-based permissions correctly
    const touchPoint = await this.getTouchPointDetail(orgId, tpId)

    if (touchPoint.safety_status === 'flagged') {
      throw new ForbiddenError(
        'This link is frozen due to a safety violation. Only an admin can restore it.',
        {
          key: 'common:safety.flagged_frozen_notice',
        }
      )
    }

    const fields: TablesUpdate<'touch_points'> = pickDefined({
      name: data.name,
      slug: data.slug,
      variants_content: data.variants_content,
      content_type: data.content_type,
      content_value: data.content_value,
      enabled: data.enabled,
      collection_id: data.collection_id,
    })

    if (data.content_value && data.content_value !== touchPoint.content_value) {
      await validateUrls([data.content_value])
    }

    if (data.targeting) {
      const oldTargeting = touchPoint.targeting as z.infer<typeof dynamicTargetingSchema>
      const newTargeting = await this.parseTargeting(orgId, {
        ...oldTargeting,
        ...data.targeting,
      })
      fields.targeting = newTargeting
    }

    if (data.access_control) {
      const oldAccessControl = touchPoint.access_control as z.infer<typeof accessControlSchema>

      //the new null values will override the existing values (null = user remove them from input)
      const newAccessControl = await this.parseAccessControl(orgId, {
        ...oldAccessControl,
        ...data.access_control,
      })
      fields.access_control = newAccessControl
    }

    if (data.redirect_setting) {
      const oldRedirectSetting = touchPoint.redirect_setting as z.infer<
        typeof redirectSettingSchema
      >
      const newRedirectSetting = await this.parseRedirectSettings(orgId, {
        ...oldRedirectSetting,
        ...data.redirect_setting,
      })
      fields.redirect_setting = newRedirectSetting
    }

    if (data.tracking) {
      const oldTracking = touchPoint.tracking as z.infer<typeof trackingSchema>
      const newTracking = await this.parseTrackingSettings(orgId, {
        ...oldTracking,
        ...data.tracking,
      })
      fields.tracking = newTracking
    }

    if (data.privacy_security) {
      const oldPrivacySecurity = touchPoint.privacy_security as z.infer<
        typeof privacySecuritySchema
      >
      const newPrivacySecurity = await this.parsePrivacySecurity(orgId, {
        ...oldPrivacySecurity,
        ...data.privacy_security,
      })
      fields.privacy_security = newPrivacySecurity
    }

    if (data.conversion_tracking) {
      const oldConversionTracking = (touchPoint.conversion_tracking as { enabled?: boolean }) || {}
      fields.conversion_tracking = {
        ...oldConversionTracking,
        ...data.conversion_tracking,
      }
    }

    const updateFields: TablesUpdate<'touch_points'> = getChangedFields(touchPoint, fields)

    // Update variants_content
    if (updateFields.variants_content) {
      const enabledVariants = Object.entries(updateFields.variants_content || {})
        .map(([variant, { enabled }]) => (enabled ? variant : null))
        .filter(Boolean) as string[]
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.ALLOWED_TP_TYPES, {
        expectedValue: enabledVariants,
        errorMessage: "This touch point use types that are not allowed by organization's plan",
      })
    }

    // Update tags
    if (data.tags) {
      const currentTags = touchPoint.tp_tag_links?.map((tpTagLink) => tpTagLink.tag_id) || []
      if (!equal(currentTags, data.tags)) {
        await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_TAGS_PER_TP, {
          expectedValue: (data.tags || []).length,
          errorMessage:
            "This touch point reached the maximum number of tags allowed by organization's plan",
        })
        await tagService.replaceTpTags(orgId, tpId, userId, data.tags || [])
      }
    }

    // Update meta tags
    if (data.meta_tags && !equal(data.meta_tags, touchPoint.meta_tags)) {
      if (data.meta_tags.enabled) {
        await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.ALLOW_CUSTOM_META_TAGS, {
          errorMessage: "This organization doesn't allow custom meta tags",
        })
      }
      const metaTags = await this.parseMetaTags(data.meta_tags)
      updateFields.meta_tags = metaTags

      // Invalidate Facebook's cached Open Graph tags for this URL
      // This runs asynchronously without blocking the update
      if (touchPoint.short_url) {
        facebookGraphService.scrapeUrl(touchPoint.short_url).catch((error) => {
          log.warn(
            {
              touchPointId: tpId,
              shortUrl: touchPoint.short_url,
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to invalidate Facebook OG tags after meta tag update'
          )
        })
      }
    }
    // Update utm tags
    if (data.utm_tags && !equal(data.utm_tags, touchPoint.utm_tags)) {
      if (data.utm_tags.enabled) {
        await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.ALLOW_CUSTOM_UTM_TAGS, {
          errorMessage: "This organization doesn't allow custom utm tags",
        })
      }
      updateFields.utm_tags = data.utm_tags
    }

    // Update slug
    if (data.slug && data.slug !== touchPoint.slug) {
      await this.updateTpSlug(orgId, tpId, data.slug, userId)
    }

    // Update QR
    if (data.variants_content?.QR?.enabled) {
      // const tp = await this.getTouchPointById(orgId, tpId)
      const options = data.qr_customize_options ?? {}
      const qrUrl = `https://${parse(touchPoint.short_url).hostname}/${
        data.slug || touchPoint.slug || touchPoint.short_code
      }?t=1`
      if (!equal(touchPoint.qr_customize_options, { ...options, data: qrUrl.toString() })) {
        const { options: qrCustomizeOptions, qrImage } = await this.parseQrCustomizeOptions(
          options,
          data.qr_logo_image ?? options.image,
          qrUrl,
          touchPoint.short_id
        )
        updateFields.qr_customize_options = qrCustomizeOptions as any
        updateFields.path_qr_code = qrImage
      }
    }
    // No modifier needed - permission check already done by ensureCanEditTouchPoint
    // This allows collaborative editing of touch-points in shared collections

    const changeKeys = Object.keys(updateFields)
    if (changeKeys.length === 0) {
      return touchPoint
    }
    const updatedTouchPoint = await this.repo.updateAndGetById(orgId, tpId, updateFields)

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: orgId,
        user_id: userId,
        module: 'touch_point',
        action: 'update',
        target_id: tpId,
        target_name: updatedTouchPoint.name,
        target_table: 'touch_points',
      },
      touchPoint,
      updatedTouchPoint,
      {
        changeKeys,
      }
    )

    return updatedTouchPoint
  }

  async getNextShortIds(count: number) {
    return this.repo.getNextShortIds(count)
  }
  /**
   * Parses and validates targeting configuration including smart targeting and A/B testing.
   * Validates organization plan limits and URL validity.
   *
   * @param {string} orgId - The organization ID
   * @param {z.infer<typeof dynamicTargetingSchema>} _targeting - Targeting configuration to parse
   * @returns {Promise<any>} The parsed and validated targeting configuration
   * @throws {Error} When plan limits are exceeded or URLs are invalid
   */
  async parseTargeting(orgId: string, _targeting: z.infer<typeof dynamicTargetingSchema>) {
    let targetUrls: string[] = []

    if (_targeting.targets && _targeting.targets.length > 0) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.LINK_TARGETING)
      _targeting.targets.map((target) => targetUrls.push(target.destination))
    }
    if (_targeting.ab_testing && _targeting.ab_testing.length > 0) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.AB_TESTING)
      _targeting.ab_testing.map((abTesting) => targetUrls.push(abTesting.url))
    }
    await validateUrls(targetUrls)
    return pickDefinedAndNotNull(_targeting)
  }

  /**
   * Parses and validates privacy and security settings including link cloaking and E2EE.
   * Validates organization plan limits for each feature.
   *
   * @param {string} orgId - The organization ID
   * @param {z.infer<typeof privacySecuritySchema>} _privacySecurity - Privacy/security settings to parse
   * @returns {Promise<any>} The parsed and validated privacy/security configuration
   * @throws {Error} When plan limits are exceeded
   */
  async parsePrivacySecurity(
    orgId: string,
    _privacySecurity: z.infer<typeof privacySecuritySchema>
  ) {
    if (_privacySecurity.link_cloaking) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.LINK_CLOAKING)
    }
    if (_privacySecurity.e2e_encryption) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.E2EE_ENCRYPTION)
    }

    return pickDefinedAndNotNull(_privacySecurity) as Tables<'touch_points'>['privacy_security']
  }

  /**
   * Parses and processes meta tags including image upload.
   * Uploads meta tag image to storage if provided as a file.
   *
   * @param {z.infer<typeof metaTagsSchema>} _metaTags - Meta tags configuration to parse
   * @returns {Promise<MetaTags>} The parsed meta tags with uploaded image URL
   */
  async parseMetaTags(_metaTags: z.infer<typeof metaTagsSchema>) {
    const metaTags: MetaTags = {
      enabled: _metaTags.enabled,
      title: _metaTags.title,
      description: _metaTags.description,
      isAutoFetched: _metaTags?.isAutoFetched,
    }
    if (_metaTags.image instanceof File) {
      const uploadRespone = await simpleUploadFile({
        folder: 'meta-tags',
        file: _metaTags.image,
        allowedTypes: allowedMetaTagImageFormat,
      })
      metaTags['image'] =
        `${process.env.SUPABASE_URL}/storage/v1/object/public/${uploadRespone?.fullPath}`
    } else {
      metaTags['image'] = _metaTags.image ?? undefined
    }
    return metaTags
  }
  /**
   * Parses and validates access control settings including limits, passwords, and expiration.
   * Validates organization plan limits for each feature and converts dates to ISO strings.
   *
   * @param {string} orgId - The organization ID
   * @param {z.infer<typeof accessControlSchema>} _accessControl - Access control settings to parse
   * @returns {Promise<any>} The parsed and validated access control configuration
   * @throws {Error} When plan limits are exceeded
   */
  async parseAccessControl(orgId: string, _accessControl: z.infer<typeof accessControlSchema>) {
    if (_accessControl.limit) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.LIMIT_ACCESS, {
        errorMessage: "This organization doesn't allow limit access",
      })
    }
    if (_accessControl.password) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.LINK_PASSWORD, {
        errorMessage: "This organization doesn't allow link password",
      })
    }

    if (_accessControl.expires_at || _accessControl.valid_from) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.LINK_EXPIRATION, {
        errorMessage: "This organization doesn't allow link expiration",
      })
    }

    return pickDefinedAndNotNull({
      ..._accessControl,
      expires_at:
        _accessControl.expires_at instanceof Date
          ? _accessControl.expires_at.toISOString()
          : _accessControl.expires_at,
      valid_from:
        _accessControl.valid_from instanceof Date
          ? _accessControl.valid_from.toISOString()
          : _accessControl.valid_from,
    })
  }
  /**
   * Parses and validates tracking settings for Facebook, Google, and TikTok pixels.
   * Validates organization plan limits for each tracking provider.
   *
   * @param {string} orgId - The organization ID
   * @param {z.infer<typeof trackingSchema>} _trackingSettings - Tracking settings to parse
   * @returns {Promise<any>} The parsed and validated tracking configuration
   * @throws {Error} When plan limits are exceeded
   */
  async parseTrackingSettings(orgId: string, _trackingSettings: z.infer<typeof trackingSchema>) {
    if (_trackingSettings.facebook) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.FACEBOOK_TRACKING, {
        errorMessage: "This organization doesn't allow facebook tracking",
      })
    }
    if (_trackingSettings.google) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.GOOGLE_TRACKING, {
        errorMessage: "This organization doesn't allow google tracking",
      })
    }
    if (_trackingSettings.tiktok) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.TIKTOK_TRACKING, {
        errorMessage: "This organization doesn't allow tiktok tracking",
      })
    }
    return pickDefinedAndNotNull(_trackingSettings)
  }

  /**
   * Parses and validates redirect settings including custom 404 URLs and status codes.
   * Validates organization plan limits for each feature.
   *
   * @param {string} orgId - The organization ID
   * @param {z.infer<typeof redirectSettingSchema>} _redirectSettings - Redirect settings to parse
   * @returns {Promise<any>} The parsed and validated redirect configuration
   * @throws {Error} When plan limits are exceeded
   */
  async parseRedirectSettings(
    orgId: string,
    _redirectSettings: z.infer<typeof redirectSettingSchema>
  ) {
    if (_redirectSettings.not_found_url) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.NOT_FOUND_URL, {
        errorMessage: "This organization doesn't allow link not found url",
      })
    }
    if (_redirectSettings.status_code) {
      await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.CUSTOM_REDIRECT_CODE, {
        errorMessage: "This organization doesn't allow custom redirect code",
      })
    }

    return pickDefinedAndNotNull({
      ..._redirectSettings,
    })
  }

  /**
   * Deletes a single touch point by its ID with permission validation.
   *
   * @param {string} orgId - The organization ID
   * @param {string} tpId - The touch point ID to delete
   * @param {string} userId - The user ID performing the deletion
   * @returns {Promise<number>} The deletion result
   * @throws {Error} When permission checks fail or touch point doesn't exist
   */
  async deleteTpById(orgId: string, tpId: string, userId: string) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_TOUCH_POINT)
    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }
    const { data: deleted, count } = await this.repo.deleteById(orgId, tpId, modifier)
    if (deleted) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'touch_point',
          action: 'delete',
          target_id: deleted.id,
          target_name: deleted.name,
          target_table: 'touch_points',
          target_extra: deleted,
        },
        deleted,
        {}
      )
    }
    return count
  }

  /**
   * Deletes multiple touch points by their IDs with permission validation.
   *
   * @param {string} orgId - The organization ID
   * @param {string[]} tpIds - Array of touch point IDs to delete
   * @param {string} userId - The user ID performing the deletion
   * @returns {Promise<number>} The bulk deletion result
   * @throws {Error} When permission checks fail or touch points don't exist
   */
  async deleteTpByIds(orgId: string, tpIds: string[], userId: string) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_TOUCH_POINT)
    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }
    const { data, count } = await this.repo.bulkDeleteByIds(orgId, tpIds, modifier)
    for (const deleted of data) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          user_id: userId,
          module: 'touch_point',
          action: 'delete',
          target_id: deleted.id,
          target_name: deleted.name,
          target_table: 'touch_points',
          target_extra: deleted,
        },
        deleted,
        {}
      )
    }
    return count
  }

  async getAllWithCampaignInfo(orgId: string, userId: string) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)
    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }
    return this.repo.getAllWithCampaignInfo(orgId, modifier)
  }

  /**
   * Updates touch point with raw data without validation or processing.
   * Used for internal updates that bypass business logic validation.
   * Validates permissions before updating.
   *
   * @param {string} orgId - The organization ID
   * @param {string} tpId - The touch point ID to update
   * @param {TablesUpdate<'touch_points'>} data - Raw update data
   * @param {string} userId - The user ID performing the update
   * @returns {Promise<any>} The update result
   * @throws {Error} When permission checks fail
   */
  async updateRawData(
    orgId: string,
    tpId: string,
    data: TablesUpdate<'touch_points'>,
    userId: string
  ) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)
    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }
    return this.repo.updateById(orgId, tpId, data, modifier)
  }

  /**
   * Rolls back a failed touch point creation by cleaning up created resources.
   * Used internally to maintain data consistency when creation operations fail.
   *
   * @private
   * @param {string} createdTpId - The ID of the touch point to delete
   * @param {string[]} createdTagIds - Array of tag IDs to delete
   * @returns {Promise<void>}
   */
  private async rollBackCreateTp(createdTpId: string | string[], createdTagIds: string[]) {
    if (Array.isArray(createdTpId)) {
      await this.repo.bulkDelete(createdTpId)
    } else {
      await this.repo.delete(createdTpId)
    }
    if (createdTagIds.length > 0) {
      await tagService.bulkDeleteTags(createdTagIds)
    }
  }

  /**
   * Enriches touch points that have conversion_tracking.enabled === true
   * with aggregated stats from customer_profiles (lead_count, sale_count, revenue).
   * Merged/duplicate profiles are excluded via merged_into_id IS NULL.
   */
  async enrichWithConversionCounts(touchPoints: TouchPointInList[]): Promise<TouchPointInList[]> {
    const eligibleIds = touchPoints
      .filter((tp) => (tp.conversion_tracking as any)?.enabled === true)
      .map((tp) => tp.id)

    if (eligibleIds.length === 0) return touchPoints

    const profiles = await this.repo.getConversionSummaryByTpIds(eligibleIds)

    // Intermediate map tracks unique lead customers per touch point
    type SummaryAcc = ConversionSummary & { leadCustomers: Set<string> }
    const summaryMap = new Map<string, SummaryAcc>()

    profiles.forEach(({ touch_point_id, event_type, customer_profile_id, amount, currency }) => {
      if (!touch_point_id) return
      if (!summaryMap.has(touch_point_id)) {
        summaryMap.set(touch_point_id, {
          lead_count: 0,
          total_revenue_usd: 0,
          total_revenue_vnd: 0,
          leadCustomers: new Set(),
        })
      }
      const s = summaryMap.get(touch_point_id)!

      // Lead count: unique customer_profile_id per touch point
      if (event_type === 'lead' && customer_profile_id) {
        s.leadCustomers.add(customer_profile_id)
      }

      // Revenue: sum by currency
      if (amount) {
        if (currency === 'USD') s.total_revenue_usd += amount
        else if (currency === 'VND') s.total_revenue_vnd += amount
      }
    })

    return touchPoints.map((tp) => {
      const s = summaryMap.get(tp.id)
      if (!s) return tp
      return {
        ...tp,
        conversion_summary: {
          lead_count: s.leadCustomers.size,
          total_revenue_usd: s.total_revenue_usd,
          total_revenue_vnd: s.total_revenue_vnd,
        } satisfies ConversionSummary,
      }
    })
  }
}

export const touchPointService =
  process.env.NODE_ENV !== 'production'
    ? new TouchPointService(touchPointRepo)
    : (globalThis._touchPointService ??
      (globalThis._touchPointService = new TouchPointService(touchPointRepo)))
