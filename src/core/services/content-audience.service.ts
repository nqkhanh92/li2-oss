import { contentAudienceRepo, ContentAudienceRepository } from '@/core/repositories/content-audience.repository'
import { anonymousDeviceName } from '@/shared/lib/anonymous-identity'
import { SearchFilterPagination } from '@/shared/types'

/**
 * "Ai đã xem nội dung của tôi" — thay cho cách đọc cũ của mục Customers (khách đã mua gì).
 *
 * Hai loại thành viên của tập khán giả, và chúng KHÔNG gộp được với nhau:
 *
 * | | `kind: 'identified'` | `kind: 'device'` |
 * |---|---|---|
 * | Nguồn | `customer_profiles` + `artifact_views` | `visits` nhóm theo `fp` |
 * | Biết gì | email (họ đăng nhập Google để mở artifact) | dấu vết thiết bị, không biết là ai |
 * | Id | uuid của profile | `device:<fp>` |
 *
 * Một người vừa mở artifact bằng Google VÀ quét QR sẽ nằm ở CẢ HAI hàng, và không có cột nào
 * chứng minh đó là một người: `artifact_views` không lưu `fp`, `visits` không lưu
 * `customer_profile_id`. Service này KHÔNG đoán để gộp. `customer_profiles` có sẵn
 * `merged_into_id` / `merged_from_ids` / `merged_at` cho việc gộp về sau — vòng này không dùng.
 *
 * ⚠ `visits.user_id` là CHỦ touch point, không phải người truy cập. Đừng dùng để nhận diện khách.
 *
 * ## Vì sao gộp trong bộ nhớ
 * Nhóm `visits` theo `fp` cần `GROUP BY`, mà supabase-js không làm được nếu không có RPC — và vòng
 * này không được tạo migration. Nên: quét tối đa `VISIT_SCAN_LIMIT` lượt gần nhất rồi gộp bằng JS.
 * Khi chạm trần, `scanTruncated = true` và UI PHẢI nói rõ con số là chưa đủ, chứ không im lặng.
 */

/** Trần quét `visits`. Vượt trần thì `scanTruncated = true`; lọc "chỉ khách có email" là đường ra. */
export const VISIT_SCAN_LIMIT = 20000
/** Trần số hồ sơ có danh tính đọc một lượt. */
export const PROFILE_SCAN_LIMIT = 5000
/** Trần số lượt truy cập đọc ở trang chi tiết một thiết bị. */
export const DEVICE_VISIT_LIMIT = 500

export type AudienceKind = 'identified' | 'device'

export interface AudienceTouchPoint {
  id: string
  name: string
  short_url: string | null
}

export interface AudienceMember {
  /** uuid của profile, hoặc `device:<fp>`. */
  id: string
  kind: AudienceKind
  /** Có giá trị khi `kind === 'device'` — để UI dựng avatar từ cùng một `fp`. */
  fp: string | null
  email: string | null
  name: string | null
  external_id: string | null
  /** Email, hoặc tên thiết bị sinh từ `fp`. Server sinh để lọc theo từ khoá cũng tìm ra. */
  display_name: string
  /** Số NỘI DUNG riêng biệt đã mở. */
  content_count: number
  /** Tổng số lần mở (một nội dung mở lại nhiều lần thì cộng dồn). */
  open_count: number
  last_seen_at: string | null
  first_seen_at: string | null
  country: string | null
  touch_points: AudienceTouchPoint | null
  /** Số lượt truy cập ghi nhận được (`visits`) — chỉ có nghĩa với `kind === 'device'`. */
  visit_count: number
}

export interface AudienceListResult {
  data: AudienceMember[]
  count: number
  /** `visits` đã chạm trần quét → con số thiết bị là CHƯA ĐỦ. */
  scanTruncated: boolean
}

export interface ContentView {
  artifact_id: string
  name: string
  kind: string | null
  serve_token: string | null
  status: string | null
  open_count: number
  first_viewed_at: string | null
  last_viewed_at: string | null
}

export interface DeviceVisit {
  id: string
  created_at: string
  /** `QR` hay `LINK` — cách thiết bị tới. */
  type: string | null
  touch_point: AudienceTouchPoint | null
  /** Nội dung mở được từ touch point đó, nếu touch point là của một artifact. */
  artifact: { id: string; name: string; serve_token: string | null } | null
  country: string | null
  city: string | null
  os: string | null
  platform: string | null
  referrer: string | null
}

