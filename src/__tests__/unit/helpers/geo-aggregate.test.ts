import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ANONYMITY_THRESHOLD_BY_LEVEL,
  DEFAULT_GEO_LIMIT,
  aggregateGeo,
} from '@/core/helpers/analytics/geo-aggregate'
import type { GeoBreakdownRow } from '@/shared/constants/subdivisions'
import type { GeoAnalytics } from '@/core/types/analytics/geo.type'
import { VIETNAM_PROVINCES } from '@/shared/constants/vietnam-provinces'

/**
 * Năm hàng này là NGUYÊN TRẠNG bảng `visits` trên LiHi ngày 2026-10-26, lấy bằng
 * `select country, region, city, region_iso, count(*) ... group by 1,2,3,4`. Giữ y nguyên, kể cả
 * chuỗi rỗng ở `region`/`city` của các hàng `ZZ` — đó là chuỗi rỗng thật, không phải NULL.
 */
const LIHI_ROWS: GeoBreakdownRow[] = [
  { country: 'VN', region: 'SG', city: 'Ho Chi Minh', region_iso: 'VN-SG', count: 105 },
  { country: 'VN', region: 'VN-SG', city: 'Ho Chi Minh City', region_iso: 'VN-SG', count: 43 },
  { country: 'ZZ', region: '', city: '', region_iso: null, count: 31 },
  { country: 'VN', region: '', city: 'Hanoi', region_iso: 'VN-HN', count: 15 },
  { country: 'VN', region: 'VN-SG', city: 'Ho Chi Minh City', region_iso: null, count: 1 },
]

/**
 * BẤT BIẾN TRUNG TÂM của payload: bốn ô phải cộng về đúng `parent_total`, và các `pct` tương ứng
 * cộng về đúng 100. Mọi lượt truy cập phải có một chỗ đi — không lượt nào được bốc hơi, và không
 * lượt nào được đếm hai lần.
 *
 * Gọi hàm này ở MỌI ca test, kể cả ca không nói về ngưỡng ẩn danh: lỗi đếm hai lần
 * (ẩn sau khi cắt `limit`) chỉ lộ ra ở đúng phép cộng này.
 */
const expectBucketsSumToParent = (result: GeoAnalytics) => {
  const counted =
    result.rows.reduce((sum, row) => sum + row.count, 0) +
    (result.other?.count ?? 0) +
    result.suppressed.count +
    result.unknown.count
  expect(counted).toBe(result.parent_total)

  const pct =
    result.rows.reduce((sum, row) => sum + row.pct, 0) +
    (result.other?.pct ?? 0) +
    result.suppressed.pct +
    result.unknown.pct
  if (result.parent_total > 0) expect(pct).toBeCloseTo(100, 10)
  else expect(pct).toBe(0)
}

describe('aggregateGeo — cấp nước, dữ liệu thật của LiHi', () => {
  const result = aggregateGeo(LIHI_ROWS, { level: 'country' })

  it('parent là null và parent_total là tổng toàn bộ', () => {
    expect(result.level).toBe('country')
    expect(result.parent).toBeNull()
    expect(result.parent_total).toBe(195)
  })

  it('ZZ vào unknown, không thành một "nước" tên ZZ', () => {
    expect(result.rows.map((row) => row.code)).toEqual(['VN'])
    expect(result.unknown.count).toBe(31)
  })

  it('phần trăm chia theo parent_total và cộng về 100', () => {
    const vn = result.rows[0]
    expect(vn.count).toBe(164)
    expect(vn.pct).toBeCloseTo((164 / 195) * 100, 10)
    expectBucketsSumToParent(result)
  })

  it('pct là số, không phải chuỗi đã format', () => {
    expect(typeof result.rows[0].pct).toBe('number')
  })

  it('cấp nước có toạ độ tâm từ countryMapping', () => {
    expect(result.rows[0].lat).not.toBeNull()
    expect(result.rows[0].lng).not.toBeNull()
  })

  it('không có hàng nào bị cắt thì other là null, không phải bucket 0', () => {
    expect(result.other).toBeNull()
  })

  /**
   * Bản thiết kế chỉ ẩn danh ở **cấp thành phố** — chân card ghi "Thành phố dưới 5 lượt được gộp
   * để ẩn danh", còn ô chân bảng cấp tỉnh là "3 tỉnh khác" (ngoài top, không phải ẩn danh).
   * Nên mặc định ở cấp nước và cấp vùng là 0. Bộ máy ẩn vẫn còn, chỉ không bật sẵn.
   */
  it('mặc định KHÔNG ẩn ở cấp nước và cấp vùng — ẩn danh là việc của cấp thành phố', () => {
    expect(DEFAULT_ANONYMITY_THRESHOLD_BY_LEVEL.country).toBe(0)
    expect(DEFAULT_ANONYMITY_THRESHOLD_BY_LEVEL.region).toBe(0)
    expect(result.anonymity_threshold).toBe(0)
    expect(result.suppressed).toEqual({ count: 0, pct: 0, units: 0 })
  })

  it('grand_total ở cấp nước bằng parent_total', () => {
    expect(result.grand_total).toBe(result.parent_total)
  })
})

