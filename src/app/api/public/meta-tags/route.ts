import { NextResponse } from 'next/server'

import { MetaScraper } from '@/infrastructure/external/meta-scraper'
import { checkFetchableUrl } from '@/core/helpers/safe-fetch-url'
import { compose } from '@/shared/lib/middlewares/compose'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { withRateLimit, RateLimitPresets } from '@/shared/lib/middlewares/with-rate-limit'

/**
 * Quét thẻ meta của một URL do người dùng nhập.
 *
 * ⚠ Route nằm dưới `/api/public/` nhưng **KHÔNG còn public** (chốt 2026-10-27). Trước đó nó không
 * có xác thực, không giới hạn tần suất, không kiểm URL — bất kỳ ai trên Internet cũng sai được
 * trình quét đi lấy địa chỉ tuỳ ý, gồm cả địa chỉ **nội bộ** mà trình quét chạm tới được. Đo trên
 * LiHi: `?url=http://169.254.169.254/latest/meta-data/` trả 200 khi không kèm token nào.
 *
 * Lúc đó nó chưa gây hại chỉ vì `META_SCRAPER_API_URL` đang rỗng nên lời gọi hỏng — **tai nạn cấu
 * hình, không phải thiết kế**. Đặt biến đó lên là mở relay.
 *
 * Giữ nguyên đường dẫn vì đã có hai nơi gọi (`paste-link-header.tsx:130`,
 * `use-short-link-meta-tags.ts:113`); đổi đường dẫn là một thay đổi phá vỡ không cần thiết.
 *
 * **Ba tầng, cố ý:** `withAuth` chặn người lạ, `withRateLimit` chặn cả người đã đăng nhập dùng
 * route này làm máy quét hàng loạt, `checkFetchableUrl` chặn đích nội bộ. Tầng cuối còn giá trị cả
 * khi ai đó gỡ hai tầng đầu — vì một người dùng đã đăng nhập vẫn không được phép dùng máy chủ làm
 * bàn đạp vào mạng nội bộ.
 *
 * Quota chọn `MODERATE` (30/phút) chứ không `STRICT`: đường gọi thật là người dùng dán URL vào ô
 * tạo link, và hook `use-meta-tags-auto-fetch` gọi lại **mỗi lần URL đổi** — tức mỗi lần sửa một ký
 * tự trong ô. 5/phút sẽ chặn đúng người dùng bình thường.
 */
export const GET = compose(
  withAuth,
  withRateLimit(RateLimitPresets.MODERATE)
)(async (request: Request) => {
  const url = new URL(request.url).searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const check = checkFetchableUrl(url)
  if (!check.ok) {
    // Không vọng lại URL trong câu trả lời: nó quay lại nguyên văn là một đường phản chiếu.
    return NextResponse.json({ error: 'url is not allowed', reason: check.reason }, { status: 400 })
  }

  const data = await MetaScraper.scrape(check.url.toString())
  if (!data) return NextResponse.json(null)
  if (data.image === null) delete data.image
  return NextResponse.json(data)
})
