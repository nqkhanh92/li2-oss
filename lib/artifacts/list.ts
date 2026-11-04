import 'server-only'
import { query } from '@/lib/db'

/**
 * Đọc danh sách artifact cho trang `/artifacts`.
 *
 * Tách khỏi `app/api/artifacts/route.ts` (chỉ có `POST`) vì đây là đường ĐỌC của UI: nó không
 * cần transaction, không cần ghi tệp, và được gọi từ Server Component nên không đi qua HTTP.
 */

export type ArtifactStatus = 'draft' | 'live' | 'removed'

export type ArtifactListItem = {
  id: string
  /**
   * `null` khi hàng `links` đã bị xoá — `artifacts.link_id` là `ON DELETE SET NULL` (xem
   * `db/schema.sql`). Artifact lúc đó còn nội dung nhưng không còn địa chỉ công khai, nên UI
   * phải chịu được giá trị này thay vì giả định luôn có slug.
   */
  slug: string | null
  title: string | null
  original_name: string
  mime_type: string
  size_bytes: number
  status: ArtifactStatus
  visit_count: number
  created_at: string
}

export async function listArtifacts({
  limit = 100,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<ArtifactListItem[]> {
  // Hai lần LEFT JOIN, không INNER:
  //  - `links` có thể đã bị xoá (xem comment ở `slug` bên trên);
  //  - `link_stats` chỉ có hàng SAU lượt truy cập đầu tiên (`record_visit` ở schema.sql), nên
  //    INNER JOIN sẽ làm mọi artifact chưa ai mở biến mất khỏi danh sách.
  //
  // Hai phép cast không phải để làm đẹp: `pg` trả `bigint` thành **CHUỖI** (bigint không lọt vào
  // `Number.MAX_SAFE_INTEGER` một cách an toàn nên driver không tự chuyển). Không cast thì
  // `visit_count` là `"12"` và mọi phép cộng trong UI thành nối chuỗi, còn `size_bytes` là `"2048"`
  // và phép chia khi định dạng KB/MB cho `NaN`.
  //
  // `visit_count` cast `::int` (int4 tới ~2,1 tỷ lượt là đủ). `size_bytes` cast `::float8` chứ
  // KHÔNG `::int`: `MAX_UPLOAD_BYTES` do người vận hành đặt, và nếu ai đặt trên 2 GiB thì `::int`
  // tràn và làm **cả trang danh sách** trả 500. `float8` biểu diễn chính xác mọi số nguyên dưới
  // 2^53 byte (9 PB), và `pg` trả nó về một `number` thật.
  return query<ArtifactListItem>(
    `SELECT a.id,
            l.slug,
            l.title,
            a.original_name,
            a.mime_type,
            a.size_bytes::float8      AS size_bytes,
            a.status,
            COALESCE(s.visit_count, 0)::int AS visit_count,
            a.created_at
       FROM artifacts a
       LEFT JOIN links l      ON l.id = a.link_id
       LEFT JOIN link_stats s ON s.link_id = a.link_id
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
}
