import statesJson from './states.json'
import { countryMapping } from './country-mapping'
import {
  normalizeProvinceName,
  resolveVietnamProvince,
  resolveVisitProvince,
} from './vietnam-provinces'

/**
 * Bảng đơn vị hành chính cấp 1 của toàn thế giới, dựng từ `states.json` (5099 vùng).
 *
 * VÌ SAO DÙNG `states.json` CHỨ KHÔNG PHẢI TỆP BẢN ĐỒ: trường `ISO3166_2_CODE` trong
 * `src/public/json/vietnam.json` KHÔNG phải mã ISO — đó là mã Tổng cục Thống kê. Chi tiết và số
 * đo ở `docs/geo-card-khao-sat-buoc-0.md` §3. `states.json` là nguồn duy nhất trong repo có mã
 * ISO 3166-2 THẬT kèm `latitude`/`longitude`, và riêng Việt Nam đúng 34 hàng sau sáp nhập.
 *
 * Chỉ dùng cho **cấp vùng**. Cấp thành phố không có nguồn toạ độ nào trong repo.
 */
export interface Subdivision {
  /** Mã ISO 3166-2 đủ tiền tố, ví dụ `VN-SG` */
  code: string
  name: string
  countryCode: string
  lat: number
  lng: number
}

type RawState = {
  name: string
  iso2: string
  iso3166_2: string
  country_code: string
  latitude: string
  longitude: string
}

const RAW_STATES = statesJson as RawState[]

export const SUBDIVISION_BY_CODE: Map<string, Subdivision> = new Map(
  RAW_STATES.map((state) => {
    const code = state.iso3166_2.toUpperCase()
    return [
      code,
      {
        code,
        name: state.name,
        countryCode: state.country_code.toUpperCase(),
        lat: Number(state.latitude),
        lng: Number(state.longitude),
      },
    ] as const
  })
)

/**
 * Số đơn vị cấp 1 của mỗi nước — mẫu số của `coverage.total_units`.
 *
 * Nước không có mặt trong map này là nước `states.json` không có bảng đơn vị cấp 1, và endpoint
 * trả `region_supported: false` thay vì trả một bảng rỗng trông như "không có lượt nào".
 */
export const SUBDIVISION_COUNT_BY_COUNTRY: Map<string, number> = (() => {
  const counts = new Map<string, number>()
  for (const state of RAW_STATES) {
    const country = state.country_code.toUpperCase()
    counts.set(country, (counts.get(country) ?? 0) + 1)
  }
  return counts
})()

/** `<mã nước>|<tên đã chuẩn hoá>` → vùng. Tra theo tên phải trong phạm vi một nước: "Ontario" có
 *  ở Canada, nhưng tên vùng trùng nhau giữa các nước thì không hiếm. */
const SUBDIVISION_BY_COUNTRY_AND_NAME: Map<string, Subdivision> = (() => {
  const map = new Map<string, Subdivision>()
  for (const subdivision of SUBDIVISION_BY_CODE.values()) {
    map.set(`${subdivision.countryCode}|${normalizeProvinceName(subdivision.name)}`, subdivision)
  }
  return map
})()

const COUNTRY_BY_ALPHA2: Map<string, { name: string; lat: number; lng: number }> = new Map(
  countryMapping.map((country) => [
    country.alpha2.toUpperCase(),
    { name: country.name, lat: country.center[1], lng: country.center[0] },
  ])
)

export const KNOWN_COUNTRY_COUNT = COUNTRY_BY_ALPHA2.size

/** Tên nước theo mã alpha-2. Mã lạ thì trả lại chính mã — thà hiện `XK` còn hơn hiện rỗng. */
export const countryNameOf = (code: string): string => COUNTRY_BY_ALPHA2.get(code)?.name ?? code

/**
 * Tâm nước, lấy từ `countryMapping`. Mã không có trong bảng thì trả null — **không** suy ra bằng
 * cách lấy trung bình toạ độ các vùng: trung bình của Alaska với Hawaii rơi xuống Thái Bình Dương.
 */
