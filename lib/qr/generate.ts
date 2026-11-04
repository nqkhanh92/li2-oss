import 'server-only'
import QRCode, { type QRCodeToBufferOptions, type QRCodeToStringOptions } from 'qrcode'

/**
 * Sinh QR cho một short link.
 *
 * Vì sao `qrcode` chứ không `qr-code-styling` + `jsdom` + `canvas`: ADR-001. Bộ kia kéo theo 6 mục
 * NOTICE LGPL mà báo cáo đánh giá kết luận là **không gỡ được** — vì hằng `FORCE_QR_ENABLED` buộc
 * mọi touch point render QR phía máy chủ. Ở đây QR sinh theo yêu cầu từ `slug`, nên không có nhánh
 * nào cần canvas, và `qrcode` là MIT + JS thuần.
 */

export type QrFormat = 'png' | 'svg'

/** Tuỳ chọn mà người gọi (query string, form) được phép đặt. */
export type QrUserOptions = {
  width?: number
  margin?: number
  /** Màu module, hex `#rgb`/`#rrggbb`/`#rrggbbaa`. */
  dark?: string
  /** Màu nền, cùng định dạng. */
  light?: string
}

/** Giới hạn do MÁY CHỦ đặt. Người gọi không đổi được, kể cả khi truyền đúng tên khoá. */
export const MIN_WIDTH = 64
export const MAX_WIDTH = 2048
export const DEFAULT_WIDTH = 512
export const MAX_MARGIN = 16
export const DEFAULT_MARGIN = 2

/**
 * Mức sửa lỗi do máy chủ chọn, KHÔNG nhận từ người gọi.
 *
 * `L` sửa được ~7% và cho mã thưa hơn, nhưng một QR in ra rồi dán lên kính cửa hàng thì bị xước,
 * bị mờ, bị che một góc. `M` (~15%) là mức đổi lại được bằng vài module. Để người gọi hạ xuống `L`
 * là để họ tự làm hỏng vật in mà không biết, nên đây là quyết định của máy chủ.
 */
const ERROR_CORRECTION_LEVEL = 'M' as const

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function safeColor(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  // Allowlist hex. Chuỗi màu tự do đi thẳng vào thuộc tính `fill` của SVG là một đường tiêm.
  return HEX_COLOR.test(raw) ? raw : fallback
}

// `dark`/`light` còn sót lại từ `...user` ở `resolveQrOptions`; `qrcode` bỏ qua khoá nó không biết.
// Khai báo chúng ở đây để kiểu khớp với thực tế thay vì phải ép kiểu.
export type ResolvedQrOptions = QrUserOptions & {
  width: number
  margin: number
  errorCorrectionLevel: typeof ERROR_CORRECTION_LEVEL
  color: { dark: string; light: string }
}

/**
 * Trộn tuỳ chọn người dùng với giới hạn máy chủ.
 *
 * ⚠ **Thứ tự spread ở đây là ranh giới an toàn, không phải chuyện phong cách.**
 *
 * Báo cáo đánh giá bản thương mại tìm ra một lỗ đúng ở dạng này: tuỳ chọn do người dùng truyền
 * được spread **sau** tuỳ chọn máy chủ,
 *
 *     const opts = { ...serverDefaults, ...userOptions }   // SAI
 *
 * nên mọi khoá máy chủ đặt đều bị ghi đè được — kể cả giới hạn. Người gọi gửi `width=100000` thì
 * được một ảnh 100000px: một lần gọi, hàng chục GB bộ nhớ, tiến trình chết.
 *
 * Ở đây ngược lại: `...user` đi TRƯỚC, rồi mọi khoá có giới hạn được gán lại SAU. Khoá gán sau
 * thắng, nên không có cách nào truyền thêm một khoá để vượt giới hạn — vượt được thì phải sửa
 * chính file này, và lúc đó có diff để review.
 *
 * Hàm này thuần nên test được mà không sinh QR thật.
 */
export function resolveQrOptions(user: QrUserOptions = {}): ResolvedQrOptions {
  const requestedWidth = Number.isFinite(user.width) ? Number(user.width) : DEFAULT_WIDTH
  const requestedMargin = Number.isFinite(user.margin) ? Number(user.margin) : DEFAULT_MARGIN

  return {
    ...user,
    // Từ đây xuống là giới hạn máy chủ. Mọi dòng dưới đây ghi đè `...user` ở trên — đó là chủ ý.
    width: clamp(Math.round(requestedWidth), MIN_WIDTH, MAX_WIDTH),
    margin: clamp(Math.round(requestedMargin), 0, MAX_MARGIN),
    errorCorrectionLevel: ERROR_CORRECTION_LEVEL,
    color: {
      dark: safeColor(user.dark, '#000000'),
      light: safeColor(user.light, '#ffffff'),
    },
  }
}

export function parseQrFormat(raw: string | null): QrFormat {
  return raw === 'svg' ? 'svg' : 'png'
}

export async function qrPng(text: string, user: QrUserOptions = {}): Promise<Buffer> {
  const opts = resolveQrOptions(user)
  return QRCode.toBuffer(text, { ...opts, type: 'png' } satisfies QRCodeToBufferOptions)
}

export async function qrSvg(text: string, user: QrUserOptions = {}): Promise<string> {
  const opts = resolveQrOptions(user)
  return QRCode.toString(text, { ...opts, type: 'svg' } satisfies QRCodeToStringOptions)
}

/**
 * Địa chỉ mà QR trỏ tới.
 *
 * `PUBLIC_BASE_URL` là bắt buộc và không có mặc định: một giá trị mặc định trỏ tới domain của ai
 * đó sẽ âm thầm sinh ra những QR in sẵn trỏ sai chỗ, và QR đã in thì không sửa được.
 */
export function publicLinkUrl(slug: string): string {
  const base = process.env.PUBLIC_BASE_URL
  if (!base) {
    throw new Error(
      'PUBLIC_BASE_URL chưa được đặt. QR phải mã hoá địa chỉ công khai thật của instance này ' +
        '— không có giá trị mặc định nào đúng.'
    )
  }
  return new URL(`/${slug}`, base).toString()
}
