import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tầng gộp của "ai đã xem nội dung của tôi". Repository bị thay bằng một bản giả vì những gì cần
 * chốt ở đây là PHÉP GỘP, không phải SQL: hai nguồn không nối được với nhau, và cách service xử
 * lý điều đó là phần dễ sai nhất.
 *
 * Ba tính chất phải giữ:
 * 1. Hàng thiết bị KHÔNG được mang email, và hàng có email KHÔNG được mang `fp` — gộp nhầm là
 *    nói với người dùng rằng hai danh tính là một người, điều dữ liệu không chứng minh được.
 * 2. Lọc "chỉ khách có email" bỏ sạch hàng thiết bị. Không có nó thì bảng vô dụng trên prod.
 * 3. Đọc bằng `org_id` khác thì không thấy gì — repository giả ở đây mô phỏng đúng việc lọc
 *    `organization_id`, vì service chạy trên client service-role (bỏ qua RLS).
 */

vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: { from: () => ({}) },
}))

import { ContentAudienceService, VISIT_SCAN_LIMIT } from '@/core/services/content-audience.service'
import { anonymousDeviceName } from '@/shared/lib/anonymous-identity'

const ORG = 'org-a'
const OTHER_ORG = 'org-b'
const FP_ONE = '52454703-0214-4195-a4ea-78ea7d21343f'
const FP_TWO = '10c26e30-e6b8-47bc-9999-db0cf8ecb41c'
const TP_ARTIFACT = 'tp-artifact'
const TP_PLAIN = 'tp-plain'

const profiles = [
  {
    id: 'profile-1',
    email: 'khanh.qn@gmail.com',
    name: null,
    external_id: null,
    created_at: '2026-10-06T14:35:06.947Z',
    last_visit_at: '2026-10-10T15:42:48.508Z',
    visit_count: 4,
    is_anonymous: false,
    first_touch_point_id: TP_ARTIFACT,
    touch_points: { id: TP_ARTIFACT, name: 'Artifact flow', short_url: 'https://lihi/x' },
  },
]

const artifactViews = [
  {
    artifact_id: 'artifact-1',
    customer_profile_id: 'profile-1',
    view_count: 4,
    first_viewed_at: '2026-10-06T14:35:06.928Z',
    last_viewed_at: '2026-10-10T15:42:48.508Z',
  },
  {
    artifact_id: 'artifact-2',
    customer_profile_id: 'profile-1',
    view_count: 1,
    first_viewed_at: '2026-10-20T17:17:21.544Z',
    last_viewed_at: '2026-10-20T17:17:21.544Z',
  },
]

const visits = [
  { id: 'v1', fp: FP_ONE, created_at: '2026-10-21T10:00:00Z', tp_id: TP_ARTIFACT, country: 'VN', city: 'Hanoi', os: 'iOS', platform: 'mobile', type: 'QR', referrer: null },
  { id: 'v2', fp: FP_ONE, created_at: '2026-10-20T10:00:00Z', tp_id: TP_ARTIFACT, country: 'VN', city: 'Hanoi', os: 'iOS', platform: 'mobile', type: 'LINK', referrer: null },
  { id: 'v3', fp: FP_ONE, created_at: '2026-10-19T10:00:00Z', tp_id: TP_PLAIN, country: 'VN', city: 'Hanoi', os: 'iOS', platform: 'mobile', type: 'LINK', referrer: null },
  { id: 'v4', fp: FP_TWO, created_at: '2026-10-18T10:00:00Z', tp_id: TP_PLAIN, country: 'SG', city: null, os: 'Android', platform: 'mobile', type: 'LINK', referrer: null },
]

const artifacts = [
  { id: 'artifact-1', name: 'Artifact flow', kind: 'html', serve_token: 'tok-1', status: 'published', touch_point_id: TP_ARTIFACT },
]

const touchPoints = [
  { id: TP_ARTIFACT, name: 'Artifact flow', short_url: 'https://lihi/x' },
  { id: TP_PLAIN, name: 'Plain link', short_url: 'https://lihi/y' },
]

/** Repository giả. Mọi phương thức lọc `orgId` đúng như bản thật, để test quyền có nghĩa. */
const makeRepo = (overrides: Record<string, unknown> = {}) =>
  ({
    findProfiles: vi.fn(async (orgId: string) => (orgId === ORG ? profiles : [])),
    findProfileById: vi.fn(async (orgId: string, id: string) =>
      orgId === ORG ? (profiles.find((p) => p.id === id) ?? null) : null
    ),
    findArtifactViews: vi.fn(async (orgId: string) => (orgId === ORG ? artifactViews : [])),
    findArtifactViewsByProfile: vi.fn(async (orgId: string, profileId: string) =>
      orgId === ORG
        ? artifactViews
            .filter((v) => v.customer_profile_id === profileId)
            .map((v) => ({
              ...v,
              artifacts: { id: v.artifact_id, name: `Nội dung ${v.artifact_id}`, kind: 'html', serve_token: 'tok', status: 'published' },
            }))
        : []
    ),
    findVisits: vi.fn(async (orgId: string) => (orgId === ORG ? visits : [])),
    findVisitsByFp: vi.fn(async (orgId: string, fp: string) =>
      orgId === ORG ? visits.filter((v) => v.fp === fp) : []
    ),
    findArtifactsByTouchPoints: vi.fn(async (orgId: string, ids: string[]) =>
      orgId === ORG ? artifacts.filter((a) => ids.includes(a.touch_point_id)) : []
    ),
    findTouchPointsByIds: vi.fn(async (orgId: string, ids: string[]) =>
      orgId === ORG ? touchPoints.filter((tp) => ids.includes(tp.id)) : []
    ),
    ...overrides,
  }) as any

