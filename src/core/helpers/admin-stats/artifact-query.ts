import {
  ARTIFACT_SORT_FIELDS,
  type ArtifactSortField,
  type ListArtifactsParams,
} from '@/core/services/admin-artifacts.service'
import { parseDateOnly, resolveDateRange } from './date-series'

/**
 * Đọc tham số truy vấn của `/api/admin/artifacts`.
 *
 * Nguyên tắc chung với endpoint chart: tham số gõ sai thì **lùi về mặc định**, không trả 400.
 * Một trang admin không nên trắng vì ai đó gõ `limit=abc` hay bấm nút phân trang hai lần.
 *
 * Ngoại lệ là những thứ mà "mặc định" sẽ nói dối: không có ngày thì **không lọc ngày**, chứ không
 * âm thầm cắt về 30 ngày gần nhất như biểu đồ. Biểu đồ luôn có một trục thời gian nên 30 ngày là
 * câu trả lời hợp lý; một *danh sách* mà tự ẩn bớt hàng thì người dùng đếm thiếu mà không biết.
 */

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

/**
 * ⚠ Phải loại `null`/chuỗi rỗng TRƯỚC khi `Number()`: `Number(null)` và `Number('')` đều ra **0**,
 * mà `0` là số nguyên hợp lệ — nên không có nhánh này thì "không truyền tham số" bị đọc thành
 * "truyền 0", rồi `Math.max(1, 0)` biến `limit` mặc định thành **1 hàng mỗi trang**.
 *
 * Đó là ca gọi phổ biến nhất của endpoint, và nó hỏng im lặng: API vẫn 200, vẫn có dữ liệu, chỉ
 * là mỗi trang một hàng. Test bắt được; đọc code thì không.
 */
const toInt = (raw: string | null, fallback: number) => {
  if (raw === null || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) ? n : fallback
}

const isSortField = (v: string): v is ArtifactSortField =>
  (ARTIFACT_SORT_FIELDS as readonly string[]).includes(v)

export const parseArtifactListQuery = (q: URLSearchParams): ListArtifactsParams => {
  const page = Math.max(1, toInt(q.get('page'), 1))
  // Chặn trần: `limit=100000` là một lời gọi kéo sập trang, dù người gọi không cố ý.
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(q.get('limit'), DEFAULT_LIMIT)))

  const rawSort = (q.get('sort_by') ?? '').trim()
  const sortBy: ArtifactSortField = isSortField(rawSort) ? rawSort : 'created_at'
  const sortOrder = q.get('sort_order') === 'asc' ? 'asc' : 'desc'

  const start = q.get('start_date')
  const end = q.get('end_date')
  /**
   * Chỉ lọc ngày khi **cả hai** đầu hợp lệ. Một đầu hợp lệ mà đầu kia rác thì khoảng thu được là
   * thứ người gọi không hề yêu cầu — im lặng áp nó vào là trả về một tập đã bị cắt mà bên gọi
   * tưởng là toàn bộ.
   */
  const range =
    start && end && parseDateOnly(start) && parseDateOnly(end)
      ? resolveDateRange(start, end)
      : undefined

  /**
   * ⭐ Người gọi CÓ gửi ngày nhưng ta không dùng được — phải kêu lên.
   *
   * Lỗi thật 2026-11-02: trang Artifact Performance gửi ISO đầy đủ
   * (`2026-10-26T17:00:00.000Z`) thay vì `YYYY-MM-DD`. `parseDateOnly` từ chối, `range` thành
   * `undefined`, và endpoint **lặng lẽ trả về toàn bộ thời gian**. Nút "Best Performance
   * (7 days)" chạy suốt nhiều ngày mà không ai biết nó không lọc gì.
   *
   * Đây đúng loại lỗi tệ nhất: nhận tham số hỏng rồi im lặng bỏ qua. Bên gọi không thấy lỗi, chỉ
   * thấy số lạ, rồi đi tìm nguyên nhân ở phía mình.
   *
   * ⚠️ TỪ 2026-11-03 CỜ NÀY DẪN TỚI 400, không còn chỉ để log. Trước đó nó cố tình **không**
   * trả 400 vì prod `admin.li2.ai` còn chạy bản Inside CŨ vẫn gửi ISO — siết lúc đó là đổi một
   * lỗi âm thầm thành một trang vỡ. Inside prod lên `196c97b` rồi nên điều kiện hết hiệu lực.
   *
   * Parser vẫn **không** tự ném: nó chỉ báo "có gửi mà không dùng được", còn biến cái đó thành
   * mã trạng thái là việc của route (`app/api/admin/artifacts/route.ts`). Giữ ranh giới đó để
   * parser còn test được như một hàm thuần, và để bên gọi khác dùng lại được với chính sách khác.
   *
   * ⚠️ Và KHÔNG tự nhận ISO rồi cắt lấy 10 ký tự đầu: `2026-11-02T00:00+07:00` là
   * `2026-11-01T17:00Z`, cắt ra thành ngày HÔM TRƯỚC. Server không biết múi giờ người dùng, nên
   * chỉ `YYYY-MM-DD` mới nói đúng ý họ. Hợp đồng đang đúng; thứ sai là việc nó hỏng im lặng.
   */
  const dateParamsRejected = Boolean((start || end) && !range)

  const organizationId = q.get('organization_id')?.trim() || undefined
  const search = q.get('search')?.trim() || undefined

  return { page, limit, organizationId, search, sortBy, sortOrder, range, dateParamsRejected }
}
