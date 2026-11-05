import { describe, it, expect } from 'vitest'
import {
  VIETNAM_PROVINCES,
  PROVINCE_BY_CODE,
  PROVINCE_CODE_PROPERTY,
  LEGACY_ISO_CODES,
  VN_BOUNDARY_VERSION,
  resolveProvinceByIsoCode,
  resolveVisitProvince,
  normalizeProvinceName,
  resolveVietnamProvince,
  groupByVietnamProvince,
} from '@/shared/constants/vietnam-provinces'
import topology from '@/public/json/vietnam.json'
import { GSO_TO_ISO as GSO_TO_ISO_UNTYPED } from '../../../../scripts/vietnam-map-to-iso.mjs'

/** Script là `.mjs` nên TS suy ra kiểu literal 63 khoá; tra bằng biến chuỗi cần index signature */
const GSO_TO_ISO = GSO_TO_ISO_UNTYPED as Record<string, string>

/**
 * Bảng mã đơn vị hành chính cấp tỉnh của Tổng cục Thống kê (63 tỉnh trước 01/07/2025,
 * Quyết định 124/2004/QĐ-TTg). Đây là hệ mã `vietnam.json` dùng TRƯỚC 2026-10-26, nay chỉ
 * còn trong trường `GSO_CODE` để tra lại nguồn gốc.
 */
const GSO_CODES: Record<string, string> = {
  '01': 'Ha Noi',
  '02': 'Ha Giang',
  '04': 'Cao Bang',
  '06': 'Bac Kan',
  '08': 'Tuyen Quang',
  '10': 'Lao Cai',
  '11': 'Dien Bien',
  '12': 'Lai Chau',
  '14': 'Son La',
  '15': 'Yen Bai',
  '17': 'Hoa Binh',
  '19': 'Thai Nguyen',
  '20': 'Lang Son',
  '22': 'Quang Ninh',
  '24': 'Bac Giang',
  '25': 'Phu Tho',
  '26': 'Vinh Phuc',
  '27': 'Bac Ninh',
  '30': 'Hai Duong',
  '31': 'Hai Phong',
  '33': 'Hung Yen',
  '34': 'Thai Binh',
  '35': 'Ha Nam',
  '36': 'Nam Dinh',
  '37': 'Ninh Binh',
  '38': 'Thanh Hoa',
  '40': 'Nghe An',
  '42': 'Ha Tinh',
  '44': 'Quang Binh',
  '45': 'Quang Tri',
  '46': 'Thua Thien Hue',
  '48': 'Da Nang',
  '49': 'Quang Nam',
  '51': 'Quang Ngai',
  '52': 'Binh Dinh',
  '54': 'Phu Yen',
  '56': 'Khanh Hoa',
  '58': 'Ninh Thuan',
  '60': 'Binh Thuan',
  '62': 'Kon Tum',
  '64': 'Gia Lai',
  '66': 'Dak Lak',
  '67': 'Dak Nong',
  '68': 'Lam Dong',
  '70': 'Binh Phuoc',
  '72': 'Tay Ninh',
  '74': 'Binh Duong',
  '75': 'Dong Nai',
  '77': 'Ba Ria Vung Tau',
  '79': 'Ho Chi Minh',
  '80': 'Long An',
  '82': 'Tien Giang',
  '83': 'Ben Tre',
  '84': 'Tra Vinh',
  '86': 'Vinh Long',
  '87': 'Dong Thap',
  '89': 'An Giang',
  '91': 'Kien Giang',
  '92': 'Can Tho',
  '93': 'Hau Giang',
  '94': 'Soc Trang',
  '95': 'Bac Lieu',
  '96': 'Ca Mau',
}

/**
 * ISO 3166-2:VN thật, 63 mã của thời 63 tỉnh. Tên ở đây là tên tỉnh CŨ, nên dùng bảng này
 * để kiểm **mã**, đừng kiểm tên: `VN-26` ISO ghi 'Thua Thien-Hue' còn tỉnh hiện hành tên 'Huế'.
 */