describe('aggregateGeo — cấp vùng Việt Nam, chính chỗ sửa lỗi phần trăm', () => {
  const result = aggregateGeo(LIHI_ROWS, { level: 'region', country: 'VN' })

  it('mẫu số là tổng của RIÊNG Việt Nam, không phải tổng toàn cầu', () => {
    expect(result.parent).toEqual({ code: 'VN', name: 'Viet Nam' })
    expect(result.parent_total).toBe(164)
    expect(result.parent_total).not.toBe(195)
  })

  it('gộp ba cách viết TP.HCM về một tỉnh, kể cả hàng region_iso NULL', () => {
    const hcm = result.rows.find((row) => row.code === 'VN-SG')!
    expect(hcm.count).toBe(149)
    expect(hcm.pct).toBeCloseTo((149 / 164) * 100, 10)
  })

  it('Hà Nội lấy phần trăm trong nước, không bị pha loãng bởi 31 lượt ZZ', () => {
    const hanoi = result.rows.find((row) => row.code === 'VN-HN')!
    expect(hanoi.count).toBe(15)
    expect(hanoi.pct).toBeCloseTo((15 / 164) * 100, 10)
    // Nếu mẫu số là tổng toàn cầu thì ra 7,69% — con số sai của card cũ
    expect(hanoi.pct).not.toBeCloseTo((15 / 195) * 100, 4)
  })

  it('không lượt nào của Việt Nam rơi vào unknown', () => {
    expect(result.unknown.count).toBe(0)
  })

  it('coverage đếm trên 34 tỉnh, không phải trên số hàng trả về', () => {
    expect(result.coverage).toEqual({ resolved_units: 2, total_units: 34 })
    expectBucketsSumToParent(result)
  })

  it('lượt của nước khác không lọt vào mẫu số', () => {
    const withForeign = aggregateGeo(
      [...LIHI_ROWS, { country: 'US', region: 'CA', city: null, region_iso: 'US-CA', count: 500 }],
      { level: 'region', country: 'VN' }
    )
    expect(withForeign.parent_total).toBe(164)
    expect(withForeign.rows.map((row) => row.code)).toEqual(['VN-SG', 'VN-HN'])
  })

  it('mã nước viết thường vẫn khớp', () => {
    expect(aggregateGeo(LIHI_ROWS, { level: 'region', country: 'vn' }).parent_total).toBe(164)
  })
})

