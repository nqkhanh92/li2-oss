import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Hai thay đổi của `getCustomerJourney`, cả hai đều là lỗi thật đã đo được trên LiHi:
 *
 * **1. Timeline phải có sự kiện mở nội dung.** Hai khách thật duy nhất của LiHi tồn tại CHỈ vì họ
 * đã mở một artifact (`artifact_views` có hàng cho cả hai), mà `JourneyNode` lại chỉ có
 * `first_visit | session | lead | sale` — bốn loại của một CRM bán hàng, cả bốn đều rỗng. Nên
 * trang chi tiết hiện "Chưa có sự kiện hành trình" cho đúng hai người đã xem nội dung.
 *
 * **2. Phải lọc theo `organization_id`.** Bản trước gọi `findByIdWithTouchPoint(customerId)` —
 * không có điều kiện org nào. Route đã `ensurePolicy(org_id, …)` nhưng điều đó chỉ chứng minh
 * người gọi là thành viên của `org_id` trong URL; `customer_id` vẫn lấy thẳng từ URL và repo truy
 * bằng client service-role (bỏ qua RLS). Tức một thành viên org A đọc được hành trình khách của
 * org B. Dán `.test` lên nó vì kiểm quyền không thể để "đọc source rồi tin".
 */

const ORG = 'org-a'
const CUSTOMER = 'profile-1'

/** Dữ liệu trả về theo TÊN BẢNG — hình của lệnh (bảng nào, lọc gì) đã có ở chú thích tại chỗ. */
let tableResults: Record<string, { data?: unknown; error?: unknown }> = {}
const touchedTables: string[] = []

const chainFor = (table: string) => {
  touchedTables.push(table)
  const self: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          const result = tableResults[table] ?? { data: [], error: null }
          return (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(
              resolve,
              reject
            )
        }
        return () => self
      },
    }
  )
  return self
}

vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: { from: (table: string) => chainFor(table), rpc: async () => ({ data: null, error: null }) },
}))

// `vi.hoisted`: factory của `vi.mock` chạy TRƯỚC các `const` của file, nên spy phải sinh ở đây.
const { findByIdAndOrg, findByIdWithTouchPoint, findByCustomerId } = vi.hoisted(() => ({
  findByIdAndOrg: vi.fn(),
  findByIdWithTouchPoint: vi.fn(),
  findByCustomerId: vi.fn(),
}))

vi.mock('@/core/repositories/conversion.repository', () => ({
  ConversionEventRepository: class {
    findByCustomerId = findByCustomerId
  },
  CustomerProfileRepository: class {
    findByIdAndOrg = findByIdAndOrg
    findByIdWithTouchPoint = findByIdWithTouchPoint
  },
  conversionEventRepo: { findByCustomerId },
  customerProfileRepo: { findByIdAndOrg, findByIdWithTouchPoint },
}))

vi.mock('@/core/services/touch-point.service', () => ({
  touchPointService: { getViewableTouchpointIds: vi.fn(async () => []) },
}))
vi.mock('@/core/repositories/funnel.repository', () => ({
  funnelRepo: { getSessionWithPageviews: vi.fn() },
}))
vi.mock('@/core/repositories/member.repository', () => ({ memberRepo: {} }))
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}))

import { conversionService } from '@/core/services/conversion.service'

const artifactViewRow = {
  artifact_id: 'artifact-1',
  view_count: 4,
  first_viewed_at: '2026-10-06T14:35:06.928Z',
  last_viewed_at: '2026-10-10T15:42:48.508Z',
  artifacts: { name: 'Tính năng LiHi 2026-10-22', serve_token: 'tok-1' },
}

beforeEach(() => {
  vi.clearAllMocks()
  touchedTables.length = 0
  tableResults = {}
  // Không `first_click_id` — đúng như cả hai hàng thật trên LiHi, nên nhánh `visits` bị bỏ qua.
  findByIdAndOrg.mockResolvedValue({
    id: CUSTOMER,
    first_click_id: null,
    touch_points: null,
  })
  findByCustomerId.mockResolvedValue([])
})

