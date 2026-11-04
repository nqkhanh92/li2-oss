import 'server-only'

/**
 * Allowlist loại tệp được tải lên.
 *
 * Vì sao kiểm bằng magic bytes chứ không tin `file.type`: `Content-Type` trong multipart do
 * **client đặt**. Một tệp `.exe` khai `application/pdf` là một dòng curl. Bản thương mại dùng
 * MinIO làm lớp lưu trữ và MinIO không kiểm MIME, nên nửa danh sách `allowed_mime_types` của họ
 * không có ai thực thi — đó đúng là lớp lỗi này.
 *
 * Nên ở đây `file.type` chỉ dùng để BÁO LỖI cho người dùng ("bạn khai pdf nhưng nội dung là zip"),
 * không bao giờ dùng để quyết định.
 */

export type MimeCheck =
  | { ok: true; mime: string; ext: string }
  | { ok: false; reason: string }

/**
 * Đuôi tệp → MIME chuẩn hoá mà máy chủ sẽ phục vụ.
 *
 * MIME trong DB là giá trị ở bảng này, KHÔNG phải giá trị client gửi. Nghĩa là header
 * `Content-Type` lúc phục vụ luôn là một trong chừng này chuỗi, không phải chuỗi tuỳ ý của ai.
 */
const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  html: 'text/html',
  htm: 'text/html',
  md: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

/**
 * Nhóm tệp văn bản — **giới hạn đã biết của bản này**.
 *
 * HTML, SVG, MD, TXT, CSV không có magic bytes đáng tin: một tệp HTML hợp lệ bắt đầu bằng bất cứ
 * thứ gì (khoảng trắng, BOM, một thẻ nào đó, hay chỉ văn bản thuần). Nên với nhóm này việc kiểm
 * chỉ còn: đuôi nằm trong allowlist, giải mã được UTF-8, không có byte NUL, và không quá
 * `MAX_TEXT_BYTES`.
 *
 * Hệ quả cụ thể: **đổi đuôi một tệp nhị phân thành `.txt` thì nó qua được lớp này.** Đó là rủi ro
 * chấp nhận được vì hai lớp sau bắt nó lại: MIME phục vụ lấy từ `EXT_TO_MIME` (không phải từ nội
 * dung), và `X-Content-Type-Options: nosniff` ngăn trình duyệt tự đoán lại. Một tệp PE nằm trong
 * `text/plain` + nosniff thì trình duyệt không chạy nó.
 */
const TEXT_EXTS = new Set(['svg', 'html', 'htm', 'md', 'txt', 'csv'])

/** Tệp văn bản 8 MiB là dấu hiệu có gì sai, không phải nhu cầu thật. Nhị phân thì dùng hạn mức chung. */
export const MAX_TEXT_BYTES = 8 * 1024 * 1024

/** Mọi loại office (docx/xlsx/pptx) đều là zip, nên magic chỉ phân biệt được tới "là zip". */
const ZIP_EXTS = new Set(['docx', 'xlsx', 'pptx'])

function startsWith(bytes: Uint8Array, prefix: number[], offset = 0): boolean {
  if (bytes.length < offset + prefix.length) return false
  return prefix.every((b, i) => bytes[offset + i] === b)
}

/** Magic bytes cho các loại có magic đáng tin. Trả `null` khi không nhận ra. */
function sniff(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf' // "%PDF-"
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  // WEBP: "RIFF" .... "WEBP" — bốn byte kích thước nằm giữa nên phải kiểm hai đoạn.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return 'webp'
  // Zip: "PK\x03\x04". Cũng khớp "PK\x05\x06" (zip rỗng) và "PK\x07\x08" (spanned) — hai cái đó
  // không phải tệp office hợp lệ nên không nhận.
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'zip'
  return null
}

/** Đuôi tệp, chữ thường, không có dấu chấm. `evil.php.txt` → `txt` (đuôi CUỐI quyết định). */
export function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot + 1).toLowerCase()
}

