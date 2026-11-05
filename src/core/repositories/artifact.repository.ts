import { BaseRepository } from '@/core/repositories/base.repository'
import { Tables } from '@/shared/types/database.types'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ service: 'artifact-repository' })

/**
 * `short_url` / `path_qr_code` live on the linked touch point, and every read of an artifact needs
 * them for the DTO — so they are embedded here rather than fetched in a second round trip.
 *
 * `slug` is NOT in the DTO and is not meant to be: it is read so `changeSlug` can tell "the user
 * typed the slug it already has" from a real rename WITHOUT a second round trip to the touch point
 * service — the no-op branch that keeps a redundant rename from minting a `slugs` row and
 * regenerating a QR image for nothing (wave 4 B2, step 4).
 *
 * `qr_customize_options` is read for the same caller and for a sharper reason: the QR branch of
 * `updateAndReturn` re-renders the image FROM whatever options it is handed, so calling it without
 * them means "re-render with the defaults" — the colours, logo and dot style the user set in the
 * short-link UI would be wiped, silently, because they renamed a link.
 */
const ARTIFACT_SELECT =
  '*, touch_points(slug, short_url, path_qr_code, qr_customize_options), organizations(org_slug)'

/**
 * PostgREST hands back at most 1000 rows per request whatever we ask for. Stated explicitly so the
 * cap is a number in this file rather than a default somewhere else, and so the sum below can tell
 * "all of them" from "as many as it will give me".
 */
const QUOTA_ROW_SCAN_LIMIT = 1000

/** Trần số id slug gộp vào mệnh đề `in.(...)` — xem `touchPointIdsMatchingSlug`. */
const SLUG_SEARCH_ID_LIMIT = 200

export type ListByOrgArgs = {
  page: number
  limit: number
  /** Khớp tên artifact HOẶC đường dẫn (slug của touch point). */
  search?: string
  /** ISO. Lọc theo `created_at`. */
  fromDate?: string
  toDate?: string
  /** `draft` / `live` — tombstone (`removed`) luôn bị loại bất kể giá trị này. */
  status?: string[]
}

/**
 * What `createIfWithinQuota` inserts. `id` is required rather than the optional `TablesInsert` one
 * because the service generates it before the upload — `storage_path` is built from it — so a
 * function that cannot name the row it is creating would be the wrong shape. `status` is absent on
 * purpose: the function sets `'draft'` itself, and a caller able to pass it could insert a row
 * straight to `live` and skip the publish quota entirely.
 */
export type NewArtifactRow = {
  id: string
  organization_id: string
  user_id: string
  name: string
  kind: string
  serve_token: string
  storage_path: string
  content_type: string
  size_bytes: number
}

export class ArtifactRepository extends BaseRepository<'artifacts'> {
  constructor() {
    super('artifacts')
  }

  async findByServeToken(token: string) {
    const { data, error } = await this.query()
      .select(ARTIFACT_SELECT)
      .eq('serve_token', token)
      .maybeSingle()
    if (error) throw error
    return data
  }

