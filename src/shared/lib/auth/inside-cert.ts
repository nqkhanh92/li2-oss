import * as jose from 'jose'

/**
 * Cert PHỤ: chấp nhận thêm token do ứng dụng Casdoor của Inside (`admin.li2.ai`) phát hành.
 *
 * Vì sao cần: Inside đăng nhập qua một **ứng dụng Casdoor khác** (`inside-sapi`), ký bằng
 * `cert-built-in`, trong khi li2-app là ứng dụng `Proxify` ký bằng `cert-quik`. Cùng một
 * organization và cùng kho người dùng, nên `id`/`email` trỏ đúng một người — chỉ chữ ký là khác.
 * Không có tầng này thì `jwtVerify` ném ngay ở chữ ký và mọi lời gọi từ Inside trả 401, chưa kịp
 * chạm tới cổng quyền.
 *
 * ⚠ **Vì sao KHÔNG chỉ cần cert.** `cert-built-in` là cert mặc định của Casdoor và **dùng chung
 * với `app-built-in`** — chính ứng dụng console của Casdoor (kiểm trên LiHi: bảng `application`
 * cho `app-built-in → cert-built-in`, `lihi-app → cert-lihi`). Nhận mọi token ký bằng cert đó là
 * nhận token của **mọi** ứng dụng dùng cert mặc định, cho **toàn bộ** route có `withAuth` chứ
 * không riêng endpoint admin.
 *
 * Nên cert phụ còn phải kèm **audience**: token Casdoor mang `aud` (mảng) và `azp` bằng
 * `client_id` của ứng dụng phát hành. Khớp đúng client id của Inside thì mới nhận.
 *
 * Hệ quả vận hành: **cần hai biến môi trường, thiếu một là tắt hẳn tầng này** (quay về đúng hành
 * vi cũ). Fail closed — khi không chắc token đến từ đâu thì câu trả lời đúng là từ chối.
 */

export const INSIDE_CERT_ENV = 'CASDOOR_INSIDE_BASE64_CERT'
export const INSIDE_CLIENT_ID_ENV = 'CASDOOR_INSIDE_CLIENT_ID'

let cachedInsideKey: jose.CryptoKey | null = null
let cachedFromCert: string | null = null

const readCert = () => process.env[INSIDE_CERT_ENV]?.trim() || ''
export const getInsideClientId = () => process.env[INSIDE_CLIENT_ID_ENV]?.trim() || ''

/** Bật khi và chỉ khi có ĐỦ cả cert lẫn client id. */
export const isInsideCertConfigured = () => Boolean(readCert() && getInsideClientId())

/**
 * `null` khi chưa cấu hình đủ, hoặc khi cert không giải mã được — nơi gọi coi như không có cert
 * phụ. Không ném: một cert phụ hỏng không được làm chết đường đăng nhập chính.
 *
 * Cache theo đúng chuỗi cert đang dùng, nên xoay cert bằng env rồi khởi động lại là ăn ngay,
 * và một lần đổi env không để lại khoá cũ trong bộ nhớ.
 */
export const getInsidePublicKey = async (): Promise<jose.CryptoKey | null> => {
  const base64Cert = readCert()
  if (!base64Cert || !getInsideClientId()) return null

  if (cachedInsideKey && cachedFromCert === base64Cert) return cachedInsideKey

  try {
    const pem = Buffer.from(base64Cert, 'base64').toString('ascii')
    cachedInsideKey = await jose.importX509(pem, 'RS256')
    cachedFromCert = base64Cert
    return cachedInsideKey
  } catch {
    cachedInsideKey = null
    cachedFromCert = null
    return null
  }
}

/**
 * Token này có đúng là của ứng dụng Inside không.
 *
 * Casdoor đặt `aud` là **mảng** client id và `azp` là chuỗi client id. Nhận nếu một trong hai
 * khớp — `azp` là thứ chắc chắn có ở token do Casdoor phát, `aud` là dạng chuẩn.
 */
export const isInsideAudience = (payload: jose.JWTPayload): boolean => {
  const clientId = getInsideClientId()
  if (!clientId) return false

  const { aud, azp } = payload as { aud?: string | string[]; azp?: unknown }
  if (typeof azp === 'string' && azp === clientId) return true
  if (typeof aud === 'string') return aud === clientId
  if (Array.isArray(aud)) return aud.includes(clientId)
  return false
}