/**
 * Làm sạch tên gốc trước khi lưu vào `artifacts.original_name`.
 *
 * Tên này chỉ để hiện lại cho người dùng và để đặt `Content-Disposition`, nhưng nó đi vào HTML và
 * vào header nên vẫn phải sạch: bỏ thành phần đường dẫn (tên trên đĩa do hệ thống sinh, xem
 * `lib/artifacts/storage.ts`), bỏ ký tự điều khiển — CR/LF trong tên tệp là header injection.
 */
// Ký tự điều khiển viết bằng escape, không viết byte thật, để file nguồn không chứa byte NUL.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g

export function sanitizeOriginalName(name: string): string {
  const base = (name.split(/[/\\]/).pop() ?? '').replace(CONTROL_CHARS, '')
  const trimmed = base.trim()
  return trimmed.length === 0 ? 'tep-khong-ten' : trimmed.slice(0, 255)
}

export type CheckUploadInput = {
  bytes: Uint8Array
  originalName: string
  /** `file.type` của client. Chỉ dùng để giải thích lỗi, không dùng để quyết định. */
  declaredType?: string | null
}

export function checkUpload({ bytes, originalName, declaredType }: CheckUploadInput): MimeCheck {
  if (bytes.length === 0) return { ok: false, reason: 'Tệp rỗng' }

  const ext = extensionOf(originalName)
  if (!ext) return { ok: false, reason: 'Tên tệp không có đuôi nên không xác định được loại' }

  const mime = EXT_TO_MIME[ext]
  if (!mime) {
    return {
      ok: false,
      reason: `Đuôi .${ext} không được phép. Cho phép: ${Object.keys(EXT_TO_MIME).join(', ')}`,
    }
  }

  if (TEXT_EXTS.has(ext)) {
    if (bytes.length > MAX_TEXT_BYTES) {
      return { ok: false, reason: `Tệp .${ext} vượt ${MAX_TEXT_BYTES} byte` }
    }
    const textReason = checkIsText(bytes)
    if (textReason) return { ok: false, reason: textReason }
    return { ok: true, mime, ext }
  }

  const sniffed = sniff(bytes)
  if (!sniffed) {
    return {
      ok: false,
      reason: `Nội dung tệp không khớp loại nào được phép (đuôi .${ext}${
        declaredType ? `, client khai ${declaredType}` : ''
      })`,
    }
  }

  const expected = ZIP_EXTS.has(ext) ? 'zip' : ext === 'jpg' ? 'jpeg' : ext
  if (sniffed !== expected) {
    return {
      ok: false,
      reason: `Nội dung tệp là ${sniffed} nhưng đuôi là .${ext}. Đổi đuôi không đổi được nội dung.`,
    }
  }

  return { ok: true, mime, ext }
}

/**
 * Nội dung có phải văn bản. Không có magic để dựa vào, nên dựa vào cái ngược lại: byte NUL và
 * chuỗi không giải mã được UTF-8 là dấu hiệu nhị phân khá chắc.
 *
 * Chỉ soi 64 KiB đầu — đủ để bắt mọi định dạng nhị phân phổ biến (header của chúng nằm ở đầu),
 * và không phải quét hết một tệp CSV 8 MiB cho mỗi lần tải lên.
 */
function checkIsText(bytes: Uint8Array): string | null {
  const head = bytes.subarray(0, 64 * 1024)
  if (head.includes(0x00)) return 'Tệp khai là văn bản nhưng chứa byte NUL'
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(head)
  } catch {
    return 'Tệp khai là văn bản nhưng không giải mã được UTF-8'
  }
  return null
}

/**
 * Loại nội dung "sống": trình duyệt chạy script khi mở trực tiếp.
 *
 * SVG nằm trong danh sách này và đó không phải thừa — một `<svg>` mở ở tab riêng là một document,
 * `<script>` trong nó chạy. Bỏ qua SVG là chỗ rất nhiều hệ thống bị XSS lưu trữ.
 */
export const ACTIVE_CONTENT_MIMES = new Set(['text/html', 'image/svg+xml'])

export function isActiveContent(mime: string): boolean {
  return ACTIVE_CONTENT_MIMES.has(mime)
}
