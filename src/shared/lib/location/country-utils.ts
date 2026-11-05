/**
 * Country code to flag emoji mapping
 * Uses regional indicator symbols (U+1F1E6 to U+1F1FF)
 */
export function countryCodeToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return ''

  const upperCode = code.toUpperCase()

  // Convert country code to regional indicator symbols
  // A = 🇦, B = 🇧, etc.
  const codePoints = [...upperCode].map((char) => 127397 + char.charCodeAt(0))

  try {
    return String.fromCodePoint(...codePoints)
  } catch {
    return ''
  }
}

/**
 * Format location into human-readable string
 * @example "Ho Chi Minh, VN 🇻🇳"
 * @example "San Francisco, California, US 🇺🇸"
 */
export function formatLocation(
  city: string | null | undefined,
  region: string | null | undefined,
  country: string | null | undefined,
  options?: { showFlag?: boolean }
): string {
  const showFlag = options?.showFlag ?? true
  const parts: string[] = []

  // City
  if (city && city !== 'unknown' && city.toLowerCase() !== 'unknown') {
    parts.push(city)
  }

  // Region (skip if same as city)
  if (region && region !== 'unknown' && region.toLowerCase() !== 'unknown' && region !== city) {
    parts.push(region)
  }

  // Country with optional flag
  if (country && country !== 'unknown' && country.toLowerCase() !== 'unknown') {
    const flag = showFlag ? countryCodeToFlag(country) : ''
    parts.push(flag ? `${country} ${flag}` : country)
  }

  return parts.length > 0 ? parts.join(', ') : 'Unknown location'
}

/**
 * Tên nước theo locale, hoặc `null` khi KHÔNG có tên dùng được.
 *
 * Đây là lớp nguyên thuỷ; `getCountryName` ngay dưới là lớp tiện dụng bọc ngoài. Hai lớp vì hai
 * nơi gọi cần hai thứ khác nhau: bảng Customers muốn luôn có chuỗi để in, còn card "Theo vị trí"
 * cần biết lúc nào KHÔNG tra được để lùi về tên trong payload — trả về chính mã ở đó sẽ in ra
 * "VN" thay vì "Viet Nam".
 *
 * Ba cạm bẫy của `Intl.DisplayNames`, đã ĐO trên Node 22 của repo chứ không đoán:
 * - `of('VN-SG')`, `of('VNM')`, `of('')` **ném `RangeError`** — nó chỉ nhận mã alpha-2. Chặn bằng
 *   cả regex lẫn `try`; regex là lớp thứ hai, `try` mới là lớp thật sự chặn.
 * - Mã không có trong bảng (`XX`) và mã SỐ (`840`, `004`) trả lại **chính chuỗi mã**, không phải
 *   `undefined`. Đó không phải một cái tên. `isValidCountryCode` ở dưới dựa chính xác vào hành
 *   vi này, nên đừng "sửa" nó.
 * - Mã viết thường (`'vn'`) cũng trả lại chính nó — phải `toUpperCase()` trước khi hỏi.
 * - `ZZ` ra "Unknown Region" / "Vùng không xác định": hợp lệ, không phải lỗi.
 */
export function countryDisplayName(code: string, locale: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(code)) return null
  const upper = code.toUpperCase()
  try {
    const name = new Intl.DisplayNames([locale], { type: 'region' }).of(upper)
    return !name || name === upper ? null : name
  } catch {
    return null
  }
}

/**
 * Get full country name from ISO 3166-1 alpha-2 code
 * @example "VN" -> "Vietnam"
 * @example "US" -> "United States"
 *
 * Luôn trả về một chuỗi: lùi về chính mã khi không tra được. Hợp đồng này giữ nguyên từng ca khi
 * ruột chuyển sang `countryDisplayName` — `'XX'`, `'840'`, `'VNM'`, `'VN-SG'` đều ra chính mã ở
 * cả bản cũ lẫn bản mới, và `''`/null vẫn ra `'Unknown'`.
 */
export function getCountryName(code: string | null | undefined, locale: string = 'en'): string {
  if (!code) return 'Unknown'
  return countryDisplayName(code, locale) ?? code
}

/**
 * Mã nước có tra được tên không.
 *
 * Trước đây hàm này tự dựng `Intl.DisplayNames` lần thứ ba trong cùng một file, với cùng mẹo
 * "mã không hợp lệ thì ICU trả lại chính chuỗi mã". Nay nó hỏi `countryDisplayName` — cùng một
 * sự thật, một chỗ.
 *
 * Đã kiểm là TƯƠNG ĐƯƠNG, không phải "chắc là giống": hai bản cho cùng kết quả ở mọi ca, kể cả
 * `'1A'` và `'--'` (độ dài 2 nhưng `of()` ném `RangeError`), `'ZZ'` (ICU có tên nên hợp lệ),
 * `'840'` và `'VNM'` (trả lại chính mã nên không hợp lệ).
 */
export function isValidCountryCode(code: string | null | undefined): boolean {
  return !!code && countryDisplayName(code, 'en') !== null
}