describe('aggregateGeo — other và unknown là hai thứ khác nhau', () => {
  const rows: GeoBreakdownRow[] = [
    { country: 'VN', region: 'VN-SG', city: null, region_iso: 'VN-SG', count: 50 },
    { country: 'VN', region: 'VN-HN', city: null, region_iso: 'VN-HN', count: 30 },
    { country: 'VN', region: 'VN-DN', city: null, region_iso: 'VN-DN', count: 10 },
    { country: 'VN', region: 'Atlantis', city: 'Atlantis', region_iso: null, count: 7 },
  ]
  const result = aggregateGeo(rows, { level: 'region', country: 'VN', limit: 2 })

  it('other là vùng ĐÃ nhận ra nhưng ngoài limit', () => {
    expect(result.rows.map((row) => row.code)).toEqual(['VN-SG', 'VN-HN'])
    // `units` = 1 VÙNG bị đẩy ra ngoài limit, không phải 10 lượt
    expect(result.other).toEqual({ count: 10, pct: (10 / 97) * 100, units: 1 })
  })

  it('unknown là vùng KHÔNG nhận ra, tách riêng khỏi other', () => {
    expect(result.unknown.count).toBe(7)
  })

  it('không vùng nào dưới ngưỡng ở ca này nên suppressed rỗng', () => {
    expect(result.suppressed).toEqual({ count: 0, pct: 0, units: 0 })
  })

  it('bốn ô cộng về đúng parent_total và 100%', () => {
    expectBucketsSumToParent(result)
  })

  it('coverage.resolved_units đếm cả vùng bị đẩy vào other', () => {
    expect(result.coverage.resolved_units).toBe(3)
  })
})