  /**
   * Phân giải địa chỉ công khai `<org_slug>/<slug>` → hàng artifact. Đi qua bảng `slugs` (lịch sử
   * đuôi link của short link) nên slug CŨ sau khi đổi vẫn mở được, đúng như li2-be. `org_slug` phải
   * khớp tổ chức chủ: hai org có thể từng dùng cùng slug ở hai domain khác nhau.
   */
  async findByOrgSlugAndSlug(orgSlug: string, slug: string) {
    const supa = this.getSupaInstance()
    const { data: org, error: orgError } = await supa
      .from('organizations')
      .select('id')
      .eq('org_slug', orgSlug)
      .maybeSingle()
    if (orgError) throw orgError
    if (!org) return null

    const { data: slugRows, error: slugError } = await supa
      .from('slugs')
      .select('tp_id')
      .eq('slug', slug)
      .eq('organization_id', org.id)
      .limit(5)
    if (slugError) throw slugError
    const tpIds = (slugRows ?? []).map((r) => r.tp_id).filter((v): v is string => !!v)
    if (tpIds.length === 0) return null

    const { data, error } = await this.query()
      .select(ARTIFACT_SELECT)
      .eq('organization_id', org.id)
      .in('touch_point_id', tpIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  }

  /**
   * `touch_point_id` của những artifact đang ở một trong các trạng thái cho trước.
   *
   * Dùng cho ô lọc "Đang phục vụ" của danh sách gộp — ô duy nhất bắc qua cả hai loại. PostgREST
   * KHÔNG biểu diễn được `OR` giữa bảng cha và bảng nhúng (đã thử hai cú pháp trên DB thật, cả
   * hai hỏng), nên phần artifact phải lấy ra trước rồi đưa vào `id.in.(…)`.
   *
   * ⚠ An toàn theo cấu tạo, không phải nhờ may: số artifact `live` của một tổ chức bị chặn trần
   * bởi `ARTIFACT_QUOTA_FREE_LIVE` (50) ngay ở `publish()`. Danh sách id vì thế không phình theo
   * thời gian. **Đừng gọi hàm này với `removed`** — trạng thái đó không có trần và đã là 35 hàng
   * trên LiHi; ô "Đã gỡ" lọc bằng inner join, không qua đây.
   */
  async findTouchPointIdsByStatus(orgId: string, statuses: string[]) {
    const { data, error } = await this.query()
      .select('touch_point_id')
      .eq('organization_id', orgId)
      .in('status', statuses)
      .not('touch_point_id', 'is', null)
    if (error) throw error
    return (data ?? []).map((row) => row.touch_point_id).filter(Boolean) as string[]
  }

  async findByIdForOrg(orgId: string, id: string) {
    const { data, error } = await this.query()
      .select(ARTIFACT_SELECT)
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  /**
   * How many artifacts of this org are `live` — the axis `publish()` enforces.
   *
   * `head: true` with `count: 'exact'` sends no rows at all: this is a number, and fetching the rows
   * to length them is how `enrichWithVisitCounts` came to pull an entire table into Node. The
   * `(organization_id, status)` index added in `20260930000002_artifacts__quota_index.sql` serves
   * exactly this filter; the older `(organization_id, created_at DESC)` index cannot.
   */
  async countLiveByOrg(orgId: string) {
    const { count, error } = await this.query()
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'live')
    if (error) throw error
    return count ?? 0
  }

  /**
   * The WRITE side of the live-count axis: claim a slot and set the link, in one Postgres function
   * holding a per-org advisory lock. Returns null when the org is already at `limit`.
   *
   * `countLiveByOrg` above is not replaced by this — it stays as the cheap path, because it refuses
   * BEFORE a touch point is minted. Only a publish that slips past it pays for the compensating
   * delete a refusal here requires.
   */
  async publishIfWithinQuota(
    orgId: string,
    artifactId: string,
    touchPointId: string,
    limit: number
  ): Promise<Tables<'artifacts'> | null> {
    const { data, error } = await this.getSupaInstance().rpc('artifact_publish_if_within_quota', {
      p_org_id: orgId,
      p_artifact_id: artifactId,
      p_touch_point_id: touchPointId,
      p_limit: limit,
    })
    if (error) throw error
    return data?.[0] ?? null
  }

  /**
   * Total bytes this org is storing — every status but one, not just `live`: a draft occupies the
   * bucket just as much as a published one, and quota is about storage, not about visibility.
   *
   * THE ONE EXCEPTION IS `removed`, and it is not a special case — it is the same rule. A tombstone
   * row keeps its `size_bytes` (knowing how heavy it once was stays useful) but its object is gone
   * from the bucket, so counting it would charge the org for storage nobody is using. And it would
   * take the Delete button's whole purpose with it: a user removes content precisely to get the room
   * back, so a tombstone that still eats quota means removing frees nothing.
   *
   * The exclusion is done in the QUERY, never by writing `size_bytes = 0`. The other half of this
   * axis — `artifact_create_if_within_quota` — carries the same `<> 'removed'` filter, and the two
   * must stay in step: if one counts tombstones and the other does not, the cheap pre-check passes
   * and the atomic write refuses AFTER the bytes are already in the bucket.
   *
   * Summed in Node over ONE column. PostgREST aggregate functions are off by default on this
   * deployment, and adding an RPC for a sum would be a migration and a new database object to keep
   * for no measurable gain. This is deliberately not the `visits` mistake: that one pulled an
   * unbounded fact table; this reads one bigint per artifact of one organization.
   *
   * The scan IS capped, and that cap is a real limit on this sum: a truncated list sums LOW, and a
   * quota that reads low opens instead of closing. Today the cap is out of reach — 30MB total
   * across at most a few hundred files — but it is the quota itself that keeps it out of reach, so
   * hitting the cap is logged rather than left to be discovered as an over-quota org.
   */
  async sumSizeBytesByOrg(orgId: string) {
    const { data, error } = await this.query()
      .select('size_bytes')
      .eq('organization_id', orgId)
      .neq('status', 'removed')
      .limit(QUOTA_ROW_SCAN_LIMIT)
      .returns<{ size_bytes: number | null }[]>()
    if (error) throw error

    const rows = data ?? []
    if (rows.length === QUOTA_ROW_SCAN_LIMIT)
      log.warn(
        { orgId, rowLimit: QUOTA_ROW_SCAN_LIMIT },
        'artifact byte quota summed over a capped row scan — the total is a lower bound'
      )

    return rows.reduce((total, row) => total + Number(row.size_bytes ?? 0), 0)
  }

  /**
   * The WRITE side of the byte axis: insert the row only if the org's stored total plus this file
   * still fits, in one Postgres function holding a per-org advisory lock. Returns null when it does
   * not fit.
   *
   * The service checks the same quota before `storage.put`, and that pre-check stays — it refuses
   * before 10MB is uploaded. This one exists because that check cannot be raced and the pre-check
   * can. A refusal here means the object is already in the bucket, so the caller removes it.
   */
  async createIfWithinQuota(
    row: NewArtifactRow,
    quotaBytes: number
  ): Promise<Tables<'artifacts'> | null> {
    const { data, error } = await this.getSupaInstance().rpc('artifact_create_if_within_quota', {
      p_id: row.id,
      p_org_id: row.organization_id,
      p_user_id: row.user_id,
      p_name: row.name,
      p_kind: row.kind,
      p_serve_token: row.serve_token,
      p_storage_path: row.storage_path,
      p_content_type: row.content_type,
      p_size_bytes: row.size_bytes,
      p_quota_bytes: quotaBytes,
    })
    if (error) throw error
    return data?.[0] ?? null
  }

  /**
   * The WRITE side of REPLACING content: point the row at a new object, in one Postgres function
   * holding the same per-org advisory lock as `createIfWithinQuota` / `publishIfWithinQuota`. Quota
   * is checked as a DELTA (used − old size + new size), because the old object is about to leave the
   * bucket and charging the full new size would refuse a 3MB → 7MB swap for 7MB instead of 4MB.
   *
   * Returns the row AS IT WAS BEFORE the update, or null when refused. The old row is what the
   * caller needs: its `storage_path` is the object to delete, and its `size_bytes` is
   * `previous_size_bytes` in the response. Reading it under the lock is also what makes two
   * concurrent replaces safe — each deletes the path the row held when IT took over, not the one
   * it saw before the race (see the migration for the orphan this prevents).
   *
   * A null does not say why: the function refuses for a missing row, a status outside
   * `live`/`draft`, and a quota miss alike. The service re-reads the row to tell them apart.
   */
  async replaceIfWithinQuota(
    orgId: string,
    artifactId: string,
    next: { kind: string; storage_path: string; content_type: string; size_bytes: number },
    quotaBytes: number
  ): Promise<Tables<'artifacts'> | null> {
    const { data, error } = await this.getSupaInstance().rpc('artifact_replace_if_within_quota', {
      p_org_id: orgId,
      p_artifact_id: artifactId,
      p_kind: next.kind,
      p_storage_path: next.storage_path,
      p_content_type: next.content_type,
      p_size_bytes: next.size_bytes,
      p_quota_bytes: quotaBytes,
    })
    if (error) throw error
    return data?.[0] ?? null
  }

  /**
   * Quyền xem (spec R2a): MỘT UPDATE đổi cả bốn cột, với `access_version` tăng 1.
   *
   * PostgREST không viết được `access_version = access_version + 1`, và một RPC mới là một hàm SQL
   * mới cho một phép cộng. Thay vào đó: optimistic concurrency — caller đưa version nó vừa đọc, UPDATE
   * lọc `access_version = expected` và ghi `expected + 1`. Hai PATCH song song thì một cái thấy
   * `count = 0` và service bảo thử lại; không cái nào ghi đè lên cái kia với cùng một version (điều
   * sẽ để một cookie phiên cũ tiếp tục hợp lệ).
   *
   * `organization_id` trong filter là lớp giữ cho một id của org khác không đụng được hàng, kể cả khi
   * caller quên kiểm — cùng lý do với `markRemovedForOrg`. Trả hàng mới (kèm touch point) để DTO không
   * cần một lần đọc nữa.
   */
  async updateAccessForOrg(
    orgId: string,
    id: string,
    expectedVersion: number,
    next: { access_mode: string; password_hash: string | null; password_set_at: string | null }
  ) {
    const { data, error } = await this.query()
      .update({ ...next, access_version: expectedVersion + 1 })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('access_version', expectedVersion)
      .select(ARTIFACT_SELECT)
      .maybeSingle()
    if (error) throw error
    return data
  }

  /**
   * Tombstones are NOT in this list, and `count` excludes them too — the filter is on the same query
   * as the count, so the pagination total cannot disagree with the rows.
   *
   * A row the user has already removed is not a thing they want to keep seeing in their own list. The
   * tombstone exists for whoever scans a printed QR afterwards, not as an entry in the management
   * UI — which is also why `getForOrg` refuses one.
   */
  async listByOrg(orgId: string, { page, limit, search, fromDate, toDate, status }: ListByOrgArgs) {
    const from = (page - 1) * limit
    let q = this.query()
      .select(ARTIFACT_SELECT, { count: 'exact' })
      .eq('organization_id', orgId)
      .neq('status', 'removed')

    if (status?.length) q = q.in('status', status)

    // Khoảng ngày đi cùng query đếm, nên tổng phân trang không thể lệch với số hàng trả về.
    if (fromDate) q = q.gte('created_at', fromDate)
    if (toDate) q = q.lte('created_at', toDate)

    if (search) {
      // Ô tìm kiếm nói "tên hoặc đường dẫn", mà đường dẫn là `touch_points.slug` — bảng khác.
      // PostgREST không `or()` ngang hai bảng nếu không ép inner join, và inner join sẽ ném hết
      // bản nháp đi (nháp chưa có `touch_point_id`). Nên tra slug trước, lấy id, rồi gộp vào `or`.
      const ids = await this.touchPointIdsMatchingSlug(orgId, search)
      const escaped = search.replace(/[%,()]/g, '')
      q = q.or(
        ids.length > 0
          ? `name.ilike.%${escaped}%,touch_point_id.in.(${ids.join(',')})`
          : `name.ilike.%${escaped}%`
      )
    }

    const { data, error, count } = await q
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)
    if (error) throw error
    return { data: data ?? [], count: count ?? 0 }
  }

