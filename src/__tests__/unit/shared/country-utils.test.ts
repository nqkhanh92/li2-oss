import { describe, it, expect } from 'vitest'
import {
  countryDisplayName,
  getCountryName,
  isValidCountryCode,
} from '@/shared/lib/location/country-utils'

/**
 * File này sinh ra khi `countryDisplayName` được dời xuống đây để **không có hai bản** cùng gọi
 * `Intl.DisplayNames`. Trước đó `country-utils.ts` không có một test nào, nên việc "giữ nguyên
 * hợp đồng của `getCountryName`" là một lời hứa suông — nay nó được ghim.
 *
 * Ghim theo MÃ, và chỉ `VN`/`US` ghim cứng chuỗi: tên trong ICU đổi giữa các bản, đòi đúng 20
 * chuỗi là tự tạo việc bảo trì cho người sau.
 */
describe('countryDisplayName — lớp nguyên thuỷ, trả null khi không tra được', () => {
  it('cho tên theo locale', () => {
    expect(countryDisplayName('VN', 'vi')).toBe('Việt Nam')
    expect(countryDisplayName('VN', 'en')).toBe('Vietnam')
  })

  it('nhận mã viết thường — Intl trả lại chính chuỗi nếu không uppercase trước', () => {
    expect(countryDisplayName('vn', 'vi')).toBe('Việt Nam')
  })

  it('mã KHÔNG phải alpha-2 trả null thay vì NÉM', () => {
    // `Intl.DisplayNames.of` ném RangeError với ba giá trị này.
    for (const bad of ['VN-SG', '', 'VNM']) {
      expect(countryDisplayName(bad, 'vi')).toBeNull()
    }
  })

  it('mã không có trong bảng trả null, không trả lại chính chuỗi mã', () => {
    expect(countryDisplayName('XX', 'vi')).toBeNull()
  })

  it('mã SỐ trả null — ICU không giải mã số thành tên', () => {
    // Đo được: of('840') ra '840' chứ không ra 'United States'.
    expect(countryDisplayName('840', 'en')).toBeNull()
  })

  it('locale lạ không làm vỡ', () => {
    expect(countryDisplayName('VN', 'xx-YY-zz-invalid')).toBeNull()
  })
})

/**
 * `getCountryName` đã có từ trước và có 3 nơi gọi trong `features/customers`. Ruột của nó nay là
 * `countryDisplayName`, nên bộ test này tồn tại để chứng minh hợp đồng KHÔNG đổi ca nào.
 */
describe('getCountryName — lớp tiện dụng, luôn trả về một chuỗi', () => {
  it('rỗng / null / undefined ra "Unknown"', () => {
    expect(getCountryName(null)).toBe('Unknown')
    expect(getCountryName(undefined)).toBe('Unknown')
    expect(getCountryName('')).toBe('Unknown')
  })

  it('mã hợp lệ ra tên, mặc định locale en', () => {
    expect(getCountryName('VN')).toBe('Vietnam')
    expect(getCountryName('VN', 'vi')).toBe('Việt Nam')
  })

  it('LÙI VỀ CHÍNH MÃ khi không tra được — đây là chỗ nó khác countryDisplayName', () => {
    // Bảng Customers cần luôn có chuỗi để in; card "Theo vị trí" thì cần null để lùi về payload.
    for (const code of ['XX', '840', 'VNM', 'VN-SG']) {
      expect(getCountryName(code)).toBe(code)
    }
  })

  it('không bao giờ ném, kể cả với locale hỏng', () => {
    expect(() => getCountryName('VN', 'xx-YY-zz-invalid')).not.toThrow()
    expect(getCountryName('VN', 'xx-YY-zz-invalid')).toBe('VN')
  })
})

/**
 * `isValidCountryCode` DỰA CHÍNH XÁC vào việc Intl trả lại chuỗi mã khi mã không hợp lệ — đúng
 * cái hành vi `countryDisplayName` đang khai thác. Nó không bị sửa, nhưng phải có test để lần
 * sau ai "dọn" một trong hai thì bên kia đỏ ngay.
 */
describe('isValidCountryCode — không bị đụng tới, nhưng nay có test', () => {
  it('mã thật là hợp lệ', () => {
    expect(isValidCountryCode('VN')).toBe(true)
    expect(isValidCountryCode('vn')).toBe(true)
    expect(isValidCountryCode('US')).toBe(true)
  })

  it('mã lạ, mã sai độ dài và rỗng là KHÔNG hợp lệ', () => {
    for (const bad of ['XX', 'VNM', '840', '', null, undefined]) {
      expect(isValidCountryCode(bad)).toBe(false)
    }
  })

  it('ZZ được coi là hợp lệ vì ICU có tên cho nó', () => {
    // Không phải lỗi: ZZ là mã dành riêng, ICU trả "Unknown Region". Ghi ra đây để lần sau ai
    // thấy lạ thì biết đó là hành vi đã biết chứ không phải sót.
    expect(isValidCountryCode('ZZ')).toBe(true)
  })
})
