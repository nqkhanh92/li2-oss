import 'server-only'
import { customAlphabet } from 'nanoid'
import { query, queryOne } from '@/lib/db'
import { checkDestination } from '@/lib/links/destination'

/**
 * Nghiệp vụ link. KHÔNG import React ở đây — file này được gọi từ route handler, và một import
 * React vô tình sẽ kéo cả cây client vào bundle server.
 *
 * Chia hai nửa có chủ ý:
 *  - Nửa THUẦN (`normalizeSlug`, `generateSlug`, `prepareCreate`) không chạm DB, test được bằng
 *    vitest mà không cần Postgres.
 *  - Nửa chạm DB chỉ còn là câu SQL. Lỗi nghiệp vụ đã bị nửa thuần bắt trước đó.
 */

/**
 * Cùng một regex với CHECK constraint ở `db/schema.sql:44`.
 *
 * Phải khớp đúng, không phải "gần đúng": lỏng hơn schema thì ứng dụng nhận slug mà DB từ chối,
 * và người dùng thấy một lỗi Postgres thô. Chặt hơn schema thì có slug hợp lệ bị ứng dụng loại.
 * Khi sửa một bên, sửa cả hai.
 */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/

/**
 * Bảng chữ cho slug sinh tự động: chữ thường + chữ số.
 *
 * Không có `_` và `-` dù regex cho phép, vì ký tự đầu không được là chúng — loại hẳn khỏi bảng
 * chữ đơn giản hơn là sinh rồi kiểm rồi sinh lại. Và slug phải đọc được qua điện thoại.
 */
const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SLUG_LENGTH = 7
const nanoSlug = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH)

export function generateSlug(): string {
  return nanoSlug()
}

/** Chuẩn hoá slug người dùng đặt. Chữ thường vì schema chỉ nhận chữ thường. */
export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}

export type LinkRow = {
  id: string
  slug: string
  kind: 'redirect' | 'artifact'
  destination: string | null
  title: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LinkListItem = LinkRow & { visit_count: number }

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string }

export type CreateLinkInput = {
  slug?: string | null
  destination: string
  title?: string | null
  createdBy: string
}

type PreparedCreate = { slug: string; destination: string; title: string | null }

/**
 * Phần thuần của `createLink`: chuẩn hoá + validate, không chạm DB.
 *
 * `checkDestination` được gọi ở đây thay vì tự viết lại phép kiểm URL. Lý do nằm trong comment
 * của chính nó: guard viết tay kiểu `startsWith('/') && !startsWith('//')` để lọt `/\evil.com`,
 * và bản thương mại đã có đúng lỗ đó ở production.
 */
export function prepareCreate(input: CreateLinkInput): ServiceResult<PreparedCreate> {
  const destination = checkDestination(input.destination)
  if (!destination.ok) return { ok: false, error: destination.reason }

  let slug: string
  if (input.slug && input.slug.trim().length > 0) {
    slug = normalizeSlug(input.slug)
    if (!isValidSlug(slug)) {
      return {
        ok: false,
        error:
          'Slug chỉ gồm chữ thường, chữ số, gạch dưới và gạch nối; ' +
          'bắt đầu bằng chữ hoặc số; dài 1–64 ký tự.',
      }
    }
  } else {
    slug = generateSlug()
  }

  const title = input.title?.trim() || null

  return { ok: true, data: { slug, destination: destination.normalized, title } }
}

/** Mã lỗi Postgres cho vi phạm UNIQUE. Bắt nó để không trả error thô của `pg` ra ngoài. */
const PG_UNIQUE_VIOLATION = '23505'

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === PG_UNIQUE_VIOLATION
}

export async function createLink(input: CreateLinkInput): Promise<ServiceResult<LinkRow>> {
  const prepared = prepareCreate(input)
  if (!prepared.ok) return prepared

  const { slug, destination, title } = prepared.data

  try {
    const row = await queryOne<LinkRow>(
      `INSERT INTO links (slug, kind, destination, title, created_by)
       VALUES ($1, 'redirect', $2, $3, $4)
       RETURNING id, slug, kind, destination, title, is_active, created_at, updated_at`,
      [slug, destination, title, input.createdBy]
    )
    if (!row) return { ok: false, error: 'Không tạo được link.' }
    return { ok: true, data: row }
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Thông điệp cho người dùng, không phải thông điệp của Postgres. Trả nguyên error của `pg`
      // ra ngoài là rò tên bảng, tên constraint và cả câu SQL.
      return { ok: false, error: `Slug "${slug}" đã có người dùng. Chọn slug khác.` }
    }
    throw error
  }
}

