/**
 * 34 đơn vị cấp tỉnh của Việt Nam sau lần sáp nhập 01/07/2025, khoá bằng **mã ISO 3166-2
 * thật**. Đây là hệ mã duy nhất của hệ thống cho cấp tỉnh.
 *
 * Toàn bộ chỗ dùng — tệp bản đồ `src/public/json/vietnam.json`, cột tỉnh trong DB, endpoint
 * `/analytics/geo`, UI — đều dùng chính những mã này. Trước 2026-10-26 tệp bản đồ mang một
 * hệ mã khác (Tổng cục Thống kê) cũng có dạng `VN-NN`, và **32 trong 63 chuỗi trùng nhau mà chỉ vào
 * hai tỉnh khác nhau**: `VN-56` là Khánh Hòa theo hệ cũ nhưng là Bắc Ninh theo ISO. Hệ cũ
 * đã được chuyển hẳn sang ISO bằng `scripts/vietnam-map-to-iso.mjs`; đừng dựng lại nó.
 *
 * Tra cứu đi qua `normalizeProvinceName` chứ không so chuỗi trực tiếp: cùng một tỉnh,
 * DB-IP viết "Thanh Hóa Province", "Ho Chi Minh City (HCMC)", "Hanoi", và sau khi áp bản
 * GeoIP có Apple Private Relay thì thêm biến thể "Ho Chi Minh City". `aliases` giữ cả tên
 * 63 tỉnh cũ, nên dữ liệu `visits` ghi trước 07/2025 cũng về đúng tỉnh mới.
 *
 * ⚠ Đừng đổi sang dùng cột `visits.region` làm khoá tỉnh, dù nó mang MÃ nên nhìn có vẻ
 * ổn định hơn tên. Đo trên LiHi 2026-10-22: cùng TP.HCM có `region = 'SG'` (87 lượt, lối
 * DB-IP, mã do worker gán cứng) và `region = 'VN-SG'` (23 lượt, lối Apple Private Relay,
 * mã ISO thật của Apple); Hà Nội thì `region` RỖNG (8 lượt, DB-IP không cấp mã). Ba định
 * dạng cho hai tỉnh. Tên tỉnh chuẩn hoá qua `aliases` vẫn là khoá đáng tin hơn, cho tới khi
 * `li2-worker` ghi mã ISO có tiền tố `VN-` ở cả hai lối nhận dữ liệu.
 */

/**
 * Tên trường chứa mã tỉnh trong `src/public/json/vietnam.json`.
 *
 * Từ 2026-10-26 giá trị của trường này là ISO 3166-2 thật, đúng như tên trường — gồm cả mã
 * chữ của 5 thành phố trực thuộc trung ương (`VN-HN`, `VN-SG`, `VN-HP`, `VN-DN`, `VN-CT`).
 * 34 mã, mỗi tỉnh hiện hành một mã, dùng được trực tiếp với `PROVINCE_BY_CODE`.
 *
 * Tệp còn giữ `GSO_CODE` mang mã Tổng cục Thống kê gốc của từng vùng (bảng mã 63 tỉnh,
 * Quyết định 124/2004/QĐ-TTg) để lần chuyển đổi này tra lại được, và để
 * `scripts/vietnam-map-to-iso.mjs` biết tệp đã chuyển rồi mà không chuyển hai lần. **Không
 * đọc `GSO_CODE` trong code chạy thật** — nó là vết tích nguồn gốc, không phải khoá.
 *
 * Tệp vẫn là bản đồ 63 tỉnh CŨ: 247 vùng, nhiều vùng chung một mã ISO vì tỉnh mới là hợp
 * của vài tỉnh cũ. Tô cùng màu theo mã là ra đúng ranh giới hiện hành, chỉ còn đường biên
 * tỉnh cũ bên trong — `vietnam-map-chart.tsx` vẽ nó mảnh hơn đường viền ngoài.
 */
export const PROVINCE_CODE_PROPERTY = 'ISO3166_2_CODE'

export interface VietnamProvince {
  /** Mã ISO 3166-2 của tỉnh — khoá duy nhất, khớp `PROVINCE_CODE_PROPERTY` trong vietnam.json */
  code: string
  nameVi: string
  nameEn: string
  /** Tên đã chuẩn hoá nhận về tỉnh này: tên mới, tên cũ, và các cách DB-IP viết */
  aliases: string[]
}

