import 'server-only'

import { getServiceClient } from '@/infrastructure/database/supabase/server'
import { logger } from '@/infrastructure/logging/logger'
import type { DateRange } from '@/core/helpers/admin-stats/date-series'

const log = logger.child({ module: 'admin-artifacts' })

export const ARTIFACT_SORT_FIELDS = ['total_visits', 'unique_visits', 'created_at', 'name'] as const
export type ArtifactSortField = (typeof ARTIFACT_SORT_FIELDS)[number]

/** Sắp theo lượt truy cập thì phải gộp xong mới sắp được — xem ghi chú ở `listArtifacts`. */
const VISIT_SORT_FIELDS: ArtifactSortField[] = ['total_visits', 'unique_visits']

export type ArtifactWithVisitCounts = {
  id: string
  name: string | null
  status: string
  kind: string
  content_type: string | null
  serve_token: string
  /** `null` khi `NEXT_PUBLIC_APP_BASE_URL` chưa cấu hình — xem `buildServeUrl`. */
  serve_url: string | null
  touch_point_id: string | null
  created_at: string
  organization_id: string
  organization_name: string | null
  user_id: string | null
  user_email: string | null
  user_name: string | null
  total_visits: number
  unique_visits: number
}

export type ListArtifactsParams = {
  page: number
  limit: number
  organizationId?: string
  search?: string
  sortBy: ArtifactSortField
  sortOrder: 'asc' | 'desc'
  range?: DateRange
  /**
   * Người gọi CÓ gửi `start_date`/`end_date` nhưng không parse được — xem ghi chú ở
   * `artifact-query.ts`. Service không dùng cờ này; route đọc nó để ghi log. Tồn tại để lỗi im
   * lặng (bộ lọc ngày bị bỏ qua) trở thành thứ tra được, trước khi siết thành 400.
   */
  dateParamsRejected?: boolean
}

/**
 * Chỉ lấy base từ cấu hình, **không bao giờ** từ `Host` của request — giữ nguyên tính chất mà
 * `artifact.service.ts` đã nêu: một header do client điều khiển không được chui vào chuỗi mà ta
 * in ra QR.
 *
 * Khác bản ở đó một điểm: thiếu env thì trả `null` chứ **không ném**. Bản kia ném là đúng, vì nó
 * đang *tạo* ra link để lưu lại. Ở đây ta chỉ *liệt kê*, và làm sập cả trang admin vì một env
 * thiếu là đổi một ô trống lấy một trang trắng.
 */
const buildServeUrl = (serveToken: string): string | null => {
  const base = (process.env.NEXT_PUBLIC_APP_BASE_URL ?? '').replace(/\/+$/, '')
  return base ? `${base}/a/${serveToken}` : null
}

type ArtifactRow = {
  id: string
  name: string | null
  status: string
  kind: string
  content_type: string | null
  serve_token: string
  touch_point_id: string | null
  created_at: string
  organization_id: string
  user_id: string | null
  organizations: { name: string | null } | { name: string | null }[] | null
}

type Profile = { email: string | null; name: string | null; display_name: string | null }

/** PostgREST trả quan hệ một-một khi thì object khi thì mảng, tuỳ schema cache. Nhận cả hai. */
const one = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value

/**
 * `organizations` nhúng được vì có khoá ngoại thật (`artifacts_organization_id_fkey`).
 *
 * ⚠ `profiles` thì **KHÔNG**: `artifacts.user_id` là một cột uuid trần, không có khoá ngoại nào
 * tới `profiles` (`pg_get_constraintdef` trên `artifacts` chỉ ra hai FK: `organizations` và
 * `touch_points`). Viết `profiles ( … )` vào đây thì PostgREST trả **PGRST200** và cả endpoint
 * 500 — SQL thô join được, PostgREST thì phải có FK mới lần ra quan hệ. Nên hồ sơ người dùng lấy
 * bằng một lượt truy vấn riêng ở `fetchProfiles`.
 */
const SELECT = `
  id, name, status, kind, content_type, serve_token, touch_point_id, created_at,
  organization_id, user_id,
  organizations ( name )
`

const applyFilters = (query: any, p: ListArtifactsParams) => {
  if (p.organizationId) query = query.eq('organization_id', p.organizationId)
  if (p.search?.trim()) query = query.ilike('name', `%${p.search.trim()}%`)
  if (p.range) {
    // Nửa mở, KHÔNG `BETWEEN`: `to` là ngày trần nên `BETWEEN` dừng ở nửa đêm và mất cả ngày cuối.
    query = query.gte('created_at', p.range.from).lt('created_at', p.range.toExclusive)
  }
  return query
}

/**
 * Lượt truy cập lấy từ VIEW `visits_by_tp`, khớp theo **`touch_point_id`** chứ không theo id của
 * artifact.
 *
 * Đây là chỗ dễ sai nhất và sai thì ra **0 hết**: mỗi artifact sinh kèm một `touch_points` với
 * `content_type='ARTIFACT'`, và `visits` ghi theo `tp_id` của touch point đó. Artifact id không
 * xuất hiện trong `visits`.
 *
 * ⚠ View này **không lọc `is_bot`** (đọc `pg_get_viewdef`: `count(*)` và `count(distinct fp)` trên
 * toàn bộ `visits`). Giữ nguyên là có chủ đích — trang Touch Point Performance dùng **cùng** view,
 * nên lọc bot ở đây sẽ làm hai trang cho hai số khác nhau cho cùng một nội dung.
 */
