import { supabaseService } from '@/infrastructure/database/supabase'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ service: 'artifact-view-repository' })

/**
 * [P2] Ai đã mở một artifact ở chế độ Google (spec R9). Hai bảng, một hàm ghi:
 *
 * 1. `customer_profiles` — khách của org, khoá (organization_id, email). SELECT rồi INSERT/UPDATE thay
 *    `upsert`.
 *
 *    ✅ **A21 đã trả lời (đo trên LiHi 2026-10-26)** — index CÓ, và là UNIQUE một phần:
 *    `CREATE UNIQUE INDEX idx_customer_profiles_org_email ON public.customer_profiles
 *     USING btree (organization_id, email) WHERE (email IS NOT NULL)`
 *
 *    Nhưng điều đó ĐỔI HƯỚNG rủi ro so với đánh giá cũ ở đây: vì index là UNIQUE, cửa sổ race hai
 *    request cùng một email **không** sinh hai profile trùng — nó làm INSERT thua **vi phạm unique**.
 *    Và `if (error) throw error` ở dưới ném lỗi đó lên.
 *
 *    Vẫn KHÔNG phải lỗi cho người quét: `artifact-gate.service.ts:158-160` nuốt mọi thất bại của
 *    hàm này, log ERROR rồi trả về, route vẫn đặt cookie và phục vụ. Có test giữ đúng ca đó
 *    (`artifact-gate.service.test.ts:140`, mock reject `'unique?'` → `resolves.toBeUndefined()`).
 *    Hệ quả thật của race: **mất một lượt đếm** `visit_count`, không mất người xem.
 *
 *    Giữ SELECT-rồi-ghi chứ không đổi sang `upsert`: nay đã biết index tồn tại nên `ON CONFLICT`
 *    chạy được, nhưng đổi là một migration-free refactor không ai cần — hành vi hiện tại đúng.
 *    Chỉ ghi `email`, `is_anonymous=false`, `first_touch_point_id` (khi INSERT), `last_visit_at`,
 *    `visit_count`. KHÔNG `name`, KHÔNG `avatar_url` — Google trả nhưng ta không hỏi và không giữ.
 * 2. `artifact_views` — một hàng cho mỗi (artifact, profile); mở lại → `view_count + 1`.
 *
 * `supabaseService` (service role, không cookie) chứ không `createServiceClient()`: đây là đường public,
 * không có session nào để mang theo, và `cookies()` ngoài request scope là một lỗi runtime.
 */
export class ArtifactViewRepository {
  private db = () => supabaseService

  async recordGoogleViewer(input: {
    artifactId: string
    organizationId: string
    touchPointId: string | null
    email: string
  }): Promise<void> {
    const email = input.email.trim().toLowerCase()
    const now = new Date().toISOString()

    const { data: existing, error: findError } = await this.db()
      .from('customer_profiles')
      .select('id, visit_count')
      .eq('organization_id', input.organizationId)
      .eq('email', email)
      .limit(1)
      .maybeSingle()
    if (findError) throw findError

    let profileId: string
    if (existing) {
      profileId = existing.id
      const { error } = await this.db()
        .from('customer_profiles')
        .update({
          is_anonymous: false,
          last_visit_at: now,
          visit_count: Number(existing.visit_count ?? 0) + 1,
        })
        .eq('id', profileId)
      if (error) throw error
    } else {
      const { data, error } = await this.db()
        .from('customer_profiles')
        .insert({
          organization_id: input.organizationId,
          email,
          is_anonymous: false,
          first_touch_point_id: input.touchPointId,
          last_visit_at: now,
          visit_count: 1,
        })
        .select('id')
        .single()
      if (error) throw error
      profileId = data.id
    }

    const { data: view, error: viewFindError } = await this.db()
      .from('artifact_views')
      .select('id, view_count')
      .eq('artifact_id', input.artifactId)
      .eq('customer_profile_id', profileId)
      .maybeSingle()
    if (viewFindError) throw viewFindError

    if (view) {
      const { error } = await this.db()
        .from('artifact_views')
        .update({ last_viewed_at: now, view_count: Number(view.view_count ?? 0) + 1 })
        .eq('id', view.id)
      if (error) throw error
      return
    }

    const { error: insertError } = await this.db().from('artifact_views').insert({
      artifact_id: input.artifactId,
      customer_profile_id: profileId,
      organization_id: input.organizationId,
      first_viewed_at: now,
      last_viewed_at: now,
      view_count: 1,
    })
    // Hai lần mở đầu tiên của cùng một người chạy song song: UNIQUE (artifact, profile) chặn hàng
    // thứ hai. Đó là bảng làm đúng việc, không phải lỗi — hàng đầu đã ghi "1 người đã mở".
    if (insertError && insertError.code === '23505') {
      log.warn({ artifactId: input.artifactId }, 'artifact_views insert raced an identical row')
      return
    }
    if (insertError) throw insertError
  }

  /** `{n} người đã mở` — số HÀNG, tức số người, không phải tổng `view_count`. */
  async countViewersByArtifact(artifactId: string): Promise<number> {
    const { count, error } = await this.db()
      .from('artifact_views')
      .select('id', { count: 'exact', head: true })
      .eq('artifact_id', artifactId)
    if (error) throw error
    return count ?? 0
  }
}

export const artifactViewRepo = new ArtifactViewRepository()