const REAL_ISO_3166_2_VN: Record<string, string> = {
  'VN-44': 'An Giang',
  'VN-43': 'Ba Ria - Vung Tau',
  'VN-54': 'Bac Giang',
  'VN-53': 'Bac Kan',
  'VN-55': 'Bac Lieu',
  'VN-56': 'Bac Ninh',
  'VN-50': 'Ben Tre',
  'VN-31': 'Binh Dinh',
  'VN-57': 'Binh Duong',
  'VN-58': 'Binh Phuoc',
  'VN-40': 'Binh Thuan',
  'VN-59': 'Ca Mau',
  'VN-CT': 'Can Tho',
  'VN-04': 'Cao Bang',
  'VN-DN': 'Da Nang',
  'VN-33': 'Dak Lak',
  'VN-72': 'Dak Nong',
  'VN-71': 'Dien Bien',
  'VN-39': 'Dong Nai',
  'VN-45': 'Dong Thap',
  'VN-30': 'Gia Lai',
  'VN-03': 'Ha Giang',
  'VN-63': 'Ha Nam',
  'VN-HN': 'Ha Noi',
  'VN-23': 'Ha Tinh',
  'VN-61': 'Hai Duong',
  'VN-HP': 'Hai Phong',
  'VN-73': 'Hau Giang',
  'VN-SG': 'Ho Chi Minh',
  'VN-14': 'Hoa Binh',
  'VN-66': 'Hung Yen',
  'VN-34': 'Khanh Hoa',
  'VN-47': 'Kien Giang',
  'VN-28': 'Kon Tum',
  'VN-01': 'Lai Chau',
  'VN-35': 'Lam Dong',
  'VN-09': 'Lang Son',
  'VN-02': 'Lao Cai',
  'VN-41': 'Long An',
  'VN-67': 'Nam Dinh',
  'VN-22': 'Nghe An',
  'VN-18': 'Ninh Binh',
  'VN-36': 'Ninh Thuan',
  'VN-68': 'Phu Tho',
  'VN-32': 'Phu Yen',
  'VN-24': 'Quang Binh',
  'VN-27': 'Quang Nam',
  'VN-29': 'Quang Ngai',
  'VN-52': 'Soc Trang',
  'VN-05': 'Son La',
  'VN-37': 'Tay Ninh',
  // VN-13 là Quảng Ninh và VN-25 là Quảng Trị. Bảng này từng ghi VN-13 cho Quảng Trị và
  // bỏ hẳn Quảng Ninh — sai, phát hiện 2026-10-26 khi đối chiếu với states.json.
  'VN-13': 'Quang Ninh',
  'VN-25': 'Quang Tri',
  'VN-20': 'Thai Binh',
  'VN-69': 'Thai Nguyen',
  'VN-21': 'Thanh Hoa',
  'VN-26': 'Thua Thien-Hue',
  'VN-46': 'Tien Giang',
  'VN-51': 'Tra Vinh',
  'VN-07': 'Tuyen Quang',
  'VN-49': 'Vinh Long',
  'VN-70': 'Vinh Phuc',
  'VN-06': 'Yen Bai',
}

type TopoGeometry = { code: string; gsoCode: string; nameEn: string }

const topoGeometries: TopoGeometry[] = (
  (topology as any).objects.vn_iso_province.geometries as any[]
).map((geometry) => ({
  code: geometry.properties[PROVINCE_CODE_PROPERTY] as string,
  gsoCode: geometry.properties.GSO_CODE as string,
  nameEn: geometry.properties.Name_EN as string,
}))

/** `VN-1` và `VN-01` là cùng một mã; ISO luôn đệm 2 chữ số, hệ Tổng cục Thống kê thì không */
const padCode = (code: string) => `VN-${code.replace(/^VN-/, '').padStart(2, '0')}`

