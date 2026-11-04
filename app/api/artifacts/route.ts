import { NextRequest, NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import { connect } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { checkUpload, sanitizeOriginalName } from '@/lib/artifacts/mime'
import {
  deleteArtifactFile,
  maxUploadBytes,
  saveArtifactFile,
  UploadTooLargeError,
} from '@/lib/artifacts/storage'
import { publicLinkUrl } from '@/lib/qr/generate'

/**
 * `POST /api/artifacts` — nhận multipart, tạo `links` + `artifacts` trong MỘT transaction.
 *
 * Giữ đúng thiết kế của bản gốc (ADR-001 §"Cái KHÔNG đổi"): **artifact xuất bản bằng cách tạo một
 * link.** Quan hệ `artifacts.link_id` là UNIQUE, 1-1. Không có artifact `live` nào mà không có địa
 * chỉ công khai, và không có link `kind='artifact'` nào mà không có nội dung.
 *
 * Vì sao phải là transaction: hai lần INSERT rời nhau, nếu cái thứ hai lỗi, để lại một hàng `links`
 * trỏ vào hư không — và `/<slug>` của nó rewrite sang `/a/<slug>`, nơi JOIN không ra hàng nào, nên
 * trả 404. Một slug chiếm chỗ vĩnh viễn mà không ai gỡ được qua UI. Transaction xoá cả lớp lỗi đó.
 *
 * Trường form:
 *   file      (bắt buộc) — tệp
 *   slug      (tuỳ chọn) — không đặt thì sinh ngẫu nhiên
 *   title     (tuỳ chọn)
 *   expires_at(tuỳ chọn) — ISO 8601, phải ở tương lai
 *   status    (tuỳ chọn) — 'live' (mặc định) hoặc 'draft'
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Giống CHECK constraint của `links.slug` trong `db/schema.sql`. Lệch là 500 thay vì 400. */
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

/**
 * Bảng chữ cho slug sinh tự động: chữ thường + số, không có `-`/`_`.
 *
 * nanoid mặc định dùng cả chữ hoa và `-`/`_`, cả hai đều vi phạm CHECK của schema (slug phải chữ
 * thường, và ký tự ĐẦU không được là `-`/`_`). Bỏ chúng ở đây rẻ hơn là sinh rồi lọc rồi sinh lại.
 */
const randomSlug = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8)

/** Số lần thử lại khi slug sinh ra trùng. Với 36^8 khả năng thì 5 lần là quá đủ. */
const MAX_SLUG_ATTEMPTS = 5

const PG_UNIQUE_VIOLATION = '23505'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return json({ error: 'Cần đăng nhập' }, 401)

  const limit = maxUploadBytes()

  // Kiểm `content-length` TRƯỚC khi gọi `formData()`: hàm đó nạp toàn bộ body vào bộ nhớ, nên để
  // nó đọc xong 2 GB rồi mới báo "quá lớn" là tự mở một đường làm hết RAM. Header này client đặt
  // nên không tin được một mình — hạn mức thật vẫn được kiểm lại sau khi có bytes.
  const declaredLength = Number.parseInt(request.headers.get('content-length') ?? '', 10)
  if (Number.isFinite(declaredLength) && declaredLength > limit + 64 * 1024) {
    return json({ error: `Body vượt hạn mức ${limit} byte` }, 413)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Body không phải multipart/form-data hợp lệ' }, 400)
  }

  const file = form.get('file')
  if (!(file instanceof File)) return json({ error: 'Thiếu trường `file`' }, 400)

  const bytes = new Uint8Array(await file.arrayBuffer())

  const check = checkUpload({
    bytes,
    originalName: file.name,
    declaredType: file.type,
  })
  if (!check.ok) return json({ error: check.reason }, 400)

  const requestedSlug = textField(form, 'slug')
  if (requestedSlug && !SLUG_RE.test(requestedSlug)) {
    return json(
      {
        error:
          'Slug không hợp lệ. Chỉ chữ thường, số, `-` và `_`; dài 1..64; ký tự đầu là chữ hoặc số.',
      },
      400
    )
  }

  const expiresAt = textField(form, 'expires_at')
  if (expiresAt !== null) {
    const parsed = Date.parse(expiresAt)
    if (!Number.isFinite(parsed)) return json({ error: '`expires_at` không phải ISO 8601' }, 400)
    if (parsed <= Date.now()) return json({ error: '`expires_at` phải ở tương lai' }, 400)
  }

  const statusField = textField(form, 'status')
  if (statusField !== null && statusField !== 'live' && statusField !== 'draft') {
    return json({ error: '`status` chỉ nhận `live` hoặc `draft`' }, 400)
  }
  const status = statusField ?? 'live'

  // Ghi tệp TRƯỚC transaction: cần `storage_path` và `content_hash` để INSERT, và giữ transaction
  // mở trong lúc ghi 30 MiB ra đĩa là giữ một connection Postgres nhàn rỗi suốt thời gian I/O.
  // Đánh đổi: tệp có thể thành rác nếu DB lỗi — nên mọi nhánh lỗi dưới đây đều xoá nó.
  let saved
  try {
    saved = await saveArtifactFile(bytes, check.ext, limit)
  } catch (err) {
    if (err instanceof UploadTooLargeError) {
      return json({ error: err.message }, 413)
    }
    throw err
  }

  try {
    const created = await insertArtifact({
      slug: requestedSlug,
      title: textField(form, 'title'),
      status,
      expiresAt,
      originalName: sanitizeOriginalName(file.name),
      mime: check.mime,
      storagePath: saved.storagePath,
      sizeBytes: saved.sizeBytes,
      contentHash: saved.contentHash,
      userId: user.id,
    })

    return json(
      {
        artifact: created,
        // Tiện cho client: khỏi phải tự nối URL và tự biết `PUBLIC_BASE_URL`.
        public_url: safePublicUrl(created.slug),
        qr_url: `/api/qr/${created.slug}`,
      },
      201
    )
  } catch (err) {
    // Transaction đã ROLLBACK (xem `insertArtifact`), nhưng tệp trên đĩa thì không có rollback.
    // Không xoá ở đây là để lại một tệp không hàng DB nào trỏ tới — rác không ai tìm lại được.
    await deleteArtifactFile(saved.storagePath).catch(() => {})

    if (err instanceof SlugTakenError) return json({ error: err.message }, 409)
    throw err
  }
}

