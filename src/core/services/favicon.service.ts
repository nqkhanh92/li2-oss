import 'server-only'

import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { checkFetchableUrl } from '@/core/helpers/safe-fetch-url'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ service: 'favicon' })

/**
 * Favicon của trang đích, lấy **phía máy chủ** rồi phục vụ lại từ domain của mình.
 *
 * Vì sao không để `<img src="https://site-khach/favicon.ico">` trực tiếp — đây là lý do chính của
 * cả file: mỗi hàng trong danh sách sẽ là một lời gọi từ **trình duyệt của chủ sở hữu** tới máy chủ
 * của người khác, kèm IP và `Referer` chứa đường dẫn trang admin. Một danh sách 50 link biến thành
 * 50 lời khai "người này vừa mở trang quản trị Li2" rải ra 50 bên thứ ba. Proxy phía mình thì bên
 * ngoài chỉ thấy máy chủ Li2.
 *
 * ⚠ Lấy theo `/favicon.ico` của chính origin đích, **không** qua dịch vụ favicon bên thứ ba (kiểu
 * `google.com/s2/favicons` mà dub dùng). Dịch vụ đó tỷ lệ thành công cao hơn, nhưng nó gửi **danh
 * sách domain khách hàng** của một bản self-host cho Google — cái giá đó không tương xứng với một
 * ô hình 44px. Hệ quả cố ý: site không đặt `/favicon.ico` thì không có ảnh, và giao diện lùi về
 * biểu tượng chữ cái đầu.
 */

const FETCH_TIMEOUT_MS = 3000

/** 64 KB. Favicon thật đều nhỏ hơn nhiều; cái nào lớn hơn gần như chắc không phải favicon. */
const MAX_BYTES = 64 * 1024

/** Có ảnh: giữ lâu. Biểu tượng của một site đổi theo năm, không theo giờ. */
const TTL_HIT_SECONDS = 7 * 24 * 3600

/**
 * Không có ảnh: giữ ngắn hơn, nhưng **vẫn phải giữ**. Đây là nửa còn lại của yêu cầu "nhớ kết quả
 * hỏng" — không có nó thì site thiếu favicon bị gọi lại mỗi lần mở danh sách.
 */
const TTL_MISS_SECONDS = 24 * 3600

const MISS_MARKER = 'miss'

/**
 * ⛔ `image/svg+xml` KHÔNG nằm trong danh sách, và đó là chủ ý.
 *
 * SVG là XML chạy được script. Phục vụ lại một file SVG của bên thứ ba **từ domain của mình** là
 * cho phép họ chạy mã trong origin của mình — tức mọi thứ `Content-Type` của ta nói là "ảnh" lại
 * trở thành một trang. `nosniff` + CSP ở route là lớp hai; lớp một là đừng nhận nó.
 */
const ALLOWED_IMAGE_TYPES = [
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]

export type FaviconResult = { contentType: string; body: Buffer } | null

const isAllowedImageType = (contentType: string | null) => {
  if (!contentType) return false
  const base = contentType.split(';')[0].trim().toLowerCase()
  return ALLOWED_IMAGE_TYPES.includes(base)
}

/**
 * Theo chuyển hướng **bằng tay**, tối đa 2 chặng.
 *
 * `redirect: 'follow'` của `fetch` sẽ đi theo `Location` mà không hỏi ai — nên một site bên ngoài
 * hoàn toàn hợp lệ chỉ cần trả `302 → http://169.254.169.254/` là vượt qua được `checkFetchableUrl`
 * ở cửa, vì cửa chỉ thấy URL đầu tiên. Mỗi chặng phải qua lại đúng phép kiểm đó.
 */
const fetchFollowingRedirects = async (start: URL): Promise<Response | null> => {
  let current = start

  for (let hop = 0; hop <= 2; hop++) {
    const res = await fetch(current.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: ALLOWED_IMAGE_TYPES.join(',') },
    })

    if (res.status < 300 || res.status >= 400) return res

    const location = res.headers.get('location')
    if (!location) return null

    const next = checkFetchableUrl(new URL(location, current).toString())
    if (!next.ok) {
      log.warn({ hop, reason: next.reason }, 'favicon redirect bị chặn')
      return null
    }
    current = next.url
  }

  return null
}

/**
 * Lấy favicon cho một URL trang đích. Trả `null` khi không có ảnh dùng được — người gọi tự quyết
 * hiện gì thay thế.
 *
 * Redis hỏng thì **vẫn chạy**, chỉ là mất cache: hàm này chỉ *đo và nhớ*, không quyết quyền gì, nên
 * fail-open đúng theo quy ước ở `core/mcp/rate-limit.ts`.
 */
export const getFavicon = async (pageUrl: URL): Promise<FaviconResult> => {
  const origin = pageUrl.origin
  const key = REDIS_KEYS.FAVICON.ORIGIN(origin)

  try {
    const cached = await redis.get(key)
    if (cached === MISS_MARKER) return null
    if (cached) {
      const { contentType, b64 } = JSON.parse(cached)
      return { contentType, body: Buffer.from(b64, 'base64') }
    }
  } catch (error) {
    log.warn({ origin, err: error }, 'đọc cache favicon hỏng — đi lấy trực tiếp')
  }

  const result = await fetchFavicon(origin)

  try {
    if (result) {
      await redis.set(
        key,
        JSON.stringify({ contentType: result.contentType, b64: result.body.toString('base64') }),
        'EX',
        TTL_HIT_SECONDS
      )
    } else {
      await redis.set(key, MISS_MARKER, 'EX', TTL_MISS_SECONDS)
    }
  } catch (error) {
    log.warn({ origin, err: error }, 'ghi cache favicon hỏng — bỏ qua')
  }

  return result
}

const fetchFavicon = async (origin: string): Promise<FaviconResult> => {
  const candidate = checkFetchableUrl(`${origin}/favicon.ico`)
  if (!candidate.ok) return null

  try {
    const res = await fetchFollowingRedirects(candidate.url)
    if (!res || !res.ok) return null
    if (!isAllowedImageType(res.headers.get('content-type'))) return null

    /**
     * Kiểm `content-length` trước là để **không tải** một file lớn, nhưng header đó có thể thiếu
     * hoặc nói dối — nên sau khi đọc vẫn kiểm lại độ dài thật.
     */
    const declared = Number(res.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_BYTES) return null

    const body = Buffer.from(await res.arrayBuffer())
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return null

    return { contentType: res.headers.get('content-type')!.split(';')[0].trim(), body }
  } catch (error) {
    // Hết thời gian chờ, DNS sai, TLS sai — đều là "không có ảnh", không phải lỗi của người dùng.
    log.info({ origin, err: error }, 'không lấy được favicon')
    return null
  }
}