/** Mọi tên tỉnh DB-IP 2026-10 thật sự ghi cho Việt Nam, lấy từ city.csv trên LiHi */
const DBIP_NAMES = [
  'Hanoi',
  'Ho Chi Minh City (HCMC)',
  'Ho Chi Minh',
  'Dong Nai',
  'Thanh Hóa Province',
  'Da Nang City',
  'Phu Tho',
  'Ninh Binh',
  'Hai Phong',
  'Bac Ninh',
  'Lam Dong',
  'Khanh Hoa',
  'Gia Lai',
  'Hưng Yên Province',
  'Dak Lak',
  'Nghệ An Province',
  'An Giang',
  'Tay Ninh',
  'Can Tho City',
  'Vinh Long',
  'Dong Thap',
  'Lao Cai',
  'Thai Nguyen',
  'Quang Tri',
  'Quảng Ninh',
  'Quang Ngai',
  'Tuyen Quang',
  'Hà Tĩnh Province',
  'Thừa Thiên Huế Province',
  'Ca Mau',
  'Lạng Sơn Province',
  'Sơn La Province',
  'Cao Bằng Province',
  'Điện Biên Province',
  'Lai Châu Province',
  'Thái Bình Province',
]

describe('bảng 34 tỉnh Việt Nam', () => {
  it('có đúng 34 đơn vị cấp tỉnh', () => {
    expect(VIETNAM_PROVINCES).toHaveLength(34)
  })

  it('mã tỉnh không trùng nhau', () => {
    const codes = VIETNAM_PROVINCES.map((p) => p.code)
    expect(new Set(codes).size).toBe(34)
    expect(PROVINCE_BY_CODE.size).toBe(34)
  })

  it('khớp đúng 34 mã của vietnam.json, không thiếu không thừa', () => {
    const topoCodes = new Set(topoGeometries.map((g) => g.code))
    expect(topoCodes.size).toBe(34)
    expect([...topoCodes].filter((code) => !PROVINCE_BY_CODE.has(code))).toEqual([])
    expect([...PROVINCE_BY_CODE.keys()].filter((code) => !topoCodes.has(code))).toEqual([])
  })
})

/**
 * Từ 2026-10-26 `ISO3166_2_CODE` của vietnam.json đúng như tên trường: ISO 3166-2 thật.
 * Khối này chốt bằng số, và chốt luôn rằng `GSO_CODE` còn giữ đủ nguồn gốc 63 tỉnh cũ — để
 * một lần đổi nửa vời, hoặc một lần thay tệp bản đồ bằng bản tải mới chưa chuyển, là đỏ ngay.
 */