export async function listLinks({
  limit = 50,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<LinkListItem[]> {
  // LEFT JOIN, không INNER: `link_stats` chỉ có hàng sau lượt truy cập ĐẦU TIÊN (xem
  // `record_visit` ở schema.sql). INNER JOIN sẽ làm link chưa ai click biến mất khỏi danh sách.
  //
  // `::int` không phải để làm đẹp: `pg` trả `bigint` thành CHUỖI (vì nó không lọt vào Number an
  // toàn), nên không cast thì `visit_count` là "12" và mọi phép cộng trong UI thành nối chuỗi.
  return query<LinkListItem>(
    `SELECT l.id, l.slug, l.kind, l.destination, l.title, l.is_active,
            l.created_at, l.updated_at,
            COALESCE(s.visit_count, 0)::int AS visit_count
       FROM links l
       LEFT JOIN link_stats s ON s.link_id = l.id
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
}

export async function getLink(id: string): Promise<LinkRow | null> {
  return queryOne<LinkRow>(
    `SELECT id, slug, kind, destination, title, is_active, created_at, updated_at
       FROM links WHERE id = $1`,
    [id]
  )
}

export type UpdateLinkInput = {
  destination?: string
  title?: string | null
  isActive?: boolean
}

export type PreparedUpdate = {
  destination?: string
  title?: string | null
  isActive?: boolean
}

/** Phần thuần của `updateLink`. Trả về đúng những trường được phép ghi, đã chuẩn hoá. */
export function prepareUpdate(input: UpdateLinkInput): ServiceResult<PreparedUpdate> {
  const prepared: PreparedUpdate = {}

  if (input.destination !== undefined) {
    const checked = checkDestination(input.destination)
    if (!checked.ok) return { ok: false, error: checked.reason }
    prepared.destination = checked.normalized
  }

  if (input.title !== undefined) prepared.title = input.title?.trim() || null
  if (input.isActive !== undefined) prepared.isActive = input.isActive

  if (Object.keys(prepared).length === 0) return { ok: false, error: 'Không có gì để cập nhật.' }

  // Slug KHÔNG sửa được qua đây theo chủ ý: đổi slug làm mọi QR đã in trỏ vào hư không. Cần đổi
  // thì tạo link mới rồi tắt link cũ — việc đó hiện rõ cái mất, còn một lần UPDATE thì không.
  return { ok: true, data: prepared }
}

export async function updateLink(
  id: string,
  input: UpdateLinkInput
): Promise<ServiceResult<LinkRow>> {
  const prepared = prepareUpdate(input)
  if (!prepared.ok) return prepared

  // Dựng SET động nhưng tên cột là hằng trong code, giá trị luôn là tham số $n — không nối
  // dữ liệu người dùng vào câu SQL ở bất kỳ nhánh nào.
  const sets: string[] = []
  const values: unknown[] = []

  if (prepared.data.destination !== undefined) {
    sets.push(`destination = $${values.push(prepared.data.destination)}`)
  }
  if (prepared.data.title !== undefined) {
    sets.push(`title = $${values.push(prepared.data.title)}`)
  }
  if (prepared.data.isActive !== undefined) {
    sets.push(`is_active = $${values.push(prepared.data.isActive)}`)
  }

  const row = await queryOne<LinkRow>(
    `UPDATE links SET ${sets.join(', ')} WHERE id = $${values.push(id)}
     RETURNING id, slug, kind, destination, title, is_active, created_at, updated_at`,
    values
  )

  if (!row) return { ok: false, error: 'Không tìm thấy link.' }
  return { ok: true, data: row }
}

/**
 * Tắt link. KHÔNG `DELETE`, và đây là lựa chọn có giá:
 *
 *  - QR đã in không thu hồi được. Xoá hàng làm mã đã dán trên tờ rơi trả 404 không giải thích;
 *    tắt nó cho một trang "link đã tắt" nói được.
 *  - `visits.link_id` có `ON DELETE CASCADE` (schema.sql:93). Xoá một link là xoá sạch thống kê
 *    của nó — không khôi phục được, và người bấm nút "xoá" không hề biết điều đó.
 *
 * Nên `DELETE /api/links/<id>` ở tầng HTTP cũng chỉ gọi hàm này.
 */
export async function deactivateLink(id: string): Promise<ServiceResult<LinkRow>> {
  const row = await queryOne<LinkRow>(
    `UPDATE links SET is_active = false WHERE id = $1
     RETURNING id, slug, kind, destination, title, is_active, created_at, updated_at`,
    [id]
  )
  if (!row) return { ok: false, error: 'Không tìm thấy link.' }
  return { ok: true, data: row }
}

export async function activateLink(id: string): Promise<ServiceResult<LinkRow>> {
  const row = await queryOne<LinkRow>(
    `UPDATE links SET is_active = true WHERE id = $1
     RETURNING id, slug, kind, destination, title, is_active, created_at, updated_at`,
    [id]
  )
  if (!row) return { ok: false, error: 'Không tìm thấy link.' }
  return { ok: true, data: row }
}

/** Địa chỉ công khai của một slug. Lấy từ env, không hard-code domain nào. */
export function publicUrl(slug: string): string {
  const base = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/+$/, '')}/${slug}`
}