class SlugTakenError extends Error {}

type InsertInput = {
  slug: string | null
  title: string | null
  status: 'live' | 'draft'
  expiresAt: string | null
  originalName: string
  mime: string
  storagePath: string
  sizeBytes: number
  contentHash: string
  userId: string
}

type CreatedArtifact = {
  id: string
  link_id: string
  slug: string
  status: string
  mime_type: string
  size_bytes: number
  original_name: string
  expires_at: string | null
}

/**
 * Hai lần INSERT trong một transaction, trên cùng một connection lấy từ `pool.connect()`.
 *
 * Phải là cùng connection: `dbPool().query()` chọn connection bất kỳ mỗi lần gọi, nên `BEGIN` gửi qua
 * `pool.query` rồi INSERT qua `pool.query` có thể rơi vào hai connection khác nhau — lúc đó `BEGIN`
 * mở một transaction rỗng rồi bỏ đó, và hai INSERT chạy autocommit. Một bug không báo lỗi gì.
 */
async function insertArtifact(input: InsertInput): Promise<CreatedArtifact> {
  const attempts = input.slug ? 1 : MAX_SLUG_ATTEMPTS

  for (let attempt = 0; attempt < attempts; attempt++) {
    const slug = input.slug ?? randomSlug()
    const client = await connect()

    try {
      await client.query('BEGIN')

      const link = await client.query<{ id: string }>(
        `INSERT INTO links (slug, kind, destination, title, created_by)
         VALUES ($1, 'artifact', NULL, $2, $3)
         RETURNING id`,
        [slug, input.title, input.userId]
      )
      // `noUncheckedIndexedAccess` bật, và `RETURNING id` sau một INSERT một hàng thì luôn có hàng
      // — nhưng nói ra bằng một lỗi rõ ràng vẫn hơn là để `undefined` chui vào tham số tiếp theo.
      const linkId = link.rows[0]?.id
      if (!linkId) throw new Error('INSERT links không trả về id')

      const artifact = await client.query<CreatedArtifact>(
        `INSERT INTO artifacts
           (link_id, status, storage_path, original_name, mime_type, size_bytes,
            content_hash, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, link_id, status, mime_type, size_bytes, original_name, expires_at`,
        [
          linkId,
          input.status,
          input.storagePath,
          input.originalName,
          input.mime,
          input.sizeBytes,
          input.contentHash,
          input.expiresAt,
          input.userId,
        ]
      )

      const row = artifact.rows[0]
      if (!row) throw new Error('INSERT artifacts không trả về hàng nào')

      await client.query('COMMIT')
      return { ...row, slug }
    } catch (err) {
      // ROLLBACK cũng có thể lỗi (connection đã đứt). Bỏ qua lỗi của nó, giữ lỗi gốc để báo lên.
      await client.query('ROLLBACK').catch(() => {})

      const isSlugTaken =
        typeof err === 'object' && err !== null && (err as { code?: string }).code === PG_UNIQUE_VIOLATION

      if (!isSlugTaken) throw err

      // Slug do người dùng đặt: báo ngay, họ cần biết để đổi. Slug do ta sinh: thử lại im lặng.
      if (input.slug) throw new SlugTakenError(`Slug \`${input.slug}\` đã có người dùng`)
    } finally {
      client.release()
    }
  }

  throw new SlugTakenError(
    `Sinh slug ngẫu nhiên trùng ${MAX_SLUG_ATTEMPTS} lần liên tiếp. Thử lại, hoặc tự đặt slug.`
  )
}

function textField(form: FormData, name: string): string | null {
  const raw = form.get(name)
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length === 0 ? null : trimmed
}

/** `PUBLIC_BASE_URL` thiếu thì chỉ mất một field tiện lợi, không đáng làm hỏng cả lần tải lên. */
function safePublicUrl(slug: string): string | null {
  try {
    return publicLinkUrl(slug)
  } catch {
    return null
  }
}

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } })
}