  /**
   * Giới hạn cứng: một người gõ hai ký tự có thể khớp hàng nghìn slug, và nhồi tất cả vào mệnh đề
   * `in.(...)` thì sinh ra một URL PostgREST dài tới mức bị từ chối. Cắt ở đây để ô tìm kiếm hỏng
   * theo kiểu "thiếu vài kết quả hiếm" thay vì "cả trang trả lỗi".
   */
  private async touchPointIdsMatchingSlug(orgId: string, search: string) {
    const escaped = search.replace(/[%,()]/g, '')
    if (!escaped) return []
    const { data, error } = await this.getSupaInstance()
      .from('touch_points')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('slug', `%${escaped}%`)
      .limit(SLUG_SEARCH_ID_LIMIT)
    if (error) throw error
    return (data ?? []).map((row) => row.id)
  }

  /**
   * The tombstone: set `status = 'removed'` and KEEP the row.
   *
   * There is deliberately NO hard-delete method on this repository any more. One that nobody calls
   * would be a trap in this file: the next person needing to "delete an artifact" would call it and
   * quietly undo the model this wave builds — the row is what lets `/a/<token>` answer 410 instead of
   * 404, so removing it takes the explanation away from whoever scans a printed QR.
   *
   * The `organization_id` filter is not belt-and-braces on top of the caller's check — it is the
   * filter that makes a wrong id from one org unable to touch a row in another, even if a future
   * caller forgets to look the row up first. Returns the count so the caller can tell "removed" from
   * "no such row", which are different answers to the same request.
   *
   * `size_bytes` is KEPT — knowing how heavy it once was stays useful, and the exclusion from quota
   * is done in `sumSizeBytesByOrg`, not by zeroing the column.
   *
   * `touch_point_id` is KEPT — it is the only thread tying the tombstone to the short link that goes
   * on living. Clearing it would manufacture exactly the "orphan short link nobody can trace back"
   * that `publish()` has a compensating delete to avoid.
   */
  async markRemovedForOrg(orgId: string, id: string) {
    const { error, count } = await this.query()
      .update({ status: 'removed' }, { count: 'exact' })
      .eq('id', id)
      .eq('organization_id', orgId)
    if (error) throw error
    return count ?? 0
  }