export const VIETNAM_PROVINCES: VietnamProvince[] = [
  {
    code: 'VN-HN',
    nameVi: 'Hà Nội',
    nameEn: 'Ha Noi',
    aliases: ['ha noi', 'hanoi'],
  },
  {
    code: 'VN-26',
    nameVi: 'Huế',
    nameEn: 'Hue',
    aliases: ['hue', 'thua thien hue', 'thua thien - hue', 'thua thien-hue'],
  },
  {
    code: 'VN-HP',
    nameVi: 'Hải Phòng',
    nameEn: 'Hai Phong',
    aliases: ['hai phong', 'hai duong'],
  },
  {
    code: 'VN-DN',
    nameVi: 'Đà Nẵng',
    nameEn: 'Da Nang',
    aliases: ['da nang', 'quang nam', 'hoang sa'],
  },
  {
    code: 'VN-CT',
    nameVi: 'Cần Thơ',
    nameEn: 'Can Tho',
    aliases: ['can tho', 'soc trang', 'hau giang'],
  },
  {
    code: 'VN-SG',
    nameVi: 'TP. Hồ Chí Minh',
    nameEn: 'Ho Chi Minh City',
    aliases: [
      'ho chi minh',
      'hcmc',
      'saigon',
      'sai gon',
      'tp ho chi minh',
      'binh duong',
      'ba ria vung tau',
      'ba ria - vung tau',
    ],
  },
  {
    code: 'VN-01',
    nameVi: 'Lai Châu',
    nameEn: 'Lai Chau',
    aliases: ['lai chau'],
  },
  {
    code: 'VN-71',
    nameVi: 'Điện Biên',
    nameEn: 'Dien Bien',
    aliases: ['dien bien'],
  },
  {
    code: 'VN-05',
    nameVi: 'Sơn La',
    nameEn: 'Son La',
    aliases: ['son la'],
  },
  {
    code: 'VN-09',
    nameVi: 'Lạng Sơn',
    nameEn: 'Lang Son',
    aliases: ['lang son'],
  },
  {
    code: 'VN-13',
    nameVi: 'Quảng Ninh',
    nameEn: 'Quang Ninh',
    aliases: ['quang ninh'],
  },
  {
    code: 'VN-21',
    nameVi: 'Thanh Hóa',
    nameEn: 'Thanh Hoa',
    aliases: ['thanh hoa'],
  },
  {
    code: 'VN-22',
    nameVi: 'Nghệ An',
    nameEn: 'Nghe An',
    aliases: ['nghe an'],
  },
  {
    code: 'VN-23',
    nameVi: 'Hà Tĩnh',
    nameEn: 'Ha Tinh',
    aliases: ['ha tinh'],
  },
  {
    code: 'VN-04',
    nameVi: 'Cao Bằng',
    nameEn: 'Cao Bang',
    aliases: ['cao bang'],
  },
  {
    code: 'VN-07',
    nameVi: 'Tuyên Quang',
    nameEn: 'Tuyen Quang',
    aliases: ['tuyen quang', 'ha giang'],
  },
  {
    code: 'VN-02',
    nameVi: 'Lào Cai',
    nameEn: 'Lao Cai',
    aliases: ['lao cai', 'yen bai'],
  },
  {
    code: 'VN-69',
    nameVi: 'Thái Nguyên',
    nameEn: 'Thai Nguyen',
    aliases: ['thai nguyen', 'bac kan'],
  },
  {
    code: 'VN-68',
    nameVi: 'Phú Thọ',
    nameEn: 'Phu Tho',
    aliases: ['phu tho', 'vinh phuc', 'hoa binh'],
  },
  {
    code: 'VN-56',
    nameVi: 'Bắc Ninh',
    nameEn: 'Bac Ninh',
    aliases: ['bac ninh', 'bac giang'],
  },
  {
    code: 'VN-66',
    nameVi: 'Hưng Yên',
    nameEn: 'Hung Yen',
    aliases: ['hung yen', 'thai binh'],
  },
  {
    code: 'VN-18',
    nameVi: 'Ninh Bình',
    nameEn: 'Ninh Binh',
    aliases: ['ninh binh', 'ha nam', 'nam dinh'],
  },
  {
    code: 'VN-25',
    nameVi: 'Quảng Trị',
    nameEn: 'Quang Tri',
    aliases: ['quang tri', 'quang binh'],
  },
  {
    code: 'VN-29',
    nameVi: 'Quảng Ngãi',
    nameEn: 'Quang Ngai',
    aliases: ['quang ngai', 'kon tum'],
  },
  {
    code: 'VN-30',
    nameVi: 'Gia Lai',
    nameEn: 'Gia Lai',
    aliases: ['gia lai', 'binh dinh'],
  },
  {
    code: 'VN-34',
    nameVi: 'Khánh Hòa',
    nameEn: 'Khanh Hoa',
    aliases: ['khanh hoa', 'ninh thuan', 'truong sa'],
  },
  {
    code: 'VN-35',
    nameVi: 'Lâm Đồng',
    nameEn: 'Lam Dong',
    aliases: ['lam dong', 'dak nong', 'binh thuan'],
  },
  {
    code: 'VN-33',
    nameVi: 'Đắk Lắk',
    nameEn: 'Dak Lak',
    aliases: ['dak lak', 'phu yen'],
  },
  {
    code: 'VN-39',
    nameVi: 'Đồng Nai',
    nameEn: 'Dong Nai',
    aliases: ['dong nai', 'binh phuoc'],
  },
  {
    code: 'VN-37',
    nameVi: 'Tây Ninh',
    nameEn: 'Tay Ninh',
    aliases: ['tay ninh', 'long an'],
  },
  {
    code: 'VN-49',
    nameVi: 'Vĩnh Long',
    nameEn: 'Vinh Long',
    aliases: ['vinh long', 'ben tre', 'tra vinh'],
  },
  {
    code: 'VN-45',
    nameVi: 'Đồng Tháp',
    nameEn: 'Dong Thap',
    aliases: ['dong thap', 'tien giang'],
  },
  {
    code: 'VN-44',
    nameVi: 'An Giang',
    nameEn: 'An Giang',
    aliases: ['an giang', 'kien giang', 'phu quoc'],
  },
  {
    code: 'VN-59',
    nameVi: 'Cà Mau',
    nameEn: 'Ca Mau',
    aliases: ['ca mau', 'bac lieu'],
  },
]