const fetchVisitCounts = async (touchPointIds: string[]) => {
  const counts = new Map<string, { total: number; fp: number }>()
  if (touchPointIds.length === 0) return counts

  const supabase = getServiceClient()
  // Chia lô: `in()` nhồi hết id vào URL, và PostgREST có trần độ dài.
  const CHUNK = 200
  for (let i = 0; i < touchPointIds.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('visits_by_tp')
      .select('tp_id, total, fp')
      .in('tp_id', touchPointIds.slice(i, i + CHUNK))
    if (error) throw error
    for (const row of data ?? []) {
      counts.set(row.tp_id as string, { total: Number(row.total), fp: Number(row.fp) })
    }
  }
  return counts
}

/** Hồ sơ người tạo, tra riêng vì không có khoá ngoại để PostgREST nhúng. */
const fetchProfiles = async (userIds: string[]) => {
  const out = new Map<string, Profile>()
  if (userIds.length === 0) return out

  const supabase = getServiceClient()
  const CHUNK = 200
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, display_name')
      .in('id', userIds.slice(i, i + CHUNK))
    if (error) throw error
    for (const row of data ?? []) {
      out.set(row.id as string, {
        email: row.email ?? null,
        name: row.name ?? null,
        display_name: row.display_name ?? null,
      })
    }
  }
  return out
}

const toRow = (
  r: ArtifactRow,
  counts: Map<string, { total: number; fp: number }>,
  profiles: Map<string, Profile>
): ArtifactWithVisitCounts => {
  const org = one(r.organizations)
  const profile = r.user_id ? profiles.get(r.user_id) : undefined
  const visit = r.touch_point_id ? counts.get(r.touch_point_id) : undefined
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    kind: r.kind,
    content_type: r.content_type,
    serve_token: r.serve_token,
    serve_url: buildServeUrl(r.serve_token),
    touch_point_id: r.touch_point_id,
    created_at: r.created_at,
    organization_id: r.organization_id,
    organization_name: org?.name ?? null,
    user_id: r.user_id,
    user_email: profile?.email ?? null,
    user_name: profile?.display_name?.trim() || profile?.name || null,
    // Artifact chưa ai xem thì KHÔNG có hàng trong view — thiếu `?? 0` là `undefined` lọt ra API.
    total_visits: visit?.total ?? 0,
    unique_visits: visit?.fp ?? 0,
  }
}

/**
 * Trần số hàng nạp về khi sắp theo lượt truy cập.
 *
 * Hôm nay prod có 13 artifact và LiHi 68, nên con số này còn rất xa. Nó tồn tại để ngày nào đó
 * vượt thì **biết**, thay vì âm thầm sắp sai trên một phần dữ liệu.
 */
const VISIT_SORT_MAX_ROWS = 5000

export const listArtifacts = async (p: ListArtifactsParams) => {
  const supabase = getServiceClient()
  const ascending = p.sortOrder === 'asc'
  const offset = (p.page - 1) * p.limit

  /**
   * Hai đường, vì `visits_by_tp` là bảng KHÁC và PostgREST không sắp được hàng cha theo cột của
   * quan hệ nhúng.
   *
   * - Sắp theo `created_at`/`name`: cột nằm ngay trên `artifacts`, nên sắp và phân trang **trong
   *   SQL**, rồi chỉ lấy lượt truy cập cho đúng một trang. Đúng ở mọi quy mô.
   * - Sắp theo lượt truy cập: phải gộp xong mới biết thứ tự, nên nạp tập đã lọc rồi sắp và phân
   *   trang trong bộ nhớ.
   *
   * Tách hai đường để rủi ro quy mô chỉ nằm ở đường thứ hai, chứ không dính cả endpoint.
   */
  if (!VISIT_SORT_FIELDS.includes(p.sortBy)) {
    let query = applyFilters(supabase.from('artifacts').select(SELECT, { count: 'exact' }), p)
    query = query.order(p.sortBy, { ascending }).range(offset, offset + p.limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    const rows = (data ?? []) as unknown as ArtifactRow[]
    const [counts, profiles] = await Promise.all([
      fetchVisitCounts(rows.map((r) => r.touch_point_id).filter((v): v is string => Boolean(v))),
      fetchProfiles(rows.map((r) => r.user_id).filter((v): v is string => Boolean(v))),
    ])
    return { data: rows.map((r) => toRow(r, counts, profiles)), total: count ?? 0 }
  }

  let query = applyFilters(supabase.from('artifacts').select(SELECT, { count: 'exact' }), p)
  query = query.order('created_at', { ascending: false }).range(0, VISIT_SORT_MAX_ROWS - 1)

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as ArtifactRow[]
  if ((count ?? 0) > VISIT_SORT_MAX_ROWS) {
    log.warn(
      { total: count, cap: VISIT_SORT_MAX_ROWS, sortBy: p.sortBy },
      'visit-sorted listing exceeded in-memory cap; ranking covers newest rows only'
    )
  }

  const [counts, profiles] = await Promise.all([
    fetchVisitCounts(rows.map((r) => r.touch_point_id).filter((v): v is string => Boolean(v))),
    fetchProfiles(rows.map((r) => r.user_id).filter((v): v is string => Boolean(v))),
  ])

  const key = p.sortBy === 'total_visits' ? 'total_visits' : 'unique_visits'
  const all = rows.map((r) => toRow(r, counts, profiles))
  all.sort((a, b) => {
    const diff = a[key] - b[key]
    // Hoà thì xếp theo ngày tạo mới nhất trước: thiếu mốc phụ, thứ tự giữa các hàng cùng 0 lượt
    // đổi ngẫu nhiên giữa hai lần tải và trang trông như nhảy.
    if (diff !== 0) return ascending ? diff : -diff
    return b.created_at.localeCompare(a.created_at)
  })

  return { data: all.slice(offset, offset + p.limit), total: count ?? 0 }
}