describe('mã tỉnh trong vietnam.json là ISO 3166-2 thật', () => {
  it('cả 34 mã đều có trong bảng ISO 3166-2:VN', () => {
    const notIso = [...new Set(topoGeometries.map((g) => g.code))].filter(
      (code) => !REAL_ISO_3166_2_VN[code]
    )
    expect(notIso).toEqual([])
  })

  it('dùng mã chữ cho 5 thành phố trực thuộc trung ương', () => {
    const codes = new Set(topoGeometries.map((g) => g.code))
    for (const isoCode of ['VN-HN', 'VN-SG', 'VN-HP', 'VN-DN', 'VN-CT']) {
      expect(codes.has(isoCode), `thiếu ${isoCode}`).toBe(true)
    }
  })

  it('mọi vùng đều giữ GSO_CODE, và nó chuyển qua bảng ra đúng mã ISO của vùng', () => {
    const broken = topoGeometries.filter((g) => !g.gsoCode || GSO_TO_ISO[g.gsoCode] !== g.code)
    expect(broken).toEqual([])
  })

  it('GSO_CODE còn phủ đủ 63 tỉnh cũ, khớp bảng mã Tổng cục Thống kê', () => {
    const gsoCodes = new Set(topoGeometries.map((g) => g.gsoCode))
    expect(gsoCodes.size).toBe(63)
    const mismatched = [...gsoCodes].filter(
      (code) => !GSO_CODES[code.replace(/^VN-/, '').padStart(2, '0')]
    )
    expect(mismatched).toEqual([])
    expect(Object.keys(GSO_TO_ISO).sort()).toEqual([...gsoCodes].sort())
  })

  it('vì sao phải chuyển: 32/63 chuỗi mã trùng nhau mà chỉ vào hai tỉnh khác nhau', () => {
    const collisions = Object.keys(GSO_TO_ISO).filter((gso) => {
      const asIso = REAL_ISO_3166_2_VN[padCode(gso)]
      const gsoName = GSO_CODES[gso.replace(/^VN-/, '').padStart(2, '0')]
      return asIso && gsoName && normalizeProvinceName(asIso) !== normalizeProvinceName(gsoName)
    })
    expect(collisions).toHaveLength(32)
    // Khánh Hòa theo hệ cũ, Bắc Ninh theo ISO — đọc sai hệ là tô sai nửa nước
    expect(GSO_CODES['56']).toBe('Khanh Hoa')
    expect(REAL_ISO_3166_2_VN['VN-56']).toBe('Bac Ninh')
  })

  it('tệp vẫn là 247 vùng ranh giới 63 tỉnh cũ, nhiều vùng chung một mã ISO', () => {
    expect(topoGeometries).toHaveLength(247)
    const perCode = new Map<string, number>()
    for (const g of topoGeometries) perCode.set(g.code, (perCode.get(g.code) ?? 0) + 1)
    // Khánh Hòa gánh 152 đảo Trường Sa, nên nó là mã nhiều vùng nhất
    expect(Math.max(...perCode.values())).toBeGreaterThan(1)
  })
})

describe('resolveProvinceByIsoCode — lớp đổi ranh giới 63 → 34', () => {
  it('bảng mã cũ khớp đúng bảng ISO 3166-2 viết độc lập trong test này', () => {
    expect(Object.keys(LEGACY_ISO_CODES).sort()).toEqual(Object.keys(REAL_ISO_3166_2_VN).sort())
    const lech = Object.keys(LEGACY_ISO_CODES).filter(
      (code) =>
        normalizeProvinceName(LEGACY_ISO_CODES[code]) !==
        normalizeProvinceName(REAL_ISO_3166_2_VN[code])
    )
    expect(lech).toEqual([])
  })

  it('cả 63 mã cũ đều về được một tỉnh trong 34 tỉnh hiện hành', () => {
    const khongVe = Object.keys(LEGACY_ISO_CODES).filter((code) => !resolveProvinceByIsoCode(code))
    expect(khongVe).toEqual([])
    for (const code of Object.keys(LEGACY_ISO_CODES)) {
      expect(PROVINCE_BY_CODE.has(resolveProvinceByIsoCode(code)!.code)).toBe(true)
    }
  })

  it('mã của tỉnh đã sáp nhập về tỉnh tiếp nhận', () => {
    // VN-57 Bình Dương và VN-43 Bà Rịa - Vũng Tàu nay là TP.HCM
    expect(resolveProvinceByIsoCode('VN-57')?.code).toBe('VN-SG')
    expect(resolveProvinceByIsoCode('VN-43')?.code).toBe('VN-SG')
    // VN-61 Hải Dương nay là Hải Phòng; VN-70 Vĩnh Phúc nay là Phú Thọ
    expect(resolveProvinceByIsoCode('VN-61')?.code).toBe('VN-HP')
    expect(resolveProvinceByIsoCode('VN-70')?.code).toBe('VN-68')
  })

  it('mã của tỉnh còn nguyên trả về chính nó', () => {
    expect(resolveProvinceByIsoCode('VN-SG')?.code).toBe('VN-SG')
    expect(resolveProvinceByIsoCode('VN-HN')?.code).toBe('VN-HN')
    expect(resolveProvinceByIsoCode('VN-21')?.code).toBe('VN-21')
  })

  it('chịu được chữ thường và khoảng trắng', () => {
    expect(resolveProvinceByIsoCode(' vn-sg ')?.code).toBe('VN-SG')
    expect(resolveProvinceByIsoCode('vn-57')?.code).toBe('VN-SG')
  })

  it('mã rỗng, mã lạ và mã nước khác trả undefined', () => {
    for (const code of ['', null, undefined, 'VN-99', 'US-CA', 'SG']) {
      expect(resolveProvinceByIsoCode(code)).toBeUndefined()
    }
  })
})

