import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Readable } from 'node:stream'

/**
 * Lưu tệp artifact trên đĩa, dưới `STORAGE_DIR`.
 *
 * Vì sao đĩa chứ không phải object storage: ADR-001. Lý do nhắc lại ở đây vì nó quyết định cả file
 * này — bản thương mại dùng MinIO và MinIO không kiểm MIME, nên lớp kiểm loại tệp của họ không có
 * ai thực thi. Đĩa thì mọi lần ghi đều đi qua đúng một hàm, và hàm đó là `saveArtifactFile`.
 *
 * Hai quy ước không được phá:
 *
 * 1. **Tên tệp trên đĩa do hệ thống sinh.** Tên người dùng tải lên không bao giờ thành tên trên
 *    đĩa — nó chỉ nằm ở `artifacts.original_name` trong DB để hiện lại. Tên người dùng là dữ liệu
 *    của kẻ tấn công: `../../etc/cron.d/x`, `.htaccess`, một tên 4096 ký tự, một tên có NUL.
 * 2. **`artifacts.storage_path` là đường dẫn TƯƠNG ĐỐI.** Đổi `STORAGE_DIR` hay chuyển máy không
 *    làm hỏng hàng nào trong DB, và một hàng DB bị sửa tay cũng không chỉ ra ngoài được — xem
 *    `safeStoragePath`.
 */

/** Hạn mức mặc định 30 MiB. Người vận hành đổi bằng `MAX_UPLOAD_BYTES`. */
export const DEFAULT_MAX_UPLOAD_BYTES = 31_457_280

export function maxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_BYTES
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES
  const parsed = Number.parseInt(raw, 10)
  // Giá trị rác trong env không được âm thầm thành "không giới hạn".
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_UPLOAD_BYTES
  return parsed
}

export function storageRoot(): string {
  const dir = process.env.STORAGE_DIR
  if (!dir) {
    throw new Error(
      'STORAGE_DIR chưa được đặt. Sao chép .env.example thành .env rồi điền, hoặc chạy bằng docker compose.'
    )
  }
  return path.resolve(dir)
}

export type SafePath = { ok: true; absolute: string } | { ok: false; reason: string }

/**
 * Phân giải một `storage_path` tương đối thành đường dẫn tuyệt đối, và CHỨNG MINH nó nằm trong
 * `root`.
 *
 * ⚠ Chỗ này là lỗ path traversal kinh điển, và cách hỏng phổ biến nhất không phải là quên kiểm —
 * mà là kiểm bằng so sánh chuỗi:
 *
 *     absolute.startsWith(root)            // SAI
 *
 * Với `root = /data/artifacts`, đường dẫn `/data/artifacts-evil/x.pdf` **có** prefix đó. Tiền tố
 * chuỗi không phải quan hệ cha-con trong cây thư mục; `/data/artifacts-evil` là thư mục ngang hàng.
 * Thêm dấu phân cách (`root + path.sep`) vá được ca đó nhưng vẫn phải tự xử `.`/`..`/dấu phân cách
 * lặp.
 *
 * Nên ở đây dùng `path.relative(root, absolute)` sau khi cả hai đã `resolve`: nếu kết quả bắt đầu
 * bằng `..` hoặc là đường dẫn tuyệt đối thì đích nằm ngoài cây, hết. Một phép kiểm, không có ca lẻ.
 *
 * Hàm này thuần (không đụng fs) nên test được mà không cần thư mục thật.
 */
export function safeStoragePath(relative: string, root: string): SafePath {
  if (relative.length === 0) return { ok: false, reason: 'storage_path rỗng' }
  if (relative.includes('\u0000')) return { ok: false, reason: 'storage_path chứa byte NUL' }
  if (path.isAbsolute(relative)) {
    return { ok: false, reason: 'storage_path phải tương đối, không được tuyệt đối' }
  }

  const resolvedRoot = path.resolve(root)
  const absolute = path.resolve(resolvedRoot, relative)
  const rel = path.relative(resolvedRoot, absolute)

  if (rel.length === 0) return { ok: false, reason: 'storage_path trỏ vào chính thư mục gốc' }
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    return { ok: false, reason: 'storage_path trỏ ra ngoài STORAGE_DIR' }
  }

  return { ok: true, absolute }
}