  /**
   * Xoá CỨNG một nháp — bước bù của `createAndPublish` khi publish ném sau khi nháp đã có hàng.
   *
   * Điều kiện `status = 'draft' AND touch_point_id IS NULL` nằm trong chính câu lệnh, không chỉ ở
   * caller: một hàng đã từng `live` (có touch point, có QR in ra) không bao giờ được xoá bằng đường
   * này dù caller nhầm — nó phải đi `markRemovedForOrg` để `/a/<token>` còn trả 410. Lọc theo org
   * như mọi hàm khác. Trả count để caller biết có xoá được gì không.
   */
  /**
   * Lượt quét KHÔNG-bot theo touch point, cho cả một trang danh sách trong MỘT lần gọi (wave 4 S1).
   *
   * Đây chính là chỗ không được lặp lại "the visits mistake": `enrichWithVisitCounts` của touch
   * point kéo nguyên hàng `visits` về Node rồi đếm bằng `length`, và `visits` là bảng fact không có
   * giới hạn. Phép đếm ở đây nằm trong Postgres (`artifact_visit_counts`) và chỉ bigint đi qua dây.
   *
   * Mảng rỗng KHÔNG gọi DB: một trang chỉ có nháp thì không có gì để đếm, và `tp_id = ANY('{}')`
   * vẫn là một round trip để nhận về không hàng nào. Trả `Map` vì caller tra theo `touch_point_id`
   * của từng hàng; tp vắng mặt trong kết quả nghĩa là 0, và caller đọc thiếu key thành 0 — không ép
   * hàm trả một hàng 0 cho mỗi id.
   *
   * Lỗi được NÉM ra, không nuốt ở đây: service là nơi quyết định "con số phụ hỏng thì hiện 0", và
   * một repository im lặng sẽ khiến `0` thật và `0` vì hỏng không phân biệt được ở bất cứ đâu.
   */
  async countVisitsByTouchPoints(tpIds: string[]): Promise<Map<string, number>> {
    if (tpIds.length === 0) return new Map()

    const { data, error } = await this.getSupaInstance().rpc('artifact_visit_counts', {
      p_tp_ids: tpIds,
    })
    if (error) throw error

    return new Map((data ?? []).map((row) => [row.tp_id, Number(row.visits ?? 0)]))
  }

  /**
   * Đẩy `updated_at` lên `now()` — dùng sau khi đổi slug (wave 4 B2, bước 6).
   *
   * Vì sao cần: ảnh QR sinh lại có thể ghi vào CÙNG `path_qr_code`, nên URL ảnh không đổi và mọi
   * cache (browser, CDN) vẫn trả ảnh cũ. FE cache-bust bằng `updated_at`, nên cột đó phải nhích —
   * không trigger nào làm việc này, và bảng vừa bị sửa là `touch_points`, không phải `artifacts`.
   *
   * Lọc theo CẢ `id` và `organization_id` như `markRemovedForOrg`: phòng tuyến thứ hai cho một
   * caller tương lai quên tra hàng trước. Trả count để caller biết có khớp hàng nào không.
   */
  async touchUpdatedAtForOrg(orgId: string, id: string) {
    const { error, count } = await this.query()
      .update({ updated_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', id)
      .eq('organization_id', orgId)
    if (error) throw error
    return count ?? 0
  }

  async deleteDraftById(orgId: string, id: string) {
    const { error, count } = await this.query()
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('status', 'draft')
      .is('touch_point_id', null)
    if (error) throw error
    return count ?? 0
  }
}

export const artifactRepo = new ArtifactRepository()
