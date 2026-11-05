/**
 * URL do người dùng nhập có an toàn để **máy chủ** đi lấy không.
 *
 * Mọi chỗ nhận một URL rồi bảo phía máy chủ (hoặc một dịch vụ nội bộ) đi tải nó đều phải qua đây.
 * Đây là phòng tuyến SSRF: không có nó, người gọi chọn được địa chỉ mà máy chủ sẽ chạm tới, và
 * máy chủ thì đứng **bên trong** mạng nội bộ — họ mượn tay nó để sờ vào chỗ từ ngoài không sờ được.
 *
 * Ca kinh điển: `http://169.254.169.254/latest/meta-data/` trả về khoá truy cập của máy ảo trên
 * phần lớn nền tảng đám mây.
 */

export type UrlRejectReason =
  | 'invalid'
  | 'scheme'
  | 'credentials'
  | 'private_host'
  | 'port'

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: UrlRejectReason }

/** Chỉ hai lược đồ này. `file:`, `gopher:`, `ftp:`, `data:` đều là đường vòng đã biết. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Cổng cho phép. Trống = cổng mặc định của lược đồ.
 *
 * Chặn cổng lạ vì dịch vụ nội bộ hay nằm ở cổng cao (Redis 6379, Postgres 5432, Elasticsearch
 * 9200) — và một tên miền ngoài hoàn toàn hợp lệ vẫn trỏ được vào `:6379` của chính mạng ta.
 */
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443'])

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./, // link-local — gồm cả endpoint metadata của đám mây
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
]

const PRIVATE_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
])

/** `[::1]` trong URL có ngoặc vuông; bỏ ngoặc rồi mới so. */
const stripBrackets = (host: string) => host.replace(/^\[|\]$/g, '')

const isPrivateIpv6 = (host: string) => {
  const h = stripBrackets(host).toLowerCase()
  if (h === '::1' || h === '::' || h === '0:0:0:0:0:0:0:1') return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true // unique-local
  if (h.startsWith('fe80')) return true // link-local
  /**
   * IPv4 nhúng trong IPv6 — cùng một đích, khác cách viết. Bỏ sót đây là bỏ ngỏ toàn bộ danh sách
   * IPv4 ở trên.
   *
   * ⚠ Phải xử lý **hai** dạng, và dạng thứ hai là dạng thực tế sẽ gặp:
   * - viết tay:  `::ffff:169.254.169.254`
   * - sau khi `new URL()` chuẩn hoá: **`::ffff:a9fe:a9fe`** — Node ép phần IPv4 về hex, nên một
   *   biểu thức chỉ tìm số-có-dấu-chấm sẽ **không bao giờ khớp** với thứ mà code thật nhận được.
   *   Test bắt được chỗ này; đọc code thì không.
   */
  const dotted = h.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (dotted) return PRIVATE_V4.some((re) => re.test(dotted[1]))

  const hexMapped = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hexMapped) {
    const n = (parseInt(hexMapped[1], 16) << 16) | parseInt(hexMapped[2], 16)
    const v4 = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
    return PRIVATE_V4.some((re) => re.test(v4))
  }

  return false
}

const isPrivateHost = (hostname: string) => {
  const h = stripBrackets(hostname).toLowerCase().replace(/\.$/, '')
  if (PRIVATE_HOSTNAMES.has(h)) return true
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h.includes(':')) return isPrivateIpv6(h)
  if (PRIVATE_V4.some((re) => re.test(h))) return true
  return false
}

/**
 * ⚠ **Hàm này KHÔNG giải tên miền.** Nó chặn địa chỉ nội bộ viết thẳng và các tên miền nội bộ quen
 * thuộc — nhưng một tên miền ngoài hoàn toàn hợp lệ vẫn có thể có bản ghi A trỏ về
 * `169.254.169.254`, và chuyện đó chỉ lộ ra lúc giải tên.
 *
 * Nên đây là **lớp một**, không phải lớp duy nhất. Lớp đủ chắc là chặn ở tầng mạng của chính nơi
 * đi lấy (cho trình quét chạy ở mạng không thấy dải nội bộ), hoặc giải tên rồi kiểm IP trước khi
 * nối. Ghi ra đây để người sau không tưởng đã xong.
 */
export const checkFetchableUrl = (raw: string): UrlCheck => {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return { ok: false, reason: 'scheme' }

  /**
   * `http://user:pass@thật.com@kẻ-gian.com/` — một số bộ phân tích đọc phần trước `@` cuối làm
   * thông tin đăng nhập, số khác không. URL chứa thông tin đăng nhập thì từ chối, đừng đoán.
   */
  if (url.username || url.password) return { ok: false, reason: 'credentials' }

  /**
   * Kiểm **host trước cổng**. Cả hai đều chặn, nhưng `127.0.0.1:3000` mà báo lý do `port` thì
   * người đọc log tưởng chỉ cần đổi cổng là xong — trong khi vấn đề là cái địa chỉ.
   */
  if (isPrivateHost(url.hostname)) return { ok: false, reason: 'private_host' }
  if (!ALLOWED_PORTS.has(url.port)) return { ok: false, reason: 'port' }

  return { ok: true, url }
}
