/**
 * Chuyển mã tỉnh trong `src/public/json/vietnam.json` sang ISO 3166-2 thật.
 *
 * Tệp bản đồ gốc đặt tên trường là `ISO3166_2_CODE` nhưng giá trị lại là **mã Tổng cục
 * Thống kê** (bảng mã 63 tỉnh, Quyết định 124/2004/QĐ-TTg) thêm tiền tố `VN-`. Hai hệ cùng
 * dạng `VN-NN`, và **32 trong 63 chuỗi trùng nhau mà chỉ vào hai tỉnh khác nhau** — `VN-56` là Khánh
 * Hòa theo hệ cũ nhưng Bắc Ninh theo ISO, `VN-26` là Vĩnh Phúc theo hệ cũ nhưng Huế theo
 * ISO. Để hai hệ cùng tồn tại là để sẵn một bãi mìn, nên hệ cũ bị chuyển hẳn.
 *
 * Script ghi `GSO_CODE` giữ mã gốc rồi thay `ISO3166_2_CODE` bằng mã ISO. Vùng nào đã có
 * `GSO_CODE` thì bỏ qua, nên chạy lại bao nhiêu lần cũng cho cùng một kết quả.
 *
 *   node scripts/vietnam-map-to-iso.mjs            # chuyển, ghi đè tệp
 *   node scripts/vietnam-map-to-iso.mjs --check    # chỉ báo, không ghi; thoát 1 nếu còn sót
 *
 * `vietnam-provinces.test.ts` đối chiếu bảng dưới với tệp bản đồ và với 34 tỉnh trong
 * `vietnam-provinces.ts`, nên bảng này lệch là test đỏ.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAP_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/public/json/vietnam.json')

/** Mã Tổng cục Thống kê của 63 tỉnh cũ → mã ISO 3166-2 của tỉnh hiện hành chứa nó */
export const GSO_TO_ISO = {
  'VN-1': 'VN-HN', // Hà Nội -> Hà Nội
  'VN-46': 'VN-26', // Thừa Thiên-Huế -> Huế
  'VN-31': 'VN-HP', // Hải Phòng -> Hải Phòng
  'VN-30': 'VN-HP', // Hải Dương -> Hải Phòng
  'VN-48': 'VN-DN', // Đà Nẵng -> Đà Nẵng
  'VN-49': 'VN-DN', // Quảng Nam -> Đà Nẵng
  'VN-92': 'VN-CT', // Cần Thơ -> Cần Thơ
  'VN-93': 'VN-CT', // Hậu Giang -> Cần Thơ
  'VN-94': 'VN-CT', // Sóc Trăng -> Cần Thơ
  'VN-79': 'VN-SG', // TP. Hồ Chí Minh -> TP. Hồ Chí Minh
  'VN-74': 'VN-SG', // Bình Dương -> TP. Hồ Chí Minh
  'VN-77': 'VN-SG', // Bà Rịa - Vũng Tàu -> TP. Hồ Chí Minh
  'VN-12': 'VN-01', // Lai Châu -> Lai Châu
  'VN-11': 'VN-71', // Điện Biên -> Điện Biên
  'VN-14': 'VN-05', // Sơn La -> Sơn La
  'VN-20': 'VN-09', // Lạng Sơn -> Lạng Sơn
  'VN-22': 'VN-13', // Quảng Ninh -> Quảng Ninh
  'VN-38': 'VN-21', // Thanh Hóa -> Thanh Hóa
  'VN-40': 'VN-22', // Nghệ An -> Nghệ An
  'VN-42': 'VN-23', // Hà Tĩnh -> Hà Tĩnh
  'VN-4': 'VN-04', // Cao Bằng -> Cao Bằng
  'VN-8': 'VN-07', // Tuyên Quang -> Tuyên Quang
  'VN-2': 'VN-07', // Hà Giang -> Tuyên Quang
  'VN-10': 'VN-02', // Lào Cai -> Lào Cai
  'VN-15': 'VN-02', // Yên Bái -> Lào Cai
  'VN-19': 'VN-69', // Thái Nguyên -> Thái Nguyên
  'VN-6': 'VN-69', // Bắc Kạn -> Thái Nguyên
  'VN-25': 'VN-68', // Phú Thọ -> Phú Thọ
  'VN-17': 'VN-68', // Hòa Bình -> Phú Thọ
  'VN-26': 'VN-68', // Vĩnh Phúc -> Phú Thọ
  'VN-27': 'VN-56', // Bắc Ninh -> Bắc Ninh
  'VN-24': 'VN-56', // Bắc Giang -> Bắc Ninh
  'VN-33': 'VN-66', // Hưng Yên -> Hưng Yên
  'VN-34': 'VN-66', // Thái Bình -> Hưng Yên
  'VN-37': 'VN-18', // Ninh Bình -> Ninh Bình
  'VN-35': 'VN-18', // Hà Nam -> Ninh Bình
  'VN-36': 'VN-18', // Nam Định -> Ninh Bình
  'VN-45': 'VN-25', // Quảng Trị -> Quảng Trị
  'VN-44': 'VN-25', // Quảng Bình -> Quảng Trị
  'VN-51': 'VN-29', // Quảng Ngãi -> Quảng Ngãi
  'VN-62': 'VN-29', // Kon Tum -> Quảng Ngãi
  'VN-64': 'VN-30', // Gia Lai -> Gia Lai
  'VN-52': 'VN-30', // Bình Định -> Gia Lai
  'VN-56': 'VN-34', // Khánh Hòa -> Khánh Hòa
  'VN-58': 'VN-34', // Ninh Thuận -> Khánh Hòa
  'VN-68': 'VN-35', // Lâm Đồng -> Lâm Đồng
  'VN-60': 'VN-35', // Bình Thuận -> Lâm Đồng
  'VN-67': 'VN-35', // Đắk Nông -> Lâm Đồng
  'VN-66': 'VN-33', // Đắk Lắk -> Đắk Lắk
  'VN-54': 'VN-33', // Phú Yên -> Đắk Lắk
  'VN-75': 'VN-39', // Đồng Nai -> Đồng Nai
  'VN-70': 'VN-39', // Bình Phước -> Đồng Nai
  'VN-72': 'VN-37', // Tây Ninh -> Tây Ninh
  'VN-80': 'VN-37', // Long An -> Tây Ninh
  'VN-86': 'VN-49', // Vĩnh Long -> Vĩnh Long
  'VN-83': 'VN-49', // Bến Tre -> Vĩnh Long
  'VN-84': 'VN-49', // Trà Vinh -> Vĩnh Long
  'VN-87': 'VN-45', // Đồng Tháp -> Đồng Tháp
  'VN-82': 'VN-45', // Tiền Giang -> Đồng Tháp
  'VN-89': 'VN-44', // An Giang -> An Giang
  'VN-91': 'VN-44', // Kiên Giang -> An Giang
  'VN-96': 'VN-59', // Cà Mau -> Cà Mau
  'VN-95': 'VN-59', // Bạc Liêu -> Cà Mau
}