export type SavedFile = {
  /** Tương đối với `STORAGE_DIR`. Đây là giá trị đi vào `artifacts.storage_path`. */
  storagePath: string
  sizeBytes: number
  /** sha256 hex — cột `artifacts.content_hash`. */
  contentHash: string
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Ghi nội dung ra đĩa và trả về đường dẫn tương đối để lưu DB.
 *
 * Chia theo `YYYY/MM/` chứ không dồn một thư mục: một instance chạy vài năm sẽ có hàng chục nghìn
 * tệp, và `ls` một thư mục như thế là việc người vận hành phải làm lúc sự cố.
 *
 * `ext` lấy từ `checkUpload` (xem `lib/artifacts/mime.ts`), tức đã nằm trong allowlist — không
 * phải chuỗi do người dùng đặt. Vẫn lọc lại ở đây vì hàm này là nơi duy nhất tạo tên tệp.
 */
export async function saveArtifactFile(
  bytes: Uint8Array,
  ext: string,
  limitBytes = maxUploadBytes()
): Promise<SavedFile> {
  if (bytes.length > limitBytes) {
    throw new UploadTooLargeError(bytes.length, limitBytes)
  }
  if (!/^[a-z0-9]{1,8}$/.test(ext)) {
    throw new Error(`Đuôi tệp không hợp lệ cho tên trên đĩa: ${JSON.stringify(ext)}`)
  }

  const root = storageRoot()
  const now = new Date()
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const storagePath = `${folder}/${randomUUID()}.${ext}`

  const target = safeStoragePath(storagePath, root)
  // Đường dẫn do chính hàm này sinh nên không thể ra ngoài; kiểm vẫn giữ để nếu ai sửa cách sinh
  // tên thì vỡ ở đây thay vì vỡ ở chỗ không ai thấy.
  if (!target.ok) throw new Error(`Không sinh được đường dẫn lưu trữ: ${target.reason}`)

  await mkdir(path.dirname(target.absolute), { recursive: true })
  // `flag: 'wx'` — lỗi nếu tệp đã tồn tại. uuid trùng là chuyện không xảy ra, nhưng ghi đè âm thầm
  // một artifact đang phục vụ thì không có cách nào phát hiện.
  await writeFile(target.absolute, bytes, { flag: 'wx' })

  return { storagePath, sizeBytes: bytes.length, contentHash: sha256Hex(bytes) }
}

export class UploadTooLargeError extends Error {
  constructor(
    readonly sizeBytes: number,
    readonly limitBytes: number
  ) {
    super(`Tệp ${sizeBytes} byte vượt hạn mức ${limitBytes} byte`)
    this.name = 'UploadTooLargeError'
  }
}

export type OpenedFile = { absolute: string; sizeBytes: number; stream: Readable }

/**
 * Mở tệp để phục vụ. Trả về stream, không phải Buffer: một PDF 30 MiB nhân với mấy chục lượt tải
 * đồng thời là đủ để giết tiến trình Node.
 */
export async function openArtifactFile(relative: string): Promise<OpenedFile> {
  const safe = safeStoragePath(relative, storageRoot())
  if (!safe.ok) throw new Error(`Từ chối đọc: ${safe.reason}`)

  const info = await stat(safe.absolute)
  if (!info.isFile()) throw new Error('Từ chối đọc: đích không phải tệp thường')

  return {
    absolute: safe.absolute,
    sizeBytes: info.size,
    stream: createReadStream(safe.absolute),
  }
}

/**
 * Xoá tệp. Dùng ở đường rollback của `POST /api/artifacts` — transaction DB rollback được, tệp
 * trên đĩa thì không, nên phải xoá tay. Tệp không tồn tại không phải lỗi: rollback có thể chạy
 * trước khi kịp ghi.
 */
export async function deleteArtifactFile(relative: string): Promise<void> {
  const safe = safeStoragePath(relative, storageRoot())
  if (!safe.ok) throw new Error(`Từ chối xoá: ${safe.reason}`)
  await rm(safe.absolute, { force: true })
}
