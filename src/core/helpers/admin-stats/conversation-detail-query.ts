import type { GetConversationMessagesParams } from '@/core/services/admin-conversation-detail.service'

/**
 * Đọc tham số truy vấn của `/api/admin/agent-conversations/[session_id]/messages`.
 *
 * Cùng nguyên tắc với `conversation-query.ts`: gõ sai thì **lùi về mặc định**, không trả 400.
 */

/**
 * Mặc định cao (100) chứ không 20 như trang danh sách: người ta mở một hội thoại để **đọc nó**, và
 * một hội thoại bị cắt ở tin thứ 20 là một hội thoại chưa đọc được. LiHi hiện trung bình 4.5
 * tin/phiên, nên thực tế mọi phiên về trong một lượt và giao diện không cần phân trang hôm nay.
 */
export const DEFAULT_LIMIT = 100

/**
 * Nhưng vẫn có trần, vì số tin mỗi phiên **không có giới hạn trên**: `appendMessage` cứ ghi thêm,
 * còn `getHistory` chỉ cắt 60 tin lúc *gọi model* chứ không cắt lúc lưu. Một phiên chạy nhiều ngày
 * sẽ phình, và một endpoint không trần thì ngày đó trả về cả chục nghìn hàng trong một response.
 */
export const MAX_LIMIT = 500

/**
 * ⚠ Phải loại `null`/chuỗi rỗng TRƯỚC khi `Number()`: `Number(null)` và `Number('')` đều ra **0**,
 * mà `0` là số nguyên hợp lệ — nên thiếu nhánh này thì "không truyền tham số" bị đọc thành
 * "truyền 0", rồi `Math.max(1, 0)` biến `limit` mặc định thành 1 tin mỗi trang.
 *
 * Trùng với `toInt` của `conversation-query.ts`. Giữ bản sao 5 dòng ở đây thay vì xuất khẩu hàm đó
 * ra: trang danh sách đã chốt và đã nghiệm thu, và sửa file của nó để tiết kiệm 5 dòng là đổi một
 * rủi ro hồi quy thật lấy một cái gọn không ai thấy.
 */
const toInt = (raw: string | null, fallback: number) => {
  if (raw === null || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) ? n : fallback
}

export const parseConversationDetailQuery = (q: URLSearchParams): GetConversationMessagesParams => {
  const page = Math.max(1, toInt(q.get('page'), 1))
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(q.get('limit'), DEFAULT_LIMIT)))
  return { page, limit }
}
