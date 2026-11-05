import { NextResponse } from 'next/server'

import { withAdmin } from '@/shared/lib/middlewares/with-admin'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { listArtifacts } from '@/core/services/admin-artifacts.service'
import { parseArtifactListQuery } from '@/core/helpers/admin-stats/artifact-query'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'admin-artifacts' })

export const dynamic = 'force-dynamic'

/** Preflight phải export RIÊNG — Next tự sinh `OPTIONS` không kèm header CORS nào. */
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 204 }))

/**
 * `GET /api/admin/artifacts` — danh sách artifact kèm lượt truy cập, cho trang
 * "Artifact Performance" của Inside admin.
 *
 * Tham số: `page`, `limit`, `organization_id`, `search`, `sort_by`, `sort_order`,
 * `start_date`, `end_date`.
 *
 * Hình dạng trả về **một lớp**, khớp `/api/admin/stats/user-activity-by-day`:
 * `{ data: [...], total, page, limit }`. Có `page`/`limit` để bên gọi đối chiếu cái mình **nhận**
 * với cái mình **xin** — tham số bị chuẩn hoá (quá trần, âm, gõ sai) thì nhìn ra ngay thay vì
 * tưởng dữ liệu sai.
 */
export const GET = withAdmin(async (request) => {
  const url = new URL(request.url)
  const params = parseArtifactListQuery(url.searchParams)

  /**
   * ⭐ Tham số ngày hỏng thì TỪ CHỐI, và vẫn ghi log.
   *
   * Lỗi thật 2026-11-02: trang Inside gửi ISO đầy đủ thay vì `YYYY-MM-DD`, `parseDateOnly` từ
   * chối, và endpoint lặng lẽ trả về **toàn bộ thời gian**. Nút "Best Performance (7 days)" chạy
   * nhiều ngày mà không ai biết nó không lọc gì — vì không có lỗi nào để thấy. Đây đúng loại lỗi
   * tệ nhất: nhận tham số hỏng rồi im lặng bỏ qua, nên bên gọi không thấy lỗi, chỉ thấy số lạ,
   * rồi đi tìm nguyên nhân ở phía mình.
   *
   * Siết lên 400 ngày 2026-11-03, sau khi Inside prod lên `196c97b` (bằng chứng: `li2-fc` grep
   * marker `yyyy-MM-dd` trong dist của image mới — 3 chunk, bản cũ `617150c` là 0). Thứ tự này
   * có chủ ý: siết trước khi Inside sửa là đổi một lỗi âm thầm thành một trang vỡ.
   *
   * ★ GIỮ `log.warn` SONG SONG, KHÔNG THAY NÓ BẰNG 400 (ý của phiên `li2-inside-67`). Lý do: 400
   * nói cho **bên gọi**, warn nói cho **chúng ta**. Request bị từ chối vẫn phải để lại dấu vết,
   * vì nó là thứ duy nhất cho biết **còn bên gọi nào khác** ngoài Inside từng gửi sai. Không có
   * warn thì một bên thứ ba vỡ mà ta chỉ biết qua báo lỗi của người dùng.
   *
   * ⚠ Nói cho đúng: giữ warn **không** làm bên thứ ba khỏi vỡ — 400 đã bật thì họ vỡ ngay. Cái
   * warn mua được là **nguồn phát hiện** (log thay vì ticket), KHÔNG phải **thời gian**.
   *
   * ★ VÌ SAO 400 NGAY, KHÔNG WARN-ONLY VÀI NGÀY RỒI MỚI SIẾT. Nguyên tắc để lần sau khỏi tranh
   * lại — **chọn theo ai chịu thiệt** (phát biểu của phiên `li2-inside-67`):
   *   - endpoint **admin nội bộ**, bên gọi là công cụ của chính ta → vỡ ồn ào tốt hơn, vì người
   *     gặp lỗi chính là người sửa được lỗi;
   *   - endpoint **khách hàng dùng** → warn-only trước, vì người gặp lỗi không sửa được gì, chỉ
   *     mất việc.
   * Cái này là vế đầu. Gặp đúng câu hỏi này ở một endpoint public thì đáp án **ngược lại**, và
   * không phải vì ta đổi ý.
   *
   * Rủi ro đã bị giới hạn bằng đo đạc: `li2-inside-67` grep cả 6 repo dưới `~/Project/LiHi` —
   * **bên gọi thật duy nhất là `li2-inside/src/services/artifact/index.ts`**, và nó đã sửa, đã
   * lên prod. Phép quét đó không thấy script ngoài repo hay cron trên `.83`, nên nó **hạ xác
   * suất** có bên thứ ba chứ không loại trừ — và đó đúng là việc `log.warn` dưới đây tồn tại để
   * trả lời.
   */
  if (params.dateParamsRejected) {
    const start = url.searchParams.get('start_date')
    const end = url.searchParams.get('end_date')

    log.warn(
      { start_date: start, end_date: end },
      'start_date/end_date không đúng dạng YYYY-MM-DD — TỪ CHỐI 400'
    )

    /**
     * Trả lại nguyên văn giá trị đã nhận. Bên gọi gửi ISO thường không biết mình gửi ISO (thư viện
     * ngày tự `toISOString()`), nên nói "sai dạng" mà không cho thấy *cái gì* sai là bắt họ đi đoán.
     *
     * ⚠️ Và KHÔNG tự nhận ISO rồi cắt 10 ký tự đầu cho "dễ tính": `2026-11-02T00:00+07:00` là
     * `2026-11-01T17:00Z`, cắt ra thành ngày HÔM TRƯỚC. Server không biết múi giờ người gọi, nên
     * chỉ `YYYY-MM-DD` mới nói đúng ý họ — lệch một ngày mà vẫn 200 là quay về đúng lỗi vừa sửa.
     */
    return NextResponse.json(
      {
        error: 'start_date and end_date must be YYYY-MM-DD, and both are required together',
        received: { start_date: start, end_date: end },
      },
      { status: 400 }
    )
  }

  try {
    const { data, total } = await listArtifacts(params)
    return NextResponse.json({
      data,
      total,
      page: params.page,
      limit: params.limit,
    })
  } catch (error) {
    log.error({ error, params }, 'admin artifacts listing failed')
    return NextResponse.json({ error: 'Could not load artifacts' }, { status: 500 })
  }
})