describe('getCustomerJourney — sự kiện mở nội dung', () => {
  it('đọc `artifact_views` và sinh node `artifact_view`', async () => {
    tableResults.artifact_views = { data: [artifactViewRow] }

    const journey = await conversionService.getCustomerJourney(ORG, CUSTOMER)

    expect(touchedTables).toContain('artifact_views')
    expect(journey.timeline).toHaveLength(1)
    expect(journey.timeline[0]).toMatchObject({
      type: 'artifact_view',
      date: artifactViewRow.first_viewed_at,
      data: {
        artifactId: 'artifact-1',
        artifactName: 'Tính năng LiHi 2026-10-22',
        openCount: 4,
        lastViewedAt: artifactViewRow.last_viewed_at,
      },
    })
  })

  it('một hàng ra MỘT node, dù mở 4 lần', async () => {
    // `artifact_views` chỉ giữ tổng `view_count`, không giữ từng lần mở. Vẽ 4 node là bịa ra 3
    // mốc thời gian không tồn tại.
    tableResults.artifact_views = { data: [artifactViewRow] }

    const journey = await conversionService.getCustomerJourney(ORG, CUSTOMER)

    expect(journey.timeline.filter((n) => n.type === 'artifact_view')).toHaveLength(1)
  })

  it('tên nội dung mất (artifact đã xoá) thì lùi về id, không ném', async () => {
    tableResults.artifact_views = { data: [{ ...artifactViewRow, artifacts: null }] }

    const journey = await conversionService.getCustomerJourney(ORG, CUSTOMER)

    expect(journey.timeline[0].data.artifactName).toBe('artifact-1')
  })

  it('lỗi khi đọc `artifact_views` không làm sập cả trang', async () => {
    tableResults.artifact_views = { error: { message: 'boom' } }

    const journey = await conversionService.getCustomerJourney(ORG, CUSTOMER)

    expect(journey.timeline).toEqual([])
  })

  it('nhiều nội dung thì xếp theo thứ tự thời gian cùng các loại khác', async () => {
    tableResults.artifact_views = {
      data: [
        artifactViewRow,
        {
          ...artifactViewRow,
          artifact_id: 'artifact-2',
          first_viewed_at: '2026-10-20T17:17:21.544Z',
          artifacts: { name: 'Receipt', serve_token: 'tok-2' },
        },
      ],
    }

    const journey = await conversionService.getCustomerJourney(ORG, CUSTOMER)
    const dates = journey.timeline.map((n) => n.date)

    expect(dates).toEqual([...dates].sort())
  })
})

describe('getCustomerJourney — không đọc được khách của org khác', () => {
  it('truy hồ sơ bằng CẢ `customer_id` và `organization_id`', async () => {
    await conversionService.getCustomerJourney(ORG, CUSTOMER)

    expect(findByIdAndOrg).toHaveBeenCalledWith(CUSTOMER, ORG)
    expect(
      findByIdWithTouchPoint,
      'hàm cũ không lọc org — gọi nó là mở lại đúng cái rò rỉ xuyên tổ chức'
    ).not.toHaveBeenCalled()
  })

  it('hồ sơ không thuộc org thì trả hành trình rỗng, không phải dữ liệu của họ', async () => {
    findByIdAndOrg.mockResolvedValue(null)
    tableResults.artifact_views = { data: [artifactViewRow] }

    const journey = await conversionService.getCustomerJourney(ORG, 'khach-cua-org-khac')

    expect(journey).toEqual({
      timeline: [],
      metrics: { timeToLead: null, timeToSale: null, totalEvents: 0 },
      firstVisit: null,
    })
    // Và dừng TRƯỚC khi đọc bảng nào — không có truy vấn nào mang id của org khác.
    expect(touchedTables).toEqual([])
  })
})
