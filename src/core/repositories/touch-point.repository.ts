import { BaseRepository } from './base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import {
  TouchPointDetail,
  TouchPointExportType,
  TouchPointWithCampaign,
} from '../types/touch-point.type'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { Tables, TablesUpdate } from '@/shared/types/database.types'
import { attachArtifactMeta } from '../helpers/touch-point-artifact'

type ConversionSummaryRow = Pick<
  Tables<'conversion_events'>,
  'touch_point_id' | 'event_type' | 'customer_profile_id' | 'amount' | 'currency'
>

// AI Agent Platform — link-details read tool. Only the columns the tool projects, plus `id` —
// needed by touchPointService.ensureCanViewTouchPoint's per-member view gate.
//
// SL-0 §3/§4 widened it by five columns, for two callers at once: `get_link_details` publishes
// `id`, `short_url`, `qr_url` and `enabled` as OPTIONAL additions to its cross-repo contract, and
// `get_short_link` projects the whole `ShortLink` block, which also needs the timestamps. Adding
// columns to a `select` list is cheap; a second near-identical projection is not.
//
// ⚠️ `tp_tag_links` is NOT here and cannot be: this row comes from single-row lookups that do not
// join tags. `toShortLink` therefore reports `tags: []` for it — see that helper.
export type LinkDetailsRow = Pick<
  Tables<'touch_points'>,
  | 'id'
  | 'name'
  | 'slug'
  | 'short_code'
  | 'short_url'
  | 'content_type'
  | 'content_value'
  | 'utm_tags'
  | 'access_control'
  | 'path_qr_code'
  | 'enabled'
  | 'created_at'
  | 'updated_at'
>

/** The one source of the column list, shared by the id lookup and the slug/short_code/name one. */
const LINK_DETAILS_COLUMNS =
  'id, name, slug, short_code, short_url, content_type, content_value, utm_tags, ' +
  'access_control, path_qr_code, enabled, created_at, updated_at'

export class TouchPointRepository extends BaseRepository<'touch_points'> {
  constructor() {
    super('touch_points')
  }

  async findByIds(ids: string[]) {
    const { data, error } = await this.query().select('*').in('id', ids)
    if (error) throw error
    return data
  }

