import { describe, expect, it } from 'vitest'
import {
  KNOWN_COUNTRY_COUNT,
  SUBDIVISION_BY_CODE,
  SUBDIVISION_COUNT_BY_COUNTRY,
  countryCenterOf,
  countryNameOf,
  normalizeSubdivisionCode,
  resolveSubdivision,
} from '@/shared/constants/subdivisions'
import { VIETNAM_PROVINCES } from '@/shared/constants/vietnam-provinces'

describe('bảng đơn vị cấp 1 dựng từ states.json', () => {
  it('Việt Nam có đúng 34 đơn vị — mẫu số của coverage.total_units', () => {
    expect(SUBDIVISION_COUNT_BY_COUNTRY.get('VN')).toBe(34)
  })

  it('cả 34 mã tỉnh của app đều có toạ độ trong states.json', () => {
    const missing = VIETNAM_PROVINCES.filter(
      (province) => !SUBDIVISION_BY_CODE.has(province.code)
    ).map((province) => province.code)
    expect(missing).toEqual([])
    expect(VIETNAM_PROVINCES).toHaveLength(34)
  })

  it('toạ độ là số hữu hạn, không phải chuỗi', () => {
    for (const province of VIETNAM_PROVINCES) {
      const subdivision = SUBDIVISION_BY_CODE.get(province.code)!
      expect(Number.isFinite(subdivision.lat)).toBe(true)
      expect(Number.isFinite(subdivision.lng)).toBe(true)
    }
  })

  it('nước không có bảng đơn vị cấp 1 thì vắng mặt, không phải bằng 0', () => {
    // Vatican (VA) và Gibraltar (GI) không có hàng nào trong states.json — đã đếm: 26 nước
    // trong countryMapping ở tình trạng này. Đó là lý do region_supported tồn tại.
    expect(SUBDIVISION_COUNT_BY_COUNTRY.get('VA')).toBeUndefined()
    expect(SUBDIVISION_COUNT_BY_COUNTRY.get('GI')).toBeUndefined()
  })

  it('tên và tâm nước tra được theo mã alpha-2', () => {
    expect(countryNameOf('VN')).toBe('Viet Nam')
    expect(countryCenterOf('VN')).not.toBeNull()
    expect(KNOWN_COUNTRY_COUNT).toBeGreaterThan(200)
  })

  it('mã nước lạ trả lại chính mã, và không có tâm', () => {
    expect(countryNameOf('QQ')).toBe('QQ')
    expect(countryCenterOf('QQ')).toBeNull()
  })
})

describe('normalizeSubdivisionCode', () => {
  it('gắn tiền tố cho mã trần — 105 lượt TP.HCM trên LiHi có region="SG"', () => {
    expect(normalizeSubdivisionCode('VN', 'SG')).toBe('VN-SG')
  })

  it('giữ nguyên mã đã đủ tiền tố', () => {
    expect(normalizeSubdivisionCode('VN', 'VN-SG')).toBe('VN-SG')
    expect(normalizeSubdivisionCode('vn', 'vn-hn')).toBe('VN-HN')
  })

  it('từ chối chuỗi có khoảng trắng — đó là TÊN, không phải mã', () => {
    expect(normalizeSubdivisionCode('VN', 'Ho Chi Minh City')).toBeNull()
    expect(normalizeSubdivisionCode('CA', 'British Columbia')).toBeNull()
  })

  it('rỗng và null trả null, không đoán', () => {
    expect(normalizeSubdivisionCode('VN', '')).toBeNull()
    expect(normalizeSubdivisionCode('VN', null)).toBeNull()
    expect(normalizeSubdivisionCode('VN', undefined)).toBeNull()
  })
})

describe('resolveSubdivision — ba tổ hợp thật đo trên LiHi 2026-10-26', () => {
  it('region_iso có sẵn thì dùng luôn', () => {
    const unit = resolveSubdivision('VN', {
      region: 'SG',
      city: 'Ho Chi Minh',
      region_iso: 'VN-SG',
    })
    expect(unit?.code).toBe('VN-SG')
  })

  it('region_iso NULL + region là mã trần vẫn ra tỉnh (hàng mới của worker Go)', () => {
    const unit = resolveSubdivision('VN', {
      region: 'SG',
      city: 'Ho Chi Minh',
      region_iso: null,
    })
    expect(unit?.code).toBe('VN-SG')
  })

  it('region_iso NULL + region rỗng, chỉ còn TÊN ở city — 15 lượt Hà Nội', () => {
    const unit = resolveSubdivision('VN', { region: '', city: 'Hanoi', region_iso: null })
    expect(unit?.code).toBe('VN-HN')
  })

  it('region_iso NULL + region="VN-SG" — đúng hàng đã lọt vào LiHi sau backfill', () => {
    const unit = resolveSubdivision('VN', {
      region: 'VN-SG',
      city: 'Ho Chi Minh City',
      region_iso: null,
    })
    expect(unit?.code).toBe('VN-SG')
  })

  it('mã ISO của tỉnh ĐÃ SÁP NHẬP vẫn về được tỉnh hiện hành', () => {
    // VN-57 = Bình Dương, không còn trong bảng 34 tỉnh; phải về TP.HCM
    const unit = resolveSubdivision('VN', { region: null, city: null, region_iso: 'VN-57' })
    expect(unit?.code).toBe('VN-SG')
  })

  it('tên thành phố của dải Apple Private Relay không khớp tỉnh thì vẫn cứu được bằng mã', () => {
    const unit = resolveSubdivision('VN', {
      region: 'VN-SG',
      city: 'Bien Hoa',
      region_iso: null,
    })
    expect(unit?.code).toBe('VN-SG')
  })

  it('không tín hiệu nào thì trả undefined, không đoán', () => {
    expect(resolveSubdivision('VN', { region: null, city: null, region_iso: null })).toBeUndefined()
    expect(
      resolveSubdivision('VN', { region: 'Atlantis', city: 'Atlantis', region_iso: null })
    ).toBeUndefined()
  })
})

describe('resolveSubdivision — nước khác Việt Nam dùng states.json trực tiếp', () => {
  it('tra theo mã ISO', () => {
    expect(resolveSubdivision('CA', { region: 'CA-ON', city: null, region_iso: null })?.name).toBe(
      'Ontario'
    )
  })

  it('tra theo mã trần', () => {
    expect(resolveSubdivision('CA', { region: 'ON', city: null, region_iso: null })?.code).toBe(
      'CA-ON'
    )
  })

  it('tra theo TÊN vùng — DB-IP nhét tên vào cột region', () => {
    expect(
      resolveSubdivision('CA', { region: 'Ontario', city: null, region_iso: null })?.code
    ).toBe('CA-ON')
  })

  it('mã đúng dạng nhưng thuộc nước khác thì không nhận', () => {
    expect(
      resolveSubdivision('CA', { region: 'VN-SG', city: null, region_iso: null })
    ).toBeUndefined()
  })
})
