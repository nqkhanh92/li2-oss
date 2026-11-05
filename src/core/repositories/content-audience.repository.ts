import { supabaseService } from '@/infrastructure/database/supabase'

/**
 * Đọc thô cho câu hỏi "ai đã xem nội dung của tôi".
 *
 * Hai nguồn, KHÔNG nối được với nhau:
 * - `customer_profiles` + `artifact_views`: người mở artifact ở chế độ Google → có email.
 * - `visits` nhóm theo `fp`: thiết bị quét QR / bấm link → chỉ có dấu vết thiết bị.
 *
 * `artifact_views` không giữ `fp` và `visits` không giữ `customer_profile_id`, nên một người vừa
 * đăng nhập Google vừa quét QR sẽ xuất hiện hai lần. Đó là giới hạn của dữ liệu, không phải thứ
 * tầng này được phép đoán.
 *
 * Không `GROUP BY` ở đây: gộp theo `fp` cần một RPC mới, mà vòng này không được tạo migration.
 * Nên repository trả hàng thô có giới hạn và service gộp trong bộ nhớ — xem `VISIT_SCAN_LIMIT`.
 *
 * `supabaseService` (service role) bỏ qua RLS, nên MỌI truy vấn ở đây phải tự lọc
 * `organization_id`. Thiếu một chỗ là rò dữ liệu sang tổ chức khác.
 */
export class ContentAudienceRepository {
  private db = () => supabaseService

  async findProfiles(orgId: string, limit: number) {
    const { data, error } = await this.db()
      .from('customer_profiles')
      .select(
        `id, email, name, external_id, created_at, last_visit_at, visit_count, is_anonymous,
         first_touch_point_id,
         touch_points!customer_profiles_first_tp_fkey(id, name, short_url)`
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  }

  async findProfileById(orgId: string, profileId: string) {
    const { data, error } = await this.db()
      .from('customer_profiles')
      .select('id, email, name')
      .eq('organization_id', orgId)
      .eq('id', profileId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findArtifactViews(orgId: string) {
    const { data, error } = await this.db()
      .from('artifact_views')
      .select('artifact_id, customer_profile_id, view_count, first_viewed_at, last_viewed_at')
      .eq('organization_id', orgId)
    if (error) throw error
    return data ?? []
  }

  async findArtifactViewsByProfile(orgId: string, profileId: string) {
    const { data, error } = await this.db()
      .from('artifact_views')
      .select(
        `artifact_id, view_count, first_viewed_at, last_viewed_at,
         artifacts(id, name, kind, serve_token, status)`
      )
      .eq('organization_id', orgId)
      .eq('customer_profile_id', profileId)
      .order('last_viewed_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  /** `is_bot = false`: bot không phải người xem, và chúng chiếm phần lớn `visits` trên prod. */
  async findVisits(orgId: string, limit: number) {
    const { data, error } = await this.db()
      .from('visits')
      .select('id, fp, created_at, tp_id, country, city, os, platform, type, referrer')
      .eq('organization_id', orgId)
      .eq('is_bot', false)
      .not('fp', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  }

  async findVisitsByFp(orgId: string, fp: string, limit: number) {
    const { data, error } = await this.db()
      .from('visits')
      .select(
        'id, fp, created_at, tp_id, country, city, region, os, platform, type, referrer, raw_referrer, utm_tags'
      )
      .eq('organization_id', orgId)
      .eq('is_bot', false)
      .eq('fp', fp)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  }

  /** `touch_point_id` của artifact là cầu duy nhất nối một lượt `visits` với nội dung đã mở. */
  async findArtifactsByTouchPoints(orgId: string, touchPointIds: string[]) {
    if (touchPointIds.length === 0) return []
    const { data, error } = await this.db()
      .from('artifacts')
      .select('id, name, kind, serve_token, status, touch_point_id')
      .eq('organization_id', orgId)
      .in('touch_point_id', touchPointIds)
    if (error) throw error
    return data ?? []
  }

  async findTouchPointsByIds(orgId: string, touchPointIds: string[]) {
    if (touchPointIds.length === 0) return []
    const { data, error } = await this.db()
      .from('touch_points')
      .select('id, name, short_url')
      .eq('organization_id', orgId)
      .in('id', touchPointIds)
    if (error) throw error
    return data ?? []
  }
}

export const contentAudienceRepo = new ContentAudienceRepository()