function main() {
  const checkOnly = process.argv.includes('--check')
  const topology = JSON.parse(readFileSync(MAP_PATH, 'utf8'))
  const geometries = topology.objects?.vn_iso_province?.geometries
  if (!Array.isArray(geometries)) {
    throw new Error(`Không thấy objects.vn_iso_province.geometries trong ${MAP_PATH}`)
  }

  let converted = 0
  let alreadyIso = 0
  const unknown = new Set()

  for (const geometry of geometries) {
    const properties = geometry.properties
    if (!properties) continue
    if (properties.GSO_CODE) {
      alreadyIso++
      continue
    }
    const gso = properties.ISO3166_2_CODE
    const iso = GSO_TO_ISO[gso]
    if (!iso) {
      unknown.add(gso)
      continue
    }
    properties.GSO_CODE = gso
    properties.ISO3166_2_CODE = iso
    converted++
  }

  if (unknown.size > 0) {
    console.error(`Mã không có trong bảng: ${[...unknown].sort().join(', ')}`)
    process.exit(1)
  }

  const distinctIso = new Set(geometries.map((g) => g.properties?.ISO3166_2_CODE))
  console.log(
    `${geometries.length} vùng | chuyển ${converted} | đã là ISO từ trước ${alreadyIso} | ${distinctIso.size} mã ISO khác nhau`
  )

  if (checkOnly) {
    if (converted > 0) {
      console.error(
        'Tệp bản đồ còn mã Tổng cục Thống kê chưa chuyển. Chạy script không có --check.'
      )
      process.exit(1)
    }
    return
  }

  if (converted > 0) {
    writeFileSync(MAP_PATH, JSON.stringify(topology))
    console.log(`Đã ghi ${MAP_PATH}`)
  } else {
    console.log('Không có gì phải đổi.')
  }
}

// Chỉ chạy khi gọi trực tiếp. `vietnam-provinces.test.ts` import GSO_TO_ISO từ đây, và nếu
// script tự chạy lúc import thì một lần `yarn test` có thể GHI ĐÈ tệp bản đồ.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