const DIACRITIC_MAP: Record<string, string> = {
  à: 'a',
  á: 'a',
  ạ: 'a',
  ả: 'a',
  ã: 'a',
  â: 'a',
  ầ: 'a',
  ấ: 'a',
  ậ: 'a',
  ẩ: 'a',
  ẫ: 'a',
  ă: 'a',
  ằ: 'a',
  ắ: 'a',
  ặ: 'a',
  ẳ: 'a',
  ẵ: 'a',
  è: 'e',
  é: 'e',
  ẹ: 'e',
  ẻ: 'e',
  ẽ: 'e',
  ê: 'e',
  ề: 'e',
  ế: 'e',
  ệ: 'e',
  ể: 'e',
  ễ: 'e',
  ì: 'i',
  í: 'i',
  ị: 'i',
  ỉ: 'i',
  ĩ: 'i',
  ò: 'o',
  ó: 'o',
  ọ: 'o',
  ỏ: 'o',
  õ: 'o',
  ô: 'o',
  ồ: 'o',
  ố: 'o',
  ộ: 'o',
  ổ: 'o',
  ỗ: 'o',
  ơ: 'o',
  ờ: 'o',
  ớ: 'o',
  ợ: 'o',
  ở: 'o',
  ỡ: 'o',
  ù: 'u',
  ú: 'u',
  ụ: 'u',
  ủ: 'u',
  ũ: 'u',
  ư: 'u',
  ừ: 'u',
  ứ: 'u',
  ự: 'u',
  ử: 'u',
  ữ: 'u',
  ỳ: 'y',
  ý: 'y',
  ỵ: 'y',
  ỷ: 'y',
  ỹ: 'y',
  đ: 'd',
}

/**
 * Đưa tên tỉnh về khoá tra cứu: bỏ dấu, bỏ phần trong ngoặc, bỏ các hậu tố hành chính,
 * gộp khoảng trắng. "Thừa Thiên Huế Province" và "Thua Thien - Hue" cùng ra "thua thien hue".
 *
 * Không dùng String.normalize('NFD'): tiếng Việt có ký tự dựng từ hai dấu (ế, ộ) và bảng
 * tra tường minh ở trên chắc chắn hơn việc lọc dải Unicode combining.
 */
export const normalizeProvinceName = (raw?: string | null): string => {
  if (!raw) return ''
  let s = raw.toLowerCase()
  s = s.replace(/\([^)]*\)/g, ' ')
  s = s.replace(/[À-ỹ]/g, (ch) => DIACRITIC_MAP[ch] ?? ch)
  s = s.replace(/\b(province|city|tinh|tp|thanh pho)\b/g, ' ')
  s = s.replace(/[^a-z0-9]+/g, ' ')
  return s.trim().replace(/\s+/g, ' ')
}

const PROVINCE_BY_ALIAS: Map<string, VietnamProvince> = (() => {
  const map = new Map<string, VietnamProvince>()
  for (const province of VIETNAM_PROVINCES) {
    for (const alias of [...province.aliases, province.nameVi, province.nameEn]) {
      map.set(normalizeProvinceName(alias), province)
    }
  }
  return map
})()

