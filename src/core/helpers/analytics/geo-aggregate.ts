import {
  KNOWN_COUNTRY_COUNT,
  SUBDIVISION_COUNT_BY_COUNTRY,
  countryCenterOf,
  countryNameOf,
  resolveSubdivision,
  type GeoBreakdownRow,
} from '@/shared/constants/subdivisions'
import type {
  GeoAnalytics,
  GeoAnalyticsBucket,
  GeoAnalyticsRow,
  GeoLevel,
} from '@/core/types/analytics/geo.type'

export const DEFAULT_GEO_LIMIT = 8

/**
 * Ngưỡng ẩn danh mặc định **theo từng cấp**, không phải một số chung.
 *
 * Bản thiết kế chỉ nói ẩn danh ở cấp thành phố: chân card ghi *"Thành phố dưới 5 lượt được gộp để
 * ẩn danh"*, còn ô chân bảng ở cấp tỉnh là *"3 tỉnh khác"* — gộp vì ngoài top, không vì ẩn danh.
 * Lý do hợp lý: một tỉnh có 2 lượt không chỉ ra ai, nhưng một thành phố nhỏ có 2 lượt thì có.
 *
 * Nên cấp `country`/`region` mặc định **0** (không ẩn), cấp `city` là 5. Người gọi vẫn truyền
 * ngưỡng riêng được cho bất kỳ cấp nào — bộ máy ẩn vẫn còn nguyên, chỉ đổi giá trị mặc định.
 */
export const DEFAULT_ANONYMITY_THRESHOLD_BY_LEVEL: Record<GeoLevel, number> = {
  country: 0,
  region: 0,
}

/**
 * `country = 'ZZ'` là cách GeoIP nói "không biết nước nào" (ZZ là mã dành riêng cho người dùng
 * trong ISO 3166-1, không bao giờ là một nước thật). Trên LiHi có 31 hàng như vậy. Đây là
 * "unknown" của cấp nước, và nó khác `region_iso IS NULL` — biết nước, chưa biết vùng.
 */
const UNKNOWN_COUNTRY_CODES = new Set(['ZZ', 'XX'])

const normalizeCountryCode = (raw?: string | null): string | null => {
  const value = raw?.trim().toUpperCase()
  if (!value || UNKNOWN_COUNTRY_CODES.has(value)) return null
  return value
}

type Unit = {
  code: string
  name: string
  count: number
  lat: number | null
  lng: number | null
}

const percentOf = (count: number, total: number): number => (total > 0 ? (count / total) * 100 : 0)

const toRow = (unit: Unit, total: number): GeoAnalyticsRow => ({
  code: unit.code,
  name: unit.name,
  count: unit.count,
  pct: percentOf(unit.count, total),
  lat: unit.lat,
  lng: unit.lng,
})

const bucketOf = (count: number, total: number): GeoAnalyticsBucket => ({
  count,
  pct: percentOf(count, total),
})

/**
 * Gộp các dòng vị trí thô thành payload của `GET /analytics/geo`.
 *
 * Hàm thuần, không I/O — mọi quy tắc đếm nằm ở đây để test được mà không cần DB.
 *
 * VỀ `anonymity_threshold`: vùng có ít hơn ngưỡng lượt **không** vào `rows`, mà dồn vào ô thứ tư
 * `suppressed`. Ô thứ tư chứ không nhồi vào `other`/`unknown` — nếu nhồi thì bất biến
 * `sum(rows) + other + suppressed + unknown === parent_total` vẫn đúng nhưng người đọc mất khả
 * năng phân biệt "ngoài top" với "quá ít người để nêu tên". Ngưỡng áp ở CẢ HAI cấp: một lượt duy
 * nhất từ Iceland cũng nhận dạng được như một lượt từ Cà Mau.
 *
 * `anonymityThreshold = 0` tắt hẳn việc ẩn, cho export/debug.
 */
