import type { TouchPointArtifactMeta } from '../types/touch-point.type'

/**
 * `content_type` của dữ liệu thật KHÔNG nhất quán chữ hoa thường — LiHi có cả `URL` và `url`
 * (org smoketest). So khớp phân biệt chữ sẽ pass trên org test rồi nổ ở org khác.
 *
 * Nằm ở core vì cả service (lọc) lẫn giao diện (ô loại) đều cần cùng một định nghĩa; hai bản sao
 * sẽ lệch nhau đúng vào lần thêm giá trị tiếp theo.
 */
export function isArtifactContentType(contentType?: string | null) {
  return contentType?.toUpperCase() === 'ARTIFACT'
}

/**
 * MỘT danh sách trạng thái cho cả hai loại — nhưng hai loại ghi trạng thái ở hai chỗ khác hẳn:
 *
 * | | cột | giá trị |
 * |---|---|---|
 * | artifact | `artifacts.status` | 7 giá trị |
 * | link | `touch_points.enabled` (boolean) + `safety_status` (text) | bật/tắt, `flagged` |
 *
 * `touch_points` **không có** cột `status`.
 *
 * ⚠ `disabled` và `removed` CỐ Ý là hai ô khác nhau, không gộp: link đã tắt thì chủ sở hữu bật lại
 * được, artifact đã gỡ thì nội dung đã mất khỏi kho. Trộn hai thứ đó là nói sai với đúng người
 * đang tìm xem mình gỡ nhầm cái gì.
 */
export const MERGED_STATUSES = [
  'live',
  'disabled',
  'flagged',
  'pending',
  'blocked',
  'expired',
  'removed',
] as const

export type MergedStatus = (typeof MERGED_STATUSES)[number]

/**
 * Giá trị quy ước cho mục "Domain hệ thống" trong ô lọc Domain → `domain_id IS NULL`.
 *
 * Ở đây chứ không ở service vì menu lọc là component client: import thẳng từ
 * `touch-point.service` sẽ kéo cả service (server-only) vào bundle trình duyệt.
 */
export const NO_CUSTOM_DOMAIN = '__no_custom_domain__'

/** Trạng thái artifact nào rơi vào ô nào. Ô nào không có ở đây là ô của link. */
export const ARTIFACT_STATUS_BY_BUCKET: Partial<Record<MergedStatus, string[]>> = {
  live: ['live'],
  pending: ['draft', 'scanning'],
  blocked: ['blocked', 'quarantined'],
  expired: ['expired'],
  removed: ['removed'],
}

/**
 * Phân loại MỘT hàng vào ĐÚNG MỘT ô.
 *
 * Thứ tự xét là một phần của định nghĩa, không phải tuỳ tiện:
 *
 * 1. Artifact xét theo `artifacts.status` và **chỉ** theo đó. `touch_points.enabled` của hàng
 *    artifact không nói gì về nội dung — trên LiHi cả 35 hàng artifact đã gỡ vẫn `enabled = true`.
 * 2. Artifact mất metadata (FK `ON DELETE SET NULL`) hoặc mang status lạ → `pending`, **không** rơi
 *    về `live`. Đoán một hàng ta không hiểu là "đang phục vụ" là đoán theo hướng trấn an.
 * 3. Link: `flagged` thắng `disabled`. Một link vừa bị gắn cờ vừa bị tắt thì điều đáng nói là
 *    **bị gắn cờ** — cái kia chỉ là hệ quả.
 *
 * Bất biến mà hàm này phải giữ, và test khoá lại: mọi hàng rơi vào đúng một ô, nên **tổng các ô
 * bằng tổng danh sách**. Không hàng nào lọt khe.
 */
export function getMergedStatus(row: {
  content_type?: string | null
  enabled?: boolean | null
  safety_status?: string | null
  artifact?: TouchPointArtifactMeta | null
}): MergedStatus {
  if (isArtifactContentType(row.content_type)) {
    const status = row.artifact?.status
    const bucket = MERGED_STATUSES.find((key) =>
      ARTIFACT_STATUS_BY_BUCKET[key]?.includes(status ?? '')
    )
    return bucket ?? 'pending'
  }

  if (row.safety_status === 'flagged') return 'flagged'
  if (row.enabled !== true) return 'disabled'
  return 'live'
}