/** Tra tỉnh từ tên GeoIP ghi trong `visits.city`. Trả undefined khi không nhận ra. */
export const resolveVietnamProvince = (name?: string | null): VietnamProvince | undefined =>
  PROVINCE_BY_ALIAS.get(normalizeProvinceName(name))

/** Mã ISO 3166-2 → tỉnh. Dùng cho cả geometry của vietnam.json và mã tỉnh lưu trong DB. */
export const PROVINCE_BY_CODE: Map<string, VietnamProvince> = new Map(
  VIETNAM_PROVINCES.map((province) => [province.code, province])
)

/**
 * 63 mã ISO 3166-2 của thời trước 01/07/2025 → tên tỉnh cũ.
 *
 * Cần vì nguồn GeoIP có thể cấp mã ISO của tỉnh ĐÃ SÁP NHẬP: Apple Private Relay công bố mã
 * ISO thật, nhưng ISO chưa chắc theo kịp lần sáp nhập, nên một dải relay ở Bình Dương vẫn có
 * thể về `VN-57` — mã đúng chuẩn mà không có trong bảng 34 tỉnh. Bảng này đưa mã đó về tên
 * tỉnh cũ, rồi `aliases` đưa tên tỉnh cũ về tỉnh hiện hành. Đây là lớp đổi ranh giới của
 * `resolveProvinceByIsoCode`: thêm một lần sáp nhập nữa thì thêm bảng, không sửa bảng này.
 *
 * 29 mã trong đây vẫn là mã của tỉnh hiện hành (tỉnh không bị sáp nhập, hoặc là tỉnh đứng tên
 * sau sáp nhập) nên trùng với `PROVINCE_BY_CODE` — tra trực tiếp vẫn đi trước, bảng này chỉ
 * đỡ 34 mã còn lại.
 */
export const LEGACY_ISO_CODES: Record<string, string> = {
  'VN-01': 'Lai Chau',
  'VN-02': 'Lao Cai',
  'VN-03': 'Ha Giang',
  'VN-04': 'Cao Bang',
  'VN-05': 'Son La',
  'VN-06': 'Yen Bai',
  'VN-07': 'Tuyen Quang',
  'VN-09': 'Lang Son',
  'VN-13': 'Quang Ninh',
  'VN-14': 'Hoa Binh',
  'VN-18': 'Ninh Binh',
  'VN-20': 'Thai Binh',
  'VN-21': 'Thanh Hoa',
  'VN-22': 'Nghe An',
  'VN-23': 'Ha Tinh',
  'VN-24': 'Quang Binh',
  'VN-25': 'Quang Tri',
  'VN-26': 'Thua Thien Hue',
  'VN-27': 'Quang Nam',
  'VN-28': 'Kon Tum',
  'VN-29': 'Quang Ngai',
  'VN-30': 'Gia Lai',
  'VN-31': 'Binh Dinh',
  'VN-32': 'Phu Yen',
  'VN-33': 'Dak Lak',
  'VN-34': 'Khanh Hoa',
  'VN-35': 'Lam Dong',
  'VN-36': 'Ninh Thuan',
  'VN-37': 'Tay Ninh',
  'VN-39': 'Dong Nai',
  'VN-40': 'Binh Thuan',
  'VN-41': 'Long An',
  'VN-43': 'Ba Ria Vung Tau',
  'VN-44': 'An Giang',
  'VN-45': 'Dong Thap',
  'VN-46': 'Tien Giang',
  'VN-47': 'Kien Giang',
  'VN-49': 'Vinh Long',
  'VN-50': 'Ben Tre',
  'VN-51': 'Tra Vinh',
  'VN-52': 'Soc Trang',
  'VN-53': 'Bac Kan',
  'VN-54': 'Bac Giang',
  'VN-55': 'Bac Lieu',
  'VN-56': 'Bac Ninh',
  'VN-57': 'Binh Duong',
  'VN-58': 'Binh Phuoc',
  'VN-59': 'Ca Mau',
  'VN-61': 'Hai Duong',
  'VN-63': 'Ha Nam',
  'VN-66': 'Hung Yen',
  'VN-67': 'Nam Dinh',
  'VN-68': 'Phu Tho',
  'VN-69': 'Thai Nguyen',
  'VN-70': 'Vinh Phuc',
  'VN-71': 'Dien Bien',
  'VN-72': 'Dak Nong',
  'VN-73': 'Hau Giang',
  'VN-CT': 'Can Tho',
  'VN-DN': 'Da Nang',
  'VN-HN': 'Ha Noi',
  'VN-HP': 'Hai Phong',
  'VN-SG': 'Ho Chi Minh',
}

