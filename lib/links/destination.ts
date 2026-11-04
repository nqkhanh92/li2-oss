/**
 * Kiểm URL đích trước khi lưu, và kiểm lại trước khi redirect.
 *
 * Báo cáo đánh giá bản thương mại tìm một open redirect Critical mà **bản vá đã được viết sẵn
 * trong comment ngay phía trên dòng lỗi** và không ai áp. Guard hỏng ở đó là:
 *
 *     redirectTo.startsWith('/') && !redirectTo.startsWith('//')
 *
 * `/\evil.com` đi qua được — ký tự thứ hai là `\`, không phải `/` — và WHATWG URL coi `\` là dấu
 * phân cách path cho scheme http/https, nên nó phân giải thành `//evil.com`.
 *
 * Nên ở đây KHÔNG tự phân tích chuỗi. Dùng `new URL()` rồi kiểm `protocol` trên đối tượng đã
 * phân giải — đó là chỗ duy nhất biết chắc URL sẽ trỏ đâu.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export type DestinationCheck =
  | { ok: true; normalized: string }
  | { ok: false; reason: string }

export function checkDestination(raw: string): DestinationCheck {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, reason: 'URL đích rỗng' }
  if (trimmed.length > 2048) return { ok: false, reason: 'URL đích dài quá 2048 ký tự' }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'URL đích không phân giải được. Cần có cả scheme, ví dụ https://' }
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    // Chặn javascript:, data:, file:, vbscript: và mọi scheme khác bằng allowlist.
    // Blocklist ở chỗ này luôn thiếu một scheme nào đó.
    return { ok: false, reason: `Scheme ${url.protocol} không được phép. Chỉ http và https.` }
  }

  if (url.hostname.length === 0) return { ok: false, reason: 'URL đích không có hostname' }

  return { ok: true, normalized: url.toString() }
}
