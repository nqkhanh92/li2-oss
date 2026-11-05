/**
 * Địa chỉ CÔNG KHAI của một artifact: `<ARTIFACT_LINK_URL>/<org_slug>/<slug>`, ví dụ
 * `https://artifact.li2.link/khanhqns-organization/bao-gia-q4`. Khác với `/a/<token>` (đường nội bộ
 * của app: iframe xem trước, `/file`, `/download`, form mật khẩu) và khác với short link
 * (`li2.link/<slug>`, 302 do li2-be). Không có env thì không có địa chỉ công khai → caller dùng
 * `/a/<token>` như trước.
 */
export function artifactPublicBase(): string | null {
  const base = (process.env.ARTIFACT_LINK_URL ?? '').replace(/\/+$/, '')
  return base || null
}

export function artifactPublicHost(): string | null {
  const base = artifactPublicBase()
  if (!base) return null
  try {
    return new URL(base).host
  } catch {
    return null
  }
}

/** Một đoạn slug (org hoặc artifact): chữ thường, số, gạch nối; không rỗng, không `.`/`/`. */
export const PUBLIC_SEGMENT_RE = /^[a-z0-9][a-z0-9_-]{0,127}$/i

export function artifactPublicPath(
  orgSlug: string | null | undefined,
  slug: string | null | undefined
): string | null {
  if (!orgSlug || !slug) return null
  if (!PUBLIC_SEGMENT_RE.test(orgSlug) || !PUBLIC_SEGMENT_RE.test(slug)) return null
  return `/${orgSlug}/${slug}`
}

export function artifactPublicUrl(
  orgSlug: string | null | undefined,
  slug: string | null | undefined
): string | null {
  const base = artifactPublicBase()
  const path = artifactPublicPath(orgSlug, slug)
  return base && path ? `${base}${path}` : null
}

/**
 * Slug cho địa chỉ công khai, đọc từ touch point nhúng. `touch_points.slug` chỉ được ghi khi
 * người gọi TRUYỀN slug (form UI luôn truyền); publish qua MCP không truyền thì li2-be tự cấp một
 * slug ngẫu nhiên, ghi vào bảng `slugs` và `short_url`, còn cột `slug` để NULL (đo trên LiHi
 * 20/10: `6LAA1`). Địa chỉ công khai phân giải qua bảng `slugs` nên slug đó mở được; chỉ
 * `serve_url` và nhánh 302 từ `/a/<token>` là hụt. Đoạn cuối của `short_url` chính là slug ấy.
 */
export function publicSlugOfTouchPoint(
  touchPoint: { slug?: string | null; short_url?: string | null } | null | undefined
): string | null {
  if (touchPoint?.slug) return touchPoint.slug
  const shortUrl = touchPoint?.short_url
  if (!shortUrl) return null
  const last = shortUrl.replace(/\/+$/, '').split('/').pop()
  return last || null
}