describe('resolveVisitProvince — mã trước, tên sau', () => {
  it('ba dạng đo được trên LiHi đều về đúng TP.HCM hoặc Hà Nội', () => {
    // mã trần do bản vá cũ của worker gán — không phải ISO, nên phải cứu bằng tên
    expect(resolveVisitProvince({ region: 'SG', city: 'Ho Chi Minh' })?.code).toBe('VN-SG')
    // lối Apple Private Relay — mã ISO thật
    expect(resolveVisitProvince({ region: 'VN-SG', city: 'Ho Chi Minh City' })?.code).toBe('VN-SG')
    // lối DB-IP — không có mã, chỉ có tên tỉnh
    expect(resolveVisitProvince({ region: '', city: 'Hanoi' })?.code).toBe('VN-HN')
  })

  it('mã cứu được ca mà tên không cứu nổi: relay ở thành phố không trùng tên tỉnh', () => {
    // Dải relay cho `city` là tên THÀNH PHỐ. Tra tên là trượt; tra mã là ra Đồng Nai.
    expect(resolveVietnamProvince('Bien Hoa')).toBeUndefined()
    expect(resolveVisitProvince({ region: 'VN-39', city: 'Bien Hoa' })?.code).toBe('VN-39')
  })

  it('mã của tỉnh đã sáp nhập vẫn về tỉnh hiện hành', () => {
    expect(resolveVisitProvince({ region: 'VN-57', city: 'Binh Duong' })?.code).toBe('VN-SG')
  })

  it('mã đi TRƯỚC tên, không phải ngược lại', () => {
    // Hai tín hiệu mâu thuẫn: mã nói Hà Nội, tên nói Cà Mau. Mã phải thắng.
    expect(resolveVisitProvince({ region: 'VN-HN', city: 'Ca Mau' })?.code).toBe('VN-HN')
  })

  it('không tín hiệu nào nhận ra thì trả undefined, không đoán', () => {
    expect(resolveVisitProvince({ region: '', city: '' })).toBeUndefined()
    expect(resolveVisitProvince({ region: null, city: null })).toBeUndefined()
    expect(resolveVisitProvince({ region: 'ZZ', city: 'Ontario' })).toBeUndefined()
  })

  it('bộ ranh giới là bản sau sáp nhập 01/07/2025', () => {
    expect(VN_BOUNDARY_VERSION).toBe('vn-2025-07')
  })
})