export interface DeviceActivity {
  fp: string
  display_name: string
  visit_count: number
  content_count: number
  open_count: number
  first_seen_at: string | null
  last_seen_at: string | null
  country: string | null
  os: string | null
  platform: string | null
  visits: DeviceVisit[]
  /** Đã chạm `DEVICE_VISIT_LIMIT` → danh sách bị cắt. */
  visitsTruncated: boolean
}

interface DeviceAccumulator {
  fp: string
  visitCount: number
  firstSeenAt: string
  lastSeenAt: string
  country: string | null
  lastTouchPointId: string | null
  artifactIds: Set<string>
  openCount: number
}

export class ContentAudienceService {
  constructor(private repo: ContentAudienceRepository) {}

  async listAudience(orgId: string, params: SearchFilterPagination): Promise<AudienceListResult> {
    const emailOnly = toBoolean(params?.filters?.emailOnly)
    const countries = asStringArray(params?.filters?.countries)
    const search = params?.search?.trim().toLowerCase() || ''

    const identified = await this.buildIdentifiedMembers(orgId)
    const { devices, scanTruncated } = emailOnly
      ? { devices: [] as AudienceMember[], scanTruncated: false }
      : await this.buildDeviceMembers(orgId)

    let members = [...identified, ...devices]

    if (countries.length > 0) {
      members = members.filter((m) => m.country && countries.includes(m.country))
    }
    if (search) {
      members = members.filter((m) =>
        [m.display_name, m.email, m.name, m.external_id, m.fp]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      )
    }

    members.sort(compareBy(params?.sorting?.[0]))

    const pageSize = Number(params?.pagination?.pageSize) || members.length || 1
    const pageIndex = Number(params?.pagination?.pageIndex) || 0
    const from = pageIndex * pageSize

    return {
      data: members.slice(from, from + pageSize),
      count: members.length,
      scanTruncated,
    }
  }