  async getTouchPointById(
    orgId: string,
    tpId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('*').eq('id', tpId).eq('organization_id', orgId)

    if (modifier) query = modifier(query)
    const { data, error } = await query.single()
    if (error) throw error
    return data
  }
  async getTouchPointDetail(
    orgId: string,
    tpId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email, avatar ),
          tp_tag_links(tag_id, tags ( id, name, color ))
        `
      )
      .eq('id', tpId)
      .eq('organization_id', orgId)

    if (modifier) query = modifier(query)
    const { data, error } = await query.single().overrideTypes<TouchPointDetail>()
    if (error) throw error
    return data
  }
  async findAllByOrganization(
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>,
    options?: { useInnerJoinForTags?: boolean; filterArtifactStatus?: boolean }
  ) {
    const tagJoinType = options?.useInnerJoinForTags ? '!inner' : ''
    /**
     * `!inner` CHỈ khi đang lọc theo trạng thái artifact.
     *
     * Không có nó, `.eq('artifacts.status', …)` chỉ lọc *bảng nhúng* — PostgREST vẫn trả đủ mọi
     * hàng cha, chỉ là hàng không khớp có `artifacts: null`. Kết quả là bộ lọc "đã gỡ" trả về cả
     * 61 hàng và trông như hỏng ngẫu nhiên.
     *
     * Và chỉ khi đang lọc: bật `!inner` thường trực sẽ **giấu mất 3 link thường**, vì link không có
     * hàng artifact nào để join.
     */
    const artifactJoinType = options?.filterArtifactStatus ? '!inner' : ''
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email, avatar ),
          tp_tag_links${tagJoinType} ( tag_id, tags ( id, name, color ) ),
          collections ( id, name, color ),
          artifacts${artifactJoinType} ( id, kind, status, access_mode, size_bytes, serve_token )
        `,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)

    if (modifier) query = modifier(query)
    const { data, error, count } = await query.returns<TouchPointDetail[]>()
    if (error) throw error

    // Fetch visit counts separately
    if (data && data.length > 0) {
      const enrichedData = await this.enrichWithVisitCounts(data)
      return { data: attachArtifactMeta(enrichedData), count }
    }

    return { data, count }
  }
  async getAllTouchPointForExport(
    orgId: string,
    select: string = '*',
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select(select).eq('organization_id', orgId)
    if (modifier) query = modifier(query)
    const { data, error } = await query.overrideTypes<TouchPointExportType[]>()
    if (error) throw error
    return data
  }

  async findAllByOrganizationWithQrCodeEnabled(
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>,
    options?: { useInnerJoinForTags?: boolean }
  ) {
    const tagJoinType = options?.useInnerJoinForTags ? '!inner' : ''
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email, avatar ),
          tp_tag_links${tagJoinType} ( tag_id, tags ( id, name, color ) ),
          collections ( id, name, color )
        `,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)
      .eq('variants_content->QR->enabled', true)

    if (modifier) query = modifier(query)
    const { data, error, count } = await query.returns<TouchPointDetail[]>()
    if (error) throw error

    // Fetch visit counts separately
    if (data && data.length > 0) {
      const enrichedData = await this.enrichWithVisitCounts(data)
      return { data: enrichedData, count }
    }

    return { data, count }
  }

  async findAllByTagIds(
    org_id: string,
    tagIds: string[],
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email, avatar ),
          tp_tag_links!inner(tag_id, tags ( id, name, color ))
        `
      )
      .eq('organization_id', org_id)
      .in('tp_tag_links.tag_id', tagIds)

    if (modifier) query = modifier(query)
    const { data, error, count } = await query.returns<TouchPointDetail[]>()
    if (error) throw error

    // Fetch visit counts separately
    if (data && data.length > 0) {
      const enrichedData = await this.enrichWithVisitCounts(data)
      return { data: enrichedData, count }
    }

    return { data, count }
  }

  async findAllByTagIdsWithQrCodeEnabled(
    org_id: string,
    tagIds: string[],
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email, avatar ),
          tp_tag_links!inner(tag_id, tags ( id, name, color ))
        `
      )
      .eq('organization_id', org_id)
      .in('tp_tag_links.tag_id', tagIds)
      .eq('variants_content->QR->enabled', true)

    if (modifier) query = modifier(query)
    const { data, error, count } = await query.returns<TouchPointDetail[]>()
    if (error) throw error

    // Fetch visit counts separately
    if (data && data.length > 0) {
      const enrichedData = await this.enrichWithVisitCounts(data)
      return { data: enrichedData, count }
    }

    return { data, count }
  }

  async deleteById(
    orgId: string,
    tpId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().delete({ count: 'exact' }).eq('id', tpId).eq('organization_id', orgId)
    if (modifier) query = modifier(query)
    const { data, count, error } = await query.select('*').single()
    if (error) throw error
    return { data, count }
  }

  async bulkDeleteByIds(
    orgId: string,
    tpIds: string[],
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().delete({ count: 'exact' }).in('id', tpIds).eq('organization_id', orgId)
    if (modifier) query = modifier(query)
    const { data, error, count } = await query.select('*')
    if (error) throw error
    return { data, count }
  }

  async updateById(
    orgId: string,
    tpId: string,
    data: TablesUpdate<'touch_points'>,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().update(data).eq('id', tpId).eq('organization_id', orgId)
    if (modifier) query = modifier(query)
    const { data: updatedTp, error } = await query.select('id').single()
    if (error) throw error
    return updatedTp
  }

  async updateAndGetById(
    orgId: string,
    tpId: string,
    data: TablesUpdate<'touch_points'>,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().update(data).eq('id', tpId).eq('organization_id', orgId)
    if (modifier) query = modifier(query)
    const { data: updatedTp, error } = await query.select('*').single()
    if (error) throw error
    return updatedTp
  }

  async getNextShortId() {
    const { data: nextShortId, error: nextShortIdError } = await supabaseService.rpc(
      'get_next_touch_point_short_id'
    )
    if (nextShortIdError) {
      throw nextShortIdError
    }
    return nextShortId
  }

  async getNextShortIds(count: number) {
    const { data: nextShortIds, error: nextShortIdsError } = await supabaseService.rpc(
      'get_batch_touch_point_ids',
      { batch_size: count }
    )
    if (nextShortIdsError) {
      throw nextShortIdsError
    }
    return nextShortIds
  }

  async getAllWithCampaignInfo(
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
          id,
          name,
          utm_tags,
          utm_campaign_touchpoints(campaign_id, channel_id),
          content_value
        `
      )
      .eq('organization_id', orgId)
    if (modifier) query = modifier(query)
    const { data, error } = await query.overrideTypes<TouchPointWithCampaign[]>()
    if (error) throw error
    return data
  }

  /**
   * Find all touch-points in a collection
   */
  async findAllByCollection(
    orgId: string,
    collectionId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email, avatar ),
          tp_tag_links(tag_id, tags ( id, name, color ))
        `,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)
      .eq('collection_id', collectionId)

    if (modifier) query = modifier(query)

    const { data, error, count } = await query.returns<TouchPointDetail[]>()
    if (error) throw error

    // Fetch visit counts separately
    if (data && data.length > 0) {
      const enrichedData = await this.enrichWithVisitCounts(data)
      return { data: enrichedData, count }
    }

    return { data, count }
  }

  /**
   * Find all uncategorized touch-points (not in any collection)
   */
  async findAllUncategorized(
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email, avatar ),
          tp_tag_links(tag_id, tags ( id, name, color ))
        `,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)
      .is('collection_id', null)

    if (modifier) query = modifier(query)

    const { data, error, count } = await query.returns<TouchPointDetail[]>()
    if (error) throw error

    // Fetch visit counts separately
    if (data && data.length > 0) {
      const enrichedData = await this.enrichWithVisitCounts(data)
      return { data: enrichedData, count }
    }

    return { data, count }
  }

  /**
   * Update touch-point collection assignment
   */
  async updateCollection(tpId: string, collectionId: string | null) {
    const { data, error } = await this.query()
      .update({ collection_id: collectionId })
      .eq('id', tpId)
      .select('*')
      .single()

    if (error) throw error

    return data
  }

  /**
   * Remove touch-point from collection
   */
  async removeFromCollection(tpId: string) {
    return this.updateCollection(tpId, null)
  }

  /**
   * Bulk update touch-points to assign them to a collection
   */
  async bulkUpdateCollection(tpIds: string[], collectionId: string | null) {
    const { data, error } = await this.query()
      .update({ collection_id: collectionId })
      .in('id', tpIds)
      .select('*')

    if (error) throw error

    return data
  }

  /**
   * Count touch-points in a collection
   */
  async countByCollection(collectionId: string): Promise<number> {
    const { count, error } = await this.query()
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId)

    if (error) throw error

    return count || 0
  }

  /**
   * Count all touch-points in an organization (count-only, no rows fetched).
   */
  async countByOrganization(orgId: string): Promise<number> {
    const { count, error } = await this.query()
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    if (error) throw error

    return count || 0
  }

  /**
   * Đếm touch point theo `content_type`, `head: true` nên không kéo hàng nào về.
   *
   * `modifier` nhận cùng bộ lọc quyền collection mà danh sách dùng. Đếm không lọc quyền thì con số
   * trên header sẽ to hơn số hàng người dùng thật sự thấy được — và đó là rò rỉ thông tin về link
   * của người khác, không chỉ là một con số lệch.
   *
   * `ilike` chứ KHÔNG `eq`: cột này không nhất quán chữ hoa thường trong dữ liệu thật — LiHi có cả
   * `URL` và `url`. Không có ký tự đại diện nào trong `contentType` nên đây vẫn là so khớp đúng
   * bằng, chỉ bỏ phân biệt chữ.
   */
  async countByContentType(
    orgId: string,
    contentType: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ): Promise<number> {
    let query = this.query()
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .ilike('content_type', contentType)

    if (modifier) query = modifier(query)
    const { count, error } = await query
    if (error) throw error

    return count || 0
  }

  /**
   * Enriches touch point data with visit counts
   * This is a workaround for when FK relationship is not available in Supabase types
   */
  async enrichWithVisitCounts(touchPoints: TouchPointDetail[]): Promise<TouchPointDetail[]> {
    const tpIds = touchPoints.map((tp) => tp.id)

    // Query visits table to get counts grouped by tp_id
    const { data: visitCounts, error } = await supabaseService
      .from('visits')
      .select('tp_id')
      .in('tp_id', tpIds)
      .eq('is_bot', false)
      .throwOnError()

    if (error) {
      console.error('Error fetching visit counts:', error)
      return touchPoints
    }

    // Count visits per touch point
    const countsMap = new Map<string, number>()
    visitCounts?.forEach((visit) => {
      if (visit.tp_id) {
        countsMap.set(visit.tp_id, (countsMap.get(visit.tp_id) || 0) + 1)
      }
    })

    // Enrich touch points with visit counts
    return touchPoints.map((tp) => ({
      ...tp,
      visits: [{ count: countsMap.get(tp.id) || 0 }],
    }))
  }

  /**
   * Fetches aggregated conversion stats from customer_profiles for given touch point IDs.
   * Only returns non-merged (canonical) profiles.
   */
  async getConversionSummaryByTpIds(tpIds: string[]): Promise<ConversionSummaryRow[]> {
    const { data, error } = await supabaseService
      .from('conversion_events')
      .select('touch_point_id, event_type, customer_profile_id, amount, currency')
      .in('touch_point_id', tpIds)

    if (error) {
      console.error('Error fetching conversion summary:', error)
      return []
    }

    return data ?? []
  }

  /**
   * AI Agent Platform — link-details read tool, `id` path. `id` is the touchpoint primary key
   * threaded straight from get_top_links' TopLinkEntry.id, so it is an exact org-scoped lookup —
   * no name/short_code guessing involved. `.maybeSingle()` is safe here (id is the PK, so at most
   * one row can ever match); returns null (never throws) on an org-scoped miss, same contract as
   * getBySlugShortCodeOrNameForOrg.
   */
  async getByIdForOrg(orgId: string, id: string): Promise<LinkDetailsRow | null> {
    const columns = LINK_DETAILS_COLUMNS

    const { data, error } = await this.query()
      .select(columns)
      .eq('organization_id', orgId)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<LinkDetailsRow>()
    if (error) throw error

    return data
  }

  /**
   * AI Agent Platform — link-details read tool. `identifier` is whatever segment the caller has
   * (the tool's wire contract calls it `slug`, but most touch-points never get a custom slug — only
   * a `short_code` — and the model sometimes passes the link's `name` instead, so all three columns
   * are checked). Org-scoped: a match in another org never leaks here.
   *
   * Priority order: `slug` (custom, user-set — most intentional) > `short_code` (system-generated,
   * exact) > `name` (non-unique — last resort). A `name` match is only trusted when exactly one row
   * has it; two or more rows sets `ambiguousName` so the caller can 400 instead of guessing.
   */
  async getBySlugShortCodeOrNameForOrg(
    orgId: string,
    identifier: string
  ): Promise<{ row: LinkDetailsRow | null; ambiguousName: boolean }> {
    const columns = LINK_DETAILS_COLUMNS

    // Three separate .eq() queries run in parallel (not a single
    // `.or('slug.eq.X,short_code.eq.X,name.eq.X')` filter string) — `identifier` is user-supplied
    // and a raw PostgREST `.or()` string is filter-injection-prone. Parallel avoids paying three
    // sequential round-trips for the common case (a link with only an auto short_code, no custom
    // slug). The name lookup returns an array (`.limit(2)`, not `.maybeSingle()`) because `name` is
    // not unique — a `.maybeSingle()` there would throw a Postgrest "multiple rows" error (a 500)
    // instead of letting us detect and 400 on ambiguity.
    const [
      { data: bySlug, error: slugError },
      { data: byShortCode, error: shortCodeError },
      { data: byNameRows, error: nameError },
    ] = await Promise.all([
      this.query()
        .select(columns)
        .eq('organization_id', orgId)
        .eq('slug', identifier)
        .maybeSingle()
        .overrideTypes<LinkDetailsRow>(),
      this.query()
        .select(columns)
        .eq('organization_id', orgId)
        .eq('short_code', identifier)
        .maybeSingle()
        .overrideTypes<LinkDetailsRow>(),
      this.query()
        .select(columns)
        .eq('organization_id', orgId)
        .eq('name', identifier)
        .limit(2)
        .overrideTypes<LinkDetailsRow[]>(),
    ])
    if (slugError) throw slugError
    if (shortCodeError) throw shortCodeError
    if (nameError) throw nameError

    // Preserve precedence: slug > short_code > name.
    if (bySlug) return { row: bySlug, ambiguousName: false }
    if (byShortCode) return { row: byShortCode, ambiguousName: false }

    const nameRows = byNameRows ?? []
    if (nameRows.length > 1) return { row: null, ambiguousName: true }
    return { row: nameRows[0] ?? null, ambiguousName: false }
  }

  async findAllByOrgId(
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('*').eq('organization_id', orgId)
    if (modifier) query = modifier(query)
    const { data, error } = await query
    if (error) throw error
    return data
  }
}

export const touchPointRepo =
  process.env.NODE_ENV !== 'production'
    ? new TouchPointRepository()
    : (globalThis._touchPointRepo ?? (globalThis._touchPointRepo = new TouchPointRepository()))
