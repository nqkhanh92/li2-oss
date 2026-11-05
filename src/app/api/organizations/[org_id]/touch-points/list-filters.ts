import { NO_CUSTOM_DOMAIN } from '@/core/helpers/merged-status'

/**
 * Khoá lọc mà `GET …/touch-points` chấp nhận.
 *
 * Vì sao cần: trước đây route đẩy **mọi** khoá trong `filters` xuống
 * `queryBuilderByParams` → `.match({ khoá_lạ: … })` → PostgREST 400 → **500, chết cả danh sách**.
 * Gõ nhầm `filters[merged_status]` thay vì `filters[status]` là mất trang. Và mỗi khoá lọc mới ai
 * đó thêm mà quên khai sẽ lặp lại đúng chuyện đó, với thông báo `Unknown error` không chỉ được
 * chỗ nào sai.
 *
 * ⚠ `created_at` và `excludeIds` **phải** ở đây dù `queryBuilderByParams` tự `delete` chúng
 * (`shared/lib/utils.ts:47-62`). Danh sách này nói **khoá nào hợp lệ**, độc lập với việc tầng
 * dưới có xoá hay không — mai ai đó sửa `utils.ts` thì endpoint không được quay ra từ chối một
 * khoá vẫn đang dùng.
 *
 * ⚠ Phạm vi là **route HTTP**, không phải service. `/api/agent/tools/list-short-links` cũng gọi
 * `getAllTouchPoints` nhưng tự dựng `queryParams` ở server và gửi `content_type` — khoá không có
 * trong danh sách này. Siết ở service sẽ khoá nhầm đường đó.
 */
export const TOUCH_POINT_LIST_FILTER_KEYS = [
  // Bốn danh sách cũ (link / qr / nfc / tag) và hộp thoại chọn touch point
  'tag_ids',
  'collection_id',
  'created_at',
  'excludeIds',
  // Thanh công cụ danh sách gộp
  'domain_id',
  'row_type',
  'status',
] as const

export type TouchPointListFilterKey = (typeof TOUCH_POINT_LIST_FILTER_KEYS)[number]

/**
 * Trả về những khoá KHÔNG hợp lệ, theo đúng thứ tự người gọi gửi.
 *
 * Trả danh sách chứ không chỉ `boolean`: câu lỗi phải nêu được **tên khoá**, vì đó là thứ duy
 * nhất giúp người gọi sửa. Nêu tên thôi — KHÔNG vọng lại giá trị, giá trị do người gọi đặt và
 * vọng nó lại là tự mở một đường phản chiếu dữ liệu không cần thiết.
 */

/**
 * Khoá lọc so thẳng với cột `uuid` trong Postgres. Gửi chuỗi không phải UUID thì PostgREST ném và
 * endpoint trả **500** — cùng một câu chuyện với khoá lạ, chỉ hẹp hơn một bậc: khoá đúng, giá trị
 * sai **kiểu**.
 *
 * ⚠ Đo được **bốn** khoá, không phải ba: `excludeIds` cũng dính dù nó đi qua `.not('id','in',…)`
 * chứ không phải `.match()`. Đếm từ danh sách khoá là đoán; phép đo mới ra con số.
 *
 * ⚠ CỐ Ý không kiểm kiểu cho mọi khoá. `status` và `created_at` được code ứng dụng xử lý trước
 * khi xuống SQL nên giá trị lạ đã vô hại (trả 200, bỏ qua) — siết thêm là thay một thứ đang chạy
 * bằng một thứ chặt hơn mà không ai cần.
 */
const UUID_FILTER_KEYS = ['tag_ids', 'domain_id', 'collection_id', 'excludeIds'] as const

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Giá trị quy ước KHÔNG phải UUID nhưng hợp lệ — **theo từng khoá**, không dùng chung.
 *
 * `__no_custom_domain__` chỉ có nghĩa với `domain_id` (mục "Domain hệ thống" lọc
 * `domain_id IS NULL`). Mở nó cho mọi khoá UUID là để một chuỗi không phải UUID lọt xuống cột
 * `uuid` của `tag_ids` — tức dựng lại đúng cái 500 vừa chữa, bằng một cửa hẹp hơn. Test bắt được
 * chỗ này trước khi nó đi xa.
 */
const SENTINELS_BY_KEY: Record<string, ReadonlySet<string>> = {
  domain_id: new Set([NO_CUSTOM_DOMAIN]),
}

/**
 * Trả về những khoá UUID mang giá trị sai hình dạng.
 *
 * Nhận cả chuỗi lẫn mảng (`tag_ids` và `excludeIds` nhận nhiều giá trị) và từ chối nếu **bất kỳ**
 * phần tử nào sai — một id hỏng trong mười cái vẫn làm cả truy vấn ném, nên chấp nhận chín cái
 * rồi vẫn 500 thì không giải quyết gì.
 *
 * Giá trị rỗng/`null` thì BỎ QUA chứ không báo sai: `setFilter(key, null)` là cách giao diện xoá
 * một bộ lọc, và xoá bộ lọc không phải là lỗi.
 */
export function malformedUuidFilterKeys(filters?: Record<string, unknown> | null): string[] {
  if (!filters) return []

  return UUID_FILTER_KEYS.filter((key) => {
    const value = filters[key]
    if (value === undefined || value === null || value === '') return false

    const sentinels = SENTINELS_BY_KEY[key]
    const isValid = (item: unknown) =>
      typeof item === 'string' && (UUID_PATTERN.test(item) || !!sentinels?.has(item))

    const items = Array.isArray(value) ? value : [value]
    return items.length > 0 && !items.every(isValid)
  })
}

export function unknownFilterKeys(filters?: Record<string, unknown> | null): string[] {
  if (!filters) return []
  const allowed = new Set<string>(TOUCH_POINT_LIST_FILTER_KEYS)
  return Object.keys(filters).filter((key) => !allowed.has(key))
}