describe('bảng 34 tỉnh Việt Nam, phần còn lại', () => {
  it('nhận ra tất cả tên DB-IP đang dùng cho Việt Nam', () => {
    const unresolved = DBIP_NAMES.filter((name) => !resolveVietnamProvince(name))
    expect(unresolved).toEqual([])
  })

  it('gộp hai cách DB-IP viết TP.HCM về cùng một tỉnh', () => {
    // 'Ho Chi Minh' là bản cũ; 'Ho Chi Minh City' xuất hiện sau khi áp bản GeoIP có Apple
    // Private Relay 22/10/2026. Không gộp thì bản đồ tô theo 86 thay vì 87 lượt.
    expect(resolveVietnamProvince('Ho Chi Minh')?.code).toBe('VN-SG')
    expect(resolveVietnamProvince('Ho Chi Minh City')?.code).toBe('VN-SG')
    expect(resolveVietnamProvince('Ho Chi Minh City (HCMC)')?.code).toBe('VN-SG')
  })

  it('đưa tên 63 tỉnh cũ về tỉnh mới chứa nó', () => {
    expect(resolveVietnamProvince('Vinh Phuc')?.nameVi).toBe('Phú Thọ')
    expect(resolveVietnamProvince('Hoa Binh')?.nameVi).toBe('Phú Thọ')
    expect(resolveVietnamProvince('Binh Duong')?.nameVi).toBe('TP. Hồ Chí Minh')
    expect(resolveVietnamProvince('Hai Duong')?.nameVi).toBe('Hải Phòng')
    expect(resolveVietnamProvince('Quang Nam')?.nameVi).toBe('Đà Nẵng')
  })

  it('không nhận tỉnh của nước khác', () => {
    for (const name of ['Ontario', 'Jeollabuk-do', 'Seoul', 'California', '', null, undefined]) {
      expect(resolveVietnamProvince(name)).toBeUndefined()
    }
  })

  describe('normalizeProvinceName', () => {
    it('bỏ dấu, hậu tố hành chính và phần trong ngoặc', () => {
      expect(normalizeProvinceName('Thừa Thiên Huế Province')).toBe('thua thien hue')
      expect(normalizeProvinceName('Ho Chi Minh City (HCMC)')).toBe('ho chi minh')
      expect(normalizeProvinceName('Thua Thien - Hue')).toBe('thua thien hue')
      expect(normalizeProvinceName('Đắk Lắk')).toBe('dak lak')
    })

    it('chuỗi rỗng và null ra khoá rỗng, không ném', () => {
      expect(normalizeProvinceName('')).toBe('')
      expect(normalizeProvinceName(null)).toBe('')
      expect(normalizeProvinceName(undefined)).toBe('')
    })
  })
})

describe('groupByVietnamProvince', () => {
  it('cộng dồn các cách viết tên khác nhau của cùng một tỉnh', () => {
    const result = groupByVietnamProvince([
      { city: 'Ho Chi Minh', count: 86 },
      { city: 'Ho Chi Minh City', count: 1 },
      { city: 'Hanoi', count: 8 },
    ])
    expect(result.matched).toHaveLength(2)
    expect(result.matched[0].province.code).toBe('VN-SG')
    expect(result.matched[0].count).toBe(87)
    expect(result.matched[0].sourceNames).toEqual(['Ho Chi Minh', 'Ho Chi Minh City'])
    expect(result.matched[1].count).toBe(8)
    expect(result.matchedTotal).toBe(95)
  })

  it('sắp xếp giảm dần theo số lượt', () => {
    const result = groupByVietnamProvince([
      { city: 'Hanoi', count: 8 },
      { city: 'Ho Chi Minh', count: 87 },
      { city: 'Da Nang City', count: 20 },
    ])
    expect(result.matched.map((e) => e.count)).toEqual([87, 20, 8])
  })

  it('tách riêng phần không nhận ra tỉnh, không cộng vào matchedTotal', () => {
    const result = groupByVietnamProvince([
      { city: 'Ho Chi Minh', count: 10 },
      { city: 'Ontario', count: 15 },
      { city: '', count: 31 },
    ])
    expect(result.matchedTotal).toBe(10)
    expect(result.unmatchedTotal).toBe(46)
    expect(result.unmatched.map((u) => u.city)).toEqual(['Ontario', ''])
  })

  it('bỏ qua hàng không nhận ra mà cũng không có lượt nào', () => {
    const result = groupByVietnamProvince([{ city: 'Nowhere', count: 0 }])
    expect(result.unmatched).toEqual([])
    expect(result.unmatchedTotal).toBe(0)
  })

  it('dữ liệu rỗng hoặc undefined ra kết quả rỗng', () => {
    for (const input of [undefined, []]) {
      const result = groupByVietnamProvince(input)
      expect(result.matched).toEqual([])
      expect(result.matchedTotal).toBe(0)
      expect(result.unmatchedTotal).toBe(0)
    }
  })
})