export const aggregateGeo = (
  rows: GeoBreakdownRow[],
  options: {
    level: GeoLevel
    country?: string
    limit?: number
    anonymityThreshold?: number
  }
): GeoAnalytics => {
  const limit = Math.max(1, options.limit ?? DEFAULT_GEO_LIMIT)
  // `??` chứ không `||`: 0 là một lựa chọn THẬT (tắt ẩn danh), không phải "không truyền gì"
  const anonymityThreshold = Math.max(
    0,
    options.anonymityThreshold ?? DEFAULT_ANONYMITY_THRESHOLD_BY_LEVEL[options.level]
  )

  // Tổng của MỌI hàng, trước khi lọc theo nước — mẫu số của phần trăm thứ hai mà thiết kế hiện
  // bên dưới phần trăm chính. Tính ở đây vì chỉ chỗ này thấy cả tập chưa lọc.
  const grandTotal = rows.reduce((sum, row) => sum + row.count, 0)

  const units = new Map<string, Unit>()
  let unknownCount = 0
  let parentTotal = 0

  if (options.level === 'country') {
    for (const row of rows) {
      parentTotal += row.count
      const code = normalizeCountryCode(row.country)
      if (!code) {
        unknownCount += row.count
        continue
      }
      const center = countryCenterOf(code)
      const current = units.get(code)
      if (current) {
        current.count += row.count
      } else {
        units.set(code, {
          code,
          name: countryNameOf(code),
          count: row.count,
          lat: center?.lat ?? null,
          lng: center?.lng ?? null,
        })
      }
    }

    return assemble({
      level: 'country',
      parent: null,
      parentTotal,
      regionSupported: true,
      units,
      unknownCount,
      totalUnits: KNOWN_COUNTRY_COUNT,
      limit,
      anonymityThreshold,
      grandTotal,
    })
  }

  const parentCode = (options.country ?? '').trim().toUpperCase()
  const totalUnits = SUBDIVISION_COUNT_BY_COUNTRY.get(parentCode) ?? 0
  const parent = { code: parentCode, name: countryNameOf(parentCode) }

  // Dòng của nước khác có thể vẫn lọt vào nếu người gọi không lọc ở SQL, nên lọc lại ở đây:
  // `parent_total` là mẫu số, lẫn một dòng ngoài nước là mọi phần trăm sai.
  const scoped = rows.filter((row) => normalizeCountryCode(row.country) === parentCode)
  parentTotal = scoped.reduce((sum, row) => sum + row.count, 0)

  if (totalUnits === 0) {
    // Không có bảng đơn vị cấp 1 cho nước này. Mọi lượt là "không rõ vùng" — đúng về mặt dữ liệu,
    // và `region_supported: false` để UI nói "chưa hỗ trợ" thay vì "không có dữ liệu".
    return {
      level: 'region',
      parent,
      parent_total: parentTotal,
      grand_total: grandTotal,
      region_supported: false,
      rows: [],
      other: null,
      suppressed: { count: 0, pct: 0, units: 0 },
      unknown: bucketOf(parentTotal, parentTotal),
      coverage: { resolved_units: 0, total_units: 0 },
      anonymity_threshold: anonymityThreshold,
    }
  }

  for (const row of scoped) {
    const subdivision = resolveSubdivision(parentCode, row)
    if (!subdivision) {
      unknownCount += row.count
      continue
    }
    const current = units.get(subdivision.code)
    if (current) {
      current.count += row.count
    } else {
      units.set(subdivision.code, {
        code: subdivision.code,
        name: subdivision.name,
        count: row.count,
        lat: subdivision.lat,
        lng: subdivision.lng,
      })
    }
  }

  return assemble({
    level: 'region',
    parent,
    parentTotal,
    regionSupported: true,
    units,
    unknownCount,
    totalUnits,
    limit,
    anonymityThreshold,
    grandTotal,
  })
}

/**
 * Chia các đơn vị đã nhận ra thành ba phần: hiện ra, bị cắt vì `limit`, bị ẩn vì ngưỡng ẩn danh.
 *
 * ⚠ THỨ TỰ: ẩn TRƯỚC khi cắt theo `limit`. Nếu cắt trước thì một vùng dưới ngưỡng đã bị `other`
 * nuốt lại còn bị đếm lần nữa ở `suppressed`, và tổng vượt `parent_total`.
 */
const splitUnits = (
  all: Unit[],
  limit: number,
  anonymityThreshold: number
): { top: Unit[]; rest: Unit[]; suppressed: Unit[] } => {
  if (anonymityThreshold <= 0) {
    // Tắt hẳn việc ẩn — export/debug cần số nguyên vẹn
    return { top: all.slice(0, limit), rest: all.slice(limit), suppressed: [] }
  }
  const visible = all.filter((unit) => unit.count >= anonymityThreshold)
  return {
    top: visible.slice(0, limit),
    rest: visible.slice(limit),
    suppressed: all.filter((unit) => unit.count < anonymityThreshold),
  }
}

const assemble = (input: {
  level: GeoLevel
  parent: { code: string; name: string } | null
  parentTotal: number
  regionSupported: boolean
  units: Map<string, Unit>
  unknownCount: number
  totalUnits: number
  limit: number
  anonymityThreshold: number
  grandTotal: number
}): GeoAnalytics => {
  const sorted = [...input.units.values()]
    .filter((unit) => unit.count > 0)
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))

  const { top, rest, suppressed } = splitUnits(sorted, input.limit, input.anonymityThreshold)
  const restCount = rest.reduce((sum, unit) => sum + unit.count, 0)
  const suppressedCount = suppressed.reduce((sum, unit) => sum + unit.count, 0)

  return {
    level: input.level,
    parent: input.parent,
    parent_total: input.parentTotal,
    grand_total: input.grandTotal,
    region_supported: input.regionSupported,
    rows: top.map((unit) => toRow(unit, input.parentTotal)),
    other:
      rest.length > 0 ? { ...bucketOf(restCount, input.parentTotal), units: rest.length } : null,
    suppressed: {
      ...bucketOf(suppressedCount, input.parentTotal),
      units: suppressed.length,
    },
    unknown: bucketOf(input.unknownCount, input.parentTotal),
    // Đếm cả `rest` và `suppressed`: đây là "nhận ra được bao nhiêu vùng", không phải "hiện bao nhiêu"
    coverage: { resolved_units: sorted.length, total_units: input.totalUnits },
    anonymity_threshold: input.anonymityThreshold,
  }
}