export const countryCenterOf = (code: string): { lat: number; lng: number } | null => {
  const country = COUNTRY_BY_ALPHA2.get(code)
  return country ? { lat: country.lat, lng: country.lng } : null
}

/**
 * Đưa một giá trị `visits.region` thô về mã ISO 3166-2 đủ tiền tố.
 *
 * `visits.region` có ba dạng đo được trên LiHi: `VN-SG` (Apple Private Relay, mã ISO thật), `SG`
 * (mã trần, bản vá cũ của worker) và rỗng (DB-IP — nguồn không có cột mã). Dạng mã trần phải
 * được gắn tiền tố, không thì 105 lượt TP.HCM rơi vào "không rõ".
 *
 * Trả về null khi không thể là mã. Dấu hiệu: có khoảng trắng — DB-IP nhét **tên** vùng vào cột
 * này ("Ontario", "Ho Chi Minh City"), và một cái tên không bao giờ là mã ISO 3166-2.
 */
export const normalizeSubdivisionCode = (
  countryCode: string,
  raw?: string | null
): string | null => {
  const value = raw?.trim()
  if (!value) return null
  if (/\s/.test(value)) return null
  const upper = value.toUpperCase()
  if (upper.includes('-')) return upper
  return `${countryCode.toUpperCase()}-${upper}`
}

/** Một dòng vị trí như RPC `get_visits_geo_breakdown` trả về. NULL được giữ nguyên trạng. */
export type GeoBreakdownRow = {
  country: string | null
  region: string | null
  city: string | null
  region_iso: string | null
  count: number
}

/**
 * Suy ra đơn vị cấp 1 của một dòng, dùng CẢ BA tín hiệu: `region_iso` (cột đã lưu), `region`
 * (mã GeoIP thô) và `city` (tên).
 *
 * ⚠ `region_iso` là **bộ đệm, không phải nguồn duy nhất.** Hàng mới vẫn vào DB với `region_iso`
 * NULL vì `li2-worker` viết bằng Go và không có bảng `aliases` — đã thấy một hàng như vậy trên
 * LiHi 2026-10-26 (`VN|VN-SG|Ho Chi Minh City|NULL|1`). Chỉ đọc `region_iso` là mọi lượt truy
 * cập mới rơi vào "không rõ".
 *
 * Việt Nam đi qua `resolveVisitProvince` vì nó mang thêm lớp đổi ranh giới 63→34 tỉnh (một mã
 * ISO hợp lệ như `VN-57` Bình Dương không còn trong bảng 34 tỉnh, nhưng vẫn phải về được
 * TP.HCM). Các nước khác chưa có lớp đó, nên tra thẳng `states.json`.
 */
export const resolveSubdivision = (
  countryCode: string,
  row: Pick<GeoBreakdownRow, 'region' | 'city' | 'region_iso'>
): Subdivision | undefined => {
  const country = countryCode.toUpperCase()

  if (country === 'VN') {
    const province =
      resolveVisitProvince({
        region: normalizeSubdivisionCode(country, row.region_iso ?? row.region),
        city: row.city,
      }) ??
      // DB-IP nhét TÊN vùng vào `region`; `city` của hàng đó có thể là tên thành phố không khớp
      resolveVietnamProvince(row.region)
    return province ? SUBDIVISION_BY_CODE.get(province.code) : undefined
  }

  const byCode = normalizeSubdivisionCode(country, row.region_iso ?? row.region)
  const direct = byCode ? SUBDIVISION_BY_CODE.get(byCode) : undefined
  if (direct && direct.countryCode === country) return direct

  for (const name of [row.region, row.city]) {
    if (!name) continue
    const byName = SUBDIVISION_BY_COUNTRY_AND_NAME.get(`${country}|${normalizeProvinceName(name)}`)
    if (byName) return byName
  }
  return undefined
}