describe('aggregateGeo — ngưỡng ẩn danh', () => {
  /**
   * Fixture TỰ TẠO, không phải dữ liệu LiHi: trên LiHi ngưỡng 5 không ẩn gì (Hà Nội 12, TP.HCM
   * 142) nên dựa vào dữ liệu thật là test xanh mà không kiểm gì.
   */
  const rows: GeoBreakdownRow[] = [
    { country: 'VN', region: null, city: null, region_iso: 'VN-SG', count: 40 },
    { country: 'VN', region: null, city: null, region_iso: 'VN-HN', count: 20 },
    { country: 'VN', region: null, city: null, region_iso: 'VN-DN', count: 10 },
    { country: 'VN', region: null, city: null, region_iso: 'VN-HP', count: 4 },
    { country: 'VN', region: null, city: null, region_iso: 'VN-CT', count: 2 },
    { country: 'VN', region: null, city: null, region_iso: 'VN-59', count: 1 },
    { country: 'VN', region: 'Atlantis', city: 'Atlantis', region_iso: null, count: 3 },
  ]
  // 40+20+10+4+2+1+3 = 80; dưới ngưỡng 5: VN-HP 4, VN-CT 2, VN-59 1 → 7 lượt / 3 vùng
  // Ngưỡng truyền TƯỜNG MINH: mặc định ở cấp vùng nay là 0, nên không truyền là không ẩn gì.
  const result = aggregateGeo(rows, { level: 'region', country: 'VN', anonymityThreshold: 5 })

  it('vùng dưới ngưỡng không vào rows, dồn vào suppressed', () => {
    expect(result.parent_total).toBe(80)
    expect(result.rows.map((row) => row.code)).toEqual(['VN-SG', 'VN-HN', 'VN-DN'])
    expect(result.suppressed).toEqual({ count: 7, pct: (7 / 80) * 100, units: 3 })
  })

  it('suppressed KHÔNG bị nhồi vào other hay unknown', () => {
    expect(result.other).toBeNull()
    // 3 lượt Atlantis là "không nhận ra vị trí", khác hẳn "nhận ra nhưng quá ít"
    expect(result.unknown.count).toBe(3)
  })

  it('coverage.resolved_units đếm cả vùng bị ẩn — 6 vùng nhận ra, chỉ hiện 3', () => {
    expect(result.coverage.resolved_units).toBe(6)
    expect(result.rows).toHaveLength(3)
  })

  it('bốn ô cộng về đúng parent_total và 100%', () => {
    expectBucketsSumToParent(result)
  })

  it('ẩn TRƯỚC khi cắt limit — cắt trước thì vùng bị other nuốt lại bị đếm lần nữa', () => {
    const limited = aggregateGeo(rows, {
      level: 'region',
      country: 'VN',
      limit: 2,
      anonymityThreshold: 5,
    })
    // Bất biến TRƯỚC các khẳng định chi tiết: nó là thứ bắt được lỗi đếm hai lần, và nếu để sau
    // thì một assert chi tiết đỏ trước sẽ che mất việc bất biến có bắt được hay không.
    expectBucketsSumToParent(limited)
    expect(limited.rows.map((row) => row.code)).toEqual(['VN-SG', 'VN-HN'])
    // VN-DN (10 lượt) ngoài limit → other. Ba vùng dưới ngưỡng vẫn chỉ ở suppressed.
    expect(limited.other).toEqual({ count: 10, pct: (10 / 80) * 100, units: 1 })
    expect(limited.suppressed).toEqual({ count: 7, pct: (7 / 80) * 100, units: 3 })
  })

  /**
   * Bộ máy ẩn dùng được ở cấp nước, nhưng **không bật sẵn** — bản thiết kế chỉ ẩn danh ở cấp
   * thành phố. Test này chốt hai nửa: truyền ngưỡng thì ẩn, không truyền thì không.
   */
  it('cấp nước: ẩn khi được truyền ngưỡng, KHÔNG ẩn khi để mặc định', () => {
    const world = [
      { country: 'VN', region: null, city: null, region_iso: null, count: 50 },
      { country: 'IS', region: null, city: null, region_iso: null, count: 1 },
      { country: 'SG', region: null, city: null, region_iso: null, count: 4 },
    ]

    const withThreshold = aggregateGeo(world, { level: 'country', anonymityThreshold: 5 })
    expect(withThreshold.rows.map((row) => row.code)).toEqual(['VN'])
    expect(withThreshold.suppressed).toEqual({ count: 5, pct: (5 / 55) * 100, units: 2 })
    expectBucketsSumToParent(withThreshold)

    const byDefault = aggregateGeo(world, { level: 'country' })
    expect(byDefault.rows.map((row) => row.code)).toEqual(['VN', 'SG', 'IS'])
    expect(byDefault.suppressed).toEqual({ count: 0, pct: 0, units: 0 })
    expectBucketsSumToParent(byDefault)
  })

  it('ngưỡng 0 tắt hẳn việc ẩn — dùng cho export/debug', () => {
    const raw = aggregateGeo(rows, { level: 'region', country: 'VN', anonymityThreshold: 0 })
    expect(raw.anonymity_threshold).toBe(0)
    expect(raw.suppressed).toEqual({ count: 0, pct: 0, units: 0 })
    expect(raw.rows.map((row) => row.code)).toEqual([
      'VN-SG',
      'VN-HN',
      'VN-DN',
      'VN-HP',
      'VN-CT',
      'VN-59',
    ])
    expectBucketsSumToParent(raw)
  })

  it('ngưỡng cao hơn mọi vùng thì rows rỗng mà số liệu vẫn toàn vẹn', () => {
    const all = aggregateGeo(rows, { level: 'region', country: 'VN', anonymityThreshold: 1000 })
    expect(all.rows).toEqual([])
    expect(all.other).toBeNull()
    expect(all.suppressed).toEqual({ count: 77, pct: (77 / 80) * 100, units: 6 })
    expect(all.coverage.resolved_units).toBe(6)
    expectBucketsSumToParent(all)
  })

  it('ngưỡng bằng đúng count thì KHÔNG ẩn — điều kiện là `<`, không phải `<=`', () => {
    const exact = aggregateGeo(rows, { level: 'region', country: 'VN', anonymityThreshold: 10 })
    expect(exact.rows.map((row) => row.code)).toContain('VN-DN')
    expect(exact.suppressed.units).toBe(3)
  })

  it('ngưỡng âm được coi như 0, không làm đảo ngược phép lọc', () => {
    const negative = aggregateGeo(rows, { level: 'region', country: 'VN', anonymityThreshold: -5 })
    expect(negative.anonymity_threshold).toBe(0)
    expect(negative.suppressed.count).toBe(0)
    expectBucketsSumToParent(negative)
  })
})

