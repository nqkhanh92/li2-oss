import {
  CONVERSATION_SORT_FIELDS,
  type ConversationSortField,
  type ListConversationsParams,
} from '@/core/services/admin-conversations.service'
import { parseDateOnly, resolveDateRange } from './date-series'

/**
 * Đọc tham số truy vấn của `/api/admin/agent-conversations`.
 *
 * Giữ nguyên nguyên tắc của `artifact-query.ts`: tham số gõ sai thì **lùi về mặc định**, không trả
 * 400 — một trang admin không nên trắng vì ai đó gõ `limit=abc`. Và không có ngày thì **không lọc
 * ngày**, chứ không âm thầm cắt về 30 ngày gần nhất: đây là một *danh sách*, tự ẩn bớt hàng thì
 * người đọc đếm thiếu mà không biết.
 */

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

/**
 * ⚠ Phải loại `null`/chuỗi rỗng TRƯỚC khi `Number()`: `Number(null)` và `Number('')` đều ra **0**,
 * mà `0` là số nguyên hợp lệ — nên thiếu nhánh này thì "không truyền tham số" bị đọc thành
 * "truyền 0", rồi `Math.max(1, 0)` biến `limit` mặc định thành 1 hàng mỗi trang.
 */
const toInt = (raw: string | null, fallback: number) => {
  if (raw === null || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) ? n : fallback
}

const isSortField = (v: string): v is ConversationSortField =>
  (CONVERSATION_SORT_FIELDS as readonly string[]).includes(v)

/**
 * Cờ bật/tắt đọc theo lối rộng rãi (`true`, `1`, `yes`) vì nó sẽ nằm trên URL mà người ta chia sẻ
 * cho nhau. Mọi giá trị khác là **tắt**, kể cả rác: mặc định của một bộ lọc phải là "không lọc",
 * nên gõ sai thì thấy nhiều hơn mong đợi (nhìn ra ngay) chứ không thấy ít hơn (tưởng là hết).
 */
const toBool = (raw: string | null) => {
  const v = (raw ?? '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

export const parseConversationListQuery = (q: URLSearchParams): ListConversationsParams => {
  const page = Math.max(1, toInt(q.get('page'), 1))
  // Chặn trần: `limit=100000` là một lời gọi kéo sập trang, dù người gọi không cố ý.
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(q.get('limit'), DEFAULT_LIMIT)))

  const rawSort = (q.get('sort_by') ?? '').trim()
  const sortBy: ConversationSortField = isSortField(rawSort) ? rawSort : 'created_at'
  const sortOrder = q.get('sort_order') === 'asc' ? 'asc' : 'desc'

  const start = q.get('start_date')
  const end = q.get('end_date')
  /**
   * Chỉ lọc ngày khi **cả hai** đầu hợp lệ. Một đầu hợp lệ mà đầu kia rác thì khoảng thu được là
   * thứ người gọi không hề yêu cầu, và im lặng áp nó vào là trả một tập đã bị cắt mà bên gọi tưởng
   * là toàn bộ.
   */
  const range =
    start && end && parseDateOnly(start) && parseDateOnly(end)
      ? resolveDateRange(start, end)
      : undefined

  const organizationId = q.get('organization_id')?.trim() || undefined
  const onlyToolErrors = toBool(q.get('has_tool_errors'))

  /**
   * ⛔ KHÔNG nhận `search`. Trường văn bản duy nhất có thể tìm là `agent_sessions.title`, mà đó
   * là 120 ký tự đầu tin nhắn của người dùng — tìm được nghĩa là dò được nội dung.
   *
   * Và nhận một tham số rồi lặng lẽ bỏ qua còn tệ hơn không nhận: bên gọi dựng một ô tìm kiếm,
   * gõ vào không ra gì, rồi đi tìm lỗi ở phía mình.
   */
  return { page, limit, organizationId, sortBy, sortOrder, range, onlyToolErrors }
}