  /**
   * Quốc gia cho ô lọc. Chỉ thiết bị có quốc gia — xem chú thích `country` ở
   * `buildIdentifiedMembers`. Cách cũ (`conversion.service.getCustomerCountries`) đi qua
   * `first_click_id`, cột rỗng ở mọi hàng trên LiHi, nên ô lọc đó luôn trống.
   */
  async getAudienceCountries(orgId: string): Promise<{ country: string; count: number }[]> {
    const { devices } = await this.buildDeviceMembers(orgId)
    const counts = new Map<string, number>()
    for (const device of devices) {
      if (!device.country) continue
      counts.set(device.country, (counts.get(device.country) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
  }

  private async buildIdentifiedMembers(orgId: string): Promise<AudienceMember[]> {
    const [profiles, views] = await Promise.all([
      this.repo.findProfiles(orgId, PROFILE_SCAN_LIMIT),
      this.repo.findArtifactViews(orgId),
    ])

    const byProfile = new Map<
      string,
      { artifacts: Set<string>; opens: number; first: string | null; last: string | null }
    >()
    for (const view of views) {
      if (!view.customer_profile_id) continue
      const entry =
        byProfile.get(view.customer_profile_id) ??
        { artifacts: new Set<string>(), opens: 0, first: null, last: null }
      entry.artifacts.add(view.artifact_id)
      entry.opens += Number(view.view_count ?? 0)
      entry.first = minDate(entry.first, view.first_viewed_at)
      entry.last = maxDate(entry.last, view.last_viewed_at)
      byProfile.set(view.customer_profile_id, entry)
    }

    return profiles.map((profile: any) => {
      const viewStats = byProfile.get(profile.id)
      return {
        id: profile.id,
        kind: 'identified' as const,
        fp: null,
        email: profile.email ?? null,
        name: profile.name ?? null,
        external_id: profile.external_id ?? null,
        display_name: profile.name || profile.email || profile.external_id || profile.id,
        content_count: viewStats?.artifacts.size ?? 0,
        open_count: viewStats?.opens ?? 0,
        last_seen_at: maxDate(viewStats?.last ?? null, profile.last_visit_at),
        first_seen_at: minDate(viewStats?.first ?? null, profile.created_at),
        // Không có cột nào nối `customer_profiles` với `visits` (xem chú thích đầu file), nên
        // người mở artifact bằng Google KHÔNG có quốc gia. Để `null` chứ không đoán.
        country: null,
        touch_points: firstTouchPoint(profile.touch_points),
        visit_count: Number(profile.visit_count ?? 0),
      }
    })
  }

  private async buildDeviceMembers(
    orgId: string
  ): Promise<{ devices: AudienceMember[]; scanTruncated: boolean }> {
    const visits = await this.repo.findVisits(orgId, VISIT_SCAN_LIMIT)
    if (visits.length === 0) return { devices: [], scanTruncated: false }

    const touchPointIds = [...new Set(visits.map((v) => v.tp_id).filter(Boolean) as string[])]
    const [artifacts, touchPoints] = await Promise.all([
      this.repo.findArtifactsByTouchPoints(orgId, touchPointIds),
      this.repo.findTouchPointsByIds(orgId, touchPointIds),
    ])

    const artifactByTouchPoint = new Map<string, { id: string; name: string }>()
    for (const artifact of artifacts) {
      if (artifact.touch_point_id) {
        artifactByTouchPoint.set(artifact.touch_point_id, {
          id: artifact.id,
          name: artifact.name,
        })
      }
    }
    const touchPointById = new Map(touchPoints.map((tp) => [tp.id, tp]))

    const accumulators = new Map<string, DeviceAccumulator>()
    for (const visit of visits) {
      const fp = visit.fp
      if (!fp) continue
      const entry = accumulators.get(fp)
      if (!entry) {
        accumulators.set(fp, {
          fp,
          visitCount: 1,
          firstSeenAt: visit.created_at,
          lastSeenAt: visit.created_at,
          country: visit.country ?? null,
          lastTouchPointId: visit.tp_id ?? null,
          artifactIds: new Set(collectArtifactId(artifactByTouchPoint, visit.tp_id)),
          openCount: artifactByTouchPoint.has(visit.tp_id ?? '') ? 1 : 0,
        })
        continue
      }
      entry.visitCount += 1
      entry.firstSeenAt = minDate(entry.firstSeenAt, visit.created_at) ?? entry.firstSeenAt
      entry.lastSeenAt = maxDate(entry.lastSeenAt, visit.created_at) ?? entry.lastSeenAt
      if (!entry.country && visit.country) entry.country = visit.country
      const artifact = visit.tp_id ? artifactByTouchPoint.get(visit.tp_id) : undefined
      if (artifact) {
        entry.artifactIds.add(artifact.id)
        entry.openCount += 1
      }
    }

    const devices = [...accumulators.values()].map((entry) => {
      const touchPoint = entry.lastTouchPointId
        ? touchPointById.get(entry.lastTouchPointId)
        : undefined
      return {
        id: `device:${entry.fp}`,
        kind: 'device' as const,
        fp: entry.fp,
        email: null,
        name: null,
        external_id: null,
        display_name: anonymousDeviceName(entry.fp),
        content_count: entry.artifactIds.size,
        open_count: entry.openCount,
        last_seen_at: entry.lastSeenAt,
        first_seen_at: entry.firstSeenAt,
        country: entry.country,
        touch_points: touchPoint
          ? { id: touchPoint.id, name: touchPoint.name, short_url: touchPoint.short_url }
          : null,
        visit_count: entry.visitCount,
      }
    })

    return { devices, scanTruncated: visits.length >= VISIT_SCAN_LIMIT }
  }

  /** Nội dung một khách có email đã mở. `null` khi hồ sơ không thuộc tổ chức này. */
  async getContentViews(orgId: string, profileId: string): Promise<ContentView[] | null> {
    const profile = await this.repo.findProfileById(orgId, profileId)
    if (!profile) return null

    const rows = await this.repo.findArtifactViewsByProfile(orgId, profileId)
    return rows.map((row: any) => ({
      artifact_id: row.artifact_id,
      name: row.artifacts?.name ?? row.artifact_id,
      kind: row.artifacts?.kind ?? null,
      serve_token: row.artifacts?.serve_token ?? null,
      status: row.artifacts?.status ?? null,
      open_count: Number(row.view_count ?? 0),
      first_viewed_at: row.first_viewed_at ?? null,
      last_viewed_at: row.last_viewed_at ?? null,
    }))
  }

  /** Lịch sử của một thiết bị ẩn danh. `null` khi `fp` này chưa có lượt nào trong tổ chức. */
  async getDeviceActivity(orgId: string, fp: string): Promise<DeviceActivity | null> {
    const visits = await this.repo.findVisitsByFp(orgId, fp, DEVICE_VISIT_LIMIT)
    if (visits.length === 0) return null

    const touchPointIds = [...new Set(visits.map((v) => v.tp_id).filter(Boolean) as string[])]
    const [artifacts, touchPoints] = await Promise.all([
      this.repo.findArtifactsByTouchPoints(orgId, touchPointIds),
      this.repo.findTouchPointsByIds(orgId, touchPointIds),
    ])

    const artifactByTouchPoint = new Map(
      artifacts
        .filter((a) => a.touch_point_id)
        .map((a) => [a.touch_point_id as string, a] as const)
    )
    const touchPointById = new Map(touchPoints.map((tp) => [tp.id, tp]))

    const artifactIds = new Set<string>()
    let openCount = 0
    const rows: DeviceVisit[] = visits.map((visit) => {
      const artifact = visit.tp_id ? artifactByTouchPoint.get(visit.tp_id) : undefined
      if (artifact) {
        artifactIds.add(artifact.id)
        openCount += 1
      }
      const touchPoint = visit.tp_id ? touchPointById.get(visit.tp_id) : undefined
      return {
        id: visit.id,
        created_at: visit.created_at,
        type: visit.type ?? null,
        touch_point: touchPoint
          ? { id: touchPoint.id, name: touchPoint.name, short_url: touchPoint.short_url }
          : null,
        artifact: artifact
          ? { id: artifact.id, name: artifact.name, serve_token: artifact.serve_token }
          : null,
        country: visit.country ?? null,
        city: visit.city ?? null,
        os: visit.os ?? null,
        platform: visit.platform ?? null,
        referrer: visit.referrer ?? null,
      }
    })

    const latest = rows[0]
    const oldest = rows[rows.length - 1]

    return {
      fp,
      display_name: anonymousDeviceName(fp),
      visit_count: rows.length,
      content_count: artifactIds.size,
      open_count: openCount,
      first_seen_at: oldest?.created_at ?? null,
      last_seen_at: latest?.created_at ?? null,
      country: rows.find((r) => r.country)?.country ?? null,
      os: rows.find((r) => r.os)?.os ?? null,
      platform: rows.find((r) => r.platform)?.platform ?? null,
      visits: rows,
      visitsTruncated: visits.length >= DEVICE_VISIT_LIMIT,
    }
  }
}

function collectArtifactId(
  artifactByTouchPoint: Map<string, { id: string }>,
  touchPointId: string | null | undefined
): string[] {
  const artifact = touchPointId ? artifactByTouchPoint.get(touchPointId) : undefined
  return artifact ? [artifact.id] : []
}

/** `sort_by` tới từ URL nên là chuỗi; chỉ nhận đúng các cột UI có cột tương ứng. */
function compareBy(sort?: { id: string; desc?: boolean }) {
  const desc = sort ? sort.desc !== false : true
  const key = sort?.id ?? 'last_seen_at'
  const direction = desc ? -1 : 1

  return (a: AudienceMember, b: AudienceMember) => {
    const left = sortValue(a, key)
    const right = sortValue(b, key)
    if (left === right) return 0
    return left < right ? -direction : direction
  }
}

function sortValue(member: AudienceMember, key: string): string | number {
  switch (key) {
    case 'content_count':
      return member.content_count
    case 'open_count':
      return member.open_count
    case 'customer':
    case 'display_name':
      return member.display_name.toLowerCase()
    case 'created_at':
    case 'first_seen_at':
      return member.first_seen_at ?? ''
    case 'last_seen_at':
    default:
      return member.last_seen_at ?? ''
  }
}

function firstTouchPoint(value: unknown): AudienceTouchPoint | null {
  const touchPoint = Array.isArray(value) ? value[0] : value
  if (!touchPoint || typeof touchPoint !== 'object') return null
  const { id, name, short_url } = touchPoint as AudienceTouchPoint
  return id ? { id, name, short_url: short_url ?? null } : null
}

function minDate(a: string | null, b: string | null | undefined): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return a < b ? a : b
}

function maxDate(a: string | null, b: string | null | undefined): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return a > b ? a : b
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value) return [value]
  return []
}

export const contentAudienceService = new ContentAudienceService(contentAudienceRepo)