/**
 * Tra tỉnh hiện hành từ một mã ISO 3166-2, kể cả mã của tỉnh đã sáp nhập.
 *
 * `visits.region` chỉ có mã ở các dải Apple Private Relay; dải DB-IP để trống (bộ sinh dữ liệu
 * GeoIP không có cột mã — xem `~/lihi/geoip/gen/main.go`, phần "ÁNH XẠ TRƯỜNG"). Nên mã là
 * tín hiệu CHẮC nhưng THƯA, còn tên tỉnh ở `visits.city` thì ngược lại. Dùng cả hai, mã trước.
 */
export const resolveProvinceByIsoCode = (code?: string | null): VietnamProvince | undefined => {
  if (!code) return undefined
  const normalized = code.trim().toUpperCase()
  const direct = PROVINCE_BY_CODE.get(normalized)
  if (direct) return direct
  return resolveVietnamProvince(LEGACY_ISO_CODES[normalized])
}

/**
 * Bộ ranh giới hành chính mà các mã trong tệp này thuộc về — ghi vào
 * `visits.region_boundary_version` cùng lúc với `visits.region_iso`.
 *
 * Mã tỉnh không đủ để hiểu một hàng cũ: `VN-56` nghĩa là Bắc Ninh theo bộ ranh giới hiện hành,
 * nhưng sau một lần sáp nhập nữa nó có thể nghĩa khác. Ghi kèm bộ ranh giới thì hàng cũ vẫn
 * dịch được thay vì phải đoán theo ngày tạo.
 */
export const VN_BOUNDARY_VERSION = 'vn-2025-07'

/**
 * Suy ra tỉnh của một lượt truy cập từ **cả hai** tín hiệu GeoIP, mã trước rồi mới tên.
 *
 * Thứ tự này không phải tuỳ chọn. Mã (`visits.region`) chỉ có ở các dải Apple Private Relay,
 * nhưng ở đúng những dải đó `visits.city` lại là tên **thành phố** chứ không phải tỉnh — một
 * người dùng relay ở Biên Hòa cho `city = "Bien Hoa"`, tra theo tên là không ra. Ngược lại dải
 * DB-IP không có mã nhưng `city` là tên **tỉnh**, tra theo tên là đúng. Hai tín hiệu bù nhau,
 * và tín hiệu chắc phải đi trước.
 */
export const resolveVisitProvince = (visit: {
  region?: string | null
  city?: string | null
}): VietnamProvince | undefined =>
  resolveProvinceByIsoCode(visit.region) ?? resolveVietnamProvince(visit.city)

/** Một dòng dữ liệu địa phương như RPC trả về: `city` ở đây là tên tỉnh/thành GeoIP ghi */
export type ProvinceDatum = { city: string; count: number }

export type VietnamProvinceCount = {
  province: VietnamProvince
  count: number
  /** Những tên GeoIP đã gộp vào tỉnh này — hiện trong tooltip khi có nhiều hơn một */
  sourceNames: string[]
}

/**
 * Gộp dữ liệu theo tên GeoIP về 34 tỉnh hiện hành.
 *
 * Phải gộp vì cùng một tỉnh đến dưới nhiều tên: "Ho Chi Minh" và "Ho Chi Minh City" là một
 * (DB-IP đổi định dạng), và tên 63 tỉnh cũ trong dữ liệu trước 07/2025 cũng phải về tỉnh mới.
 * `unmatched` giữ phần không nhận ra để UI nói ra thay vì lặng lẽ bỏ.
 */
export const groupByVietnamProvince = (data?: ProvinceDatum[]) => {
  const byCode = new Map<string, VietnamProvinceCount>()
  const unmatched: ProvinceDatum[] = []

  for (const row of data ?? []) {
    const province = resolveVietnamProvince(row.city)
    if (!province) {
      if (row.count > 0) unmatched.push(row)
      continue
    }
    const current = byCode.get(province.code)
    if (current) {
      current.count += row.count
      if (row.city) current.sourceNames.push(row.city)
    } else {
      byCode.set(province.code, {
        province,
        count: row.count,
        sourceNames: row.city ? [row.city] : [],
      })
    }
  }

  const matched = [...byCode.values()].sort((a, b) => b.count - a.count)
  return {
    matched,
    unmatched,
    matchedTotal: matched.reduce((sum, p) => sum + p.count, 0),
    unmatchedTotal: unmatched.reduce((sum, p) => sum + p.count, 0),
  }
}