const params = (overrides: Record<string, unknown> = {}) =>
  ({
    pagination: { pageIndex: 0, pageSize: 50 },
    sorting: [{ id: 'last_seen_at', desc: true }],
    filters: {},
    ...overrides,
  }) as any

let service: ContentAudienceService

beforeEach(() => {
  service = new ContentAudienceService(makeRepo())
})

describe('listAudience — gộp hai nguồn mà không trộn danh tính', () => {
  it('trả 1 hồ sơ có email + 2 thiết bị', async () => {
    const result = await service.listAudience(ORG, params())

    expect(result.count).toBe(3)
    expect(result.data.filter((m) => m.kind === 'identified')).toHaveLength(1)
    expect(result.data.filter((m) => m.kind === 'device')).toHaveLength(2)
  })

  it('hàng thiết bị không có email, hàng có email không có fp', async () => {
    const { data } = await service.listAudience(ORG, params())

    for (const member of data) {
      if (member.kind === 'device') {
        expect(member.email).toBeNull()
        expect(member.fp).toBeTruthy()
      } else {
        expect(member.fp).toBeNull()
        expect(member.email).toBe('khanh.qn@gmail.com')
      }
    }
  })

  it('tên thiết bị là tên sinh từ fp, giống y hàm dùng chung', async () => {
    const { data } = await service.listAudience(ORG, params())
    const device = data.find((m) => m.fp === FP_ONE)!

    expect(device.display_name).toBe(anonymousDeviceName(FP_ONE))
    expect(device.display_name).toMatch(/#[0-9a-f]{4}$/)
  })

  it('đếm nội dung: hồ sơ có email lấy từ artifact_views', async () => {
    const { data } = await service.listAudience(ORG, params())
    const identified = data.find((m) => m.kind === 'identified')!

    // 2 nội dung riêng biệt, 5 lượt mở (4 + 1).
    expect(identified.content_count).toBe(2)
    expect(identified.open_count).toBe(5)
  })

  it('đếm nội dung: thiết bị lấy qua artifacts.touch_point_id', async () => {
    const { data } = await service.listAudience(ORG, params())
    const withArtifact = data.find((m) => m.fp === FP_ONE)!
    const withoutArtifact = data.find((m) => m.fp === FP_TWO)!

    // FP_ONE có 3 lượt, 2 trong đó qua touch point của một artifact → 1 nội dung, 2 lượt mở.
    expect(withArtifact.visit_count).toBe(3)
    expect(withArtifact.content_count).toBe(1)
    expect(withArtifact.open_count).toBe(2)

    // FP_TWO chỉ bấm một link thường — không phải nội dung nào.
    expect(withoutArtifact.content_count).toBe(0)
    expect(withoutArtifact.open_count).toBe(0)
  })

  it('quốc gia của thiết bị lấy từ lượt gần nhất; hồ sơ có email thì KHÔNG đoán', async () => {
    const { data } = await service.listAudience(ORG, params())

    expect(data.find((m) => m.fp === FP_ONE)!.country).toBe('VN')
    expect(data.find((m) => m.fp === FP_TWO)!.country).toBe('SG')
    // Không có cột nào nối `customer_profiles` với `visits` — để trống chứ không gán bừa.
    expect(data.find((m) => m.kind === 'identified')!.country).toBeNull()
  })
})

describe('listAudience — lọc "chỉ khách có email"', () => {
  it('bỏ sạch hàng thiết bị và không đọc visits nữa', async () => {
    const repo = makeRepo()
    const scoped = new ContentAudienceService(repo)

    const result = await scoped.listAudience(ORG, params({ filters: { emailOnly: true } }))

    expect(result.data.every((m) => m.kind === 'identified')).toBe(true)
    expect(result.data.every((m) => !!m.email)).toBe(true)
    expect(result.count).toBe(1)
    // Lọc rồi thì khỏi quét `visits` — đó cũng là đường thoát khi bảng quá lớn.
    expect(repo.findVisits).not.toHaveBeenCalled()
  })

  it('nhận cả `emailOnly=\'true\'` dạng chuỗi từ query string', async () => {
    const result = await service.listAudience(ORG, params({ filters: { emailOnly: 'true' } }))
    expect(result.count).toBe(1)
  })

  it('không bật thì thiết bị vẫn còn', async () => {
    const result = await service.listAudience(ORG, params({ filters: {} }))
    expect(result.data.some((m) => m.kind === 'device')).toBe(true)
  })
})

describe('listAudience — tìm kiếm, sắp xếp, phân trang', () => {
  it('tìm theo email', async () => {
    const result = await service.listAudience(ORG, params({ search: 'khanh.qn' }))
    expect(result.count).toBe(1)
    expect(result.data[0].email).toBe('khanh.qn@gmail.com')
  })

  it('tìm theo tên thiết bị sinh ra — vì nó là tên người dùng NHÌN THẤY', async () => {
    const name = anonymousDeviceName(FP_ONE)
    const result = await service.listAudience(ORG, params({ search: name.split(' ')[0] }))

    expect(result.data.some((m) => m.display_name === name)).toBe(true)
  })

  it('mặc định sắp theo lần xem gần nhất, mới trước', async () => {
    const { data } = await service.listAudience(ORG, params())
    const dates = data.map((m) => m.last_seen_at ?? '')

    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('sắp theo số nội dung đã xem', async () => {
    const { data } = await service.listAudience(
      ORG,
      params({ sorting: [{ id: 'content_count', desc: true }] })
    )
    expect(data[0].content_count).toBe(2)
  })

  it('phân trang cắt đúng và `count` vẫn là tổng', async () => {
    const result = await service.listAudience(
      ORG,
      params({ pagination: { pageIndex: 1, pageSize: 2 } })
    )
    expect(result.data).toHaveLength(1)
    expect(result.count).toBe(3)
  })

  it('lọc theo quốc gia', async () => {
    const result = await service.listAudience(ORG, params({ filters: { countries: ['SG'] } }))
    expect(result.data).toHaveLength(1)
    expect(result.data[0].fp).toBe(FP_TWO)
  })

  it('`scanTruncated` chỉ bật khi chạm trần quét', async () => {
    const notTruncated = await service.listAudience(ORG, params())
    expect(notTruncated.scanTruncated).toBe(false)

    const many = Array.from({ length: VISIT_SCAN_LIMIT }, (_, i) => ({
      ...visits[0],
      id: `v-${i}`,
      fp: `fp-${i}`,
    }))
    const flooded = new ContentAudienceService(
      makeRepo({ findVisits: vi.fn(async () => many) })
    )
    const result = await flooded.listAudience(ORG, params({ pagination: { pageIndex: 0, pageSize: 10 } }))

    expect(result.scanTruncated).toBe(true)
  })
})

describe('getContentViews — và không đọc được dữ liệu org khác', () => {
  it('trả danh sách nội dung đã mở kèm số lần', async () => {
    const views = await service.getContentViews(ORG, 'profile-1')

    expect(views).toHaveLength(2)
    expect(views![0].open_count).toBe(4)
    expect(views![0].name).toBe('Nội dung artifact-1')
  })

  it('org khác đọc đúng id hồ sơ đó vẫn trả `null`', async () => {
    expect(await service.getContentViews(OTHER_ORG, 'profile-1')).toBeNull()
  })

  it('hồ sơ không tồn tại trả `null`, không ném', async () => {
    expect(await service.getContentViews(ORG, 'khong-co')).toBeNull()
  })
})

describe('getDeviceActivity — lịch sử một thiết bị', () => {
  it('dựng được lịch sử từ visits, mới nhất trước', async () => {
    const activity = await service.getDeviceActivity(ORG, FP_ONE)

    expect(activity!.display_name).toBe(anonymousDeviceName(FP_ONE))
    expect(activity!.visit_count).toBe(3)
    expect(activity!.visits[0].id).toBe('v1')
    expect(activity!.visits[0].type).toBe('QR')
    expect(activity!.first_seen_at).toBe('2026-10-19T10:00:00Z')
    expect(activity!.last_seen_at).toBe('2026-10-21T10:00:00Z')
  })

  it('gắn được nội dung vào lượt đi qua touch point của artifact', async () => {
    const activity = await service.getDeviceActivity(ORG, FP_ONE)

    expect(activity!.visits[0].artifact?.id).toBe('artifact-1')
    expect(activity!.visits[0].touch_point?.name).toBe('Artifact flow')
    // Lượt qua link thường không có nội dung nào — và không được bịa ra.
    expect(activity!.visits[2].artifact).toBeNull()
    expect(activity!.content_count).toBe(1)
  })

  it('org khác đọc đúng `fp` đó vẫn trả `null`', async () => {
    expect(await service.getDeviceActivity(OTHER_ORG, FP_ONE)).toBeNull()
  })

  it('`fp` chưa có lượt nào trả `null`', async () => {
    expect(await service.getDeviceActivity(ORG, 'fp-khong-ton-tai')).toBeNull()
  })
})

describe('getAudienceCountries', () => {
  it('đếm thiết bị theo quốc gia, nhiều trước', async () => {
    const countries = await service.getAudienceCountries(ORG)
    expect(countries).toEqual([
      { country: 'VN', count: 1 },
      { country: 'SG', count: 1 },
    ])
  })

  it('org khác không thấy gì', async () => {
    expect(await service.getAudienceCountries(OTHER_ORG)).toEqual([])
  })
})