describe('aggregateGeo — biên', () => {
  it('không hàng nào: mọi số bằng 0, không chia cho 0', () => {
    const result = aggregateGeo([], { level: 'region', country: 'VN' })
    expect(result.parent_total).toBe(0)
    expect(result.rows).toEqual([])
    expect(result.unknown).toEqual({ count: 0, pct: 0 })
    expect(result.coverage.total_units).toBe(34)
    expect(result.suppressed).toEqual({ count: 0, pct: 0, units: 0 })
    expect(Number.isNaN(result.unknown.pct)).toBe(false)
    expectBucketsSumToParent(result)
  })

  it('nước không có bảng đơn vị cấp 1 trả region_supported=false, không phải bảng rỗng', () => {
    const result = aggregateGeo(
      [{ country: 'VA', region: null, city: null, region_iso: null, count: 9 }],
      { level: 'region', country: 'VA' }
    )
    expect(result.region_supported).toBe(false)
    expect(result.parent_total).toBe(9)
    expect(result.unknown).toEqual({ count: 9, pct: 100 })
    expect(result.coverage).toEqual({ resolved_units: 0, total_units: 0 })
    expect(result.suppressed).toEqual({ count: 0, pct: 0, units: 0 })
    expectBucketsSumToParent(result)
  })

  it('cấp nước luôn region_supported=true — câu hỏi đó không áp dụng ở đây', () => {
    expect(aggregateGeo(LIHI_ROWS, { level: 'country' }).region_supported).toBe(true)
  })

  it('limit mặc định là 8', () => {
    // Lấy mã từ chính bảng 34 tỉnh: mã viết tay dễ chọn nhầm một mã ĐÃ SÁP NHẬP (VN-52 Sóc Trăng
    // về Cần Thơ), và khi đó hai hàng gộp lại thành một vùng — đúng, nhưng làm hỏng phép đếm.
    const rows: GeoBreakdownRow[] = VIETNAM_PROVINCES.slice(0, 10).map((province, index) => ({
      country: 'VN',
      region: null,
      city: null,
      region_iso: province.code,
      count: 100 - index,
    }))
    const result = aggregateGeo(rows, { level: 'region', country: 'VN' })
    expect(result.coverage.resolved_units).toBe(10)
    expect(result.rows).toHaveLength(DEFAULT_GEO_LIMIT)
    expect(result.rows).toHaveLength(8)
    expect(result.rows.map((row) => row.count)).toEqual([100, 99, 98, 97, 96, 95, 94, 93])
    expect(result.other?.count).toBe(92 + 91)
    expectBucketsSumToParent(result)
  })

  it('limit 0 hoặc âm không làm rỗng bảng', () => {
    const result = aggregateGeo(LIHI_ROWS, { level: 'region', country: 'VN', limit: 0 })
    expect(result.rows).toHaveLength(1)
  })

  it('ngưỡng ẩn danh cấu hình được', () => {
    const result = aggregateGeo(LIHI_ROWS, {
      level: 'country',
      anonymityThreshold: 20,
    })
    expect(result.anonymity_threshold).toBe(20)
  })

  it('country rỗng/null đi vào unknown của cấp nước', () => {
    const result = aggregateGeo(
      [
        { country: null, region: null, city: null, region_iso: null, count: 4 },
        { country: '  ', region: null, city: null, region_iso: null, count: 2 },
        { country: 'VN', region: null, city: 'Hanoi', region_iso: null, count: 1 },
      ],
      // Ngưỡng 0: ca này nói về `country` rỗng/null, không về ẩn danh. Với ngưỡng mặc định 5 thì
      // 1 lượt VN sẽ nằm ở `suppressed` và câu hỏi của test bị che mất.
      { level: 'country', anonymityThreshold: 0 }
    )
    expect(result.unknown.count).toBe(6)
    expect(result.rows).toEqual([
      expect.objectContaining({ code: 'VN', count: 1, pct: (1 / 7) * 100 }),
    ])
    expectBucketsSumToParent(result)
  })
})
