import { createHmac } from 'node:crypto'

/**
 * Băm địa chỉ IP thành một mã khách truy cập, có muối đổi theo NGÀY.
 *
 * Hai điều muốn đồng thời: đếm được "bao nhiêu người khác nhau hôm nay", và không lưu được
 * danh tính ai. Muối theo ngày cho cả hai: trong một ngày cùng IP ra cùng mã (đếm được),
 * sang ngày khác mã đổi hẳn (không nối được chuỗi hành vi qua nhiều ngày).
 *
 * Bản thương mại đi hướng ngược lại: `short-url.controller.go:77-78` đọc fingerprint từ **cookie
 * do client tự đặt** (`x-canvas-fp`, `x-browser-fp`), và có một nhánh dành riêng cho một khách
 * hàng **bịa** fingerprint bằng `uuid.New()` — làm mọi phép đếm khách duy nhất của họ thành vô
 * nghĩa. Cookie do client đặt không phải bằng chứng về client.
 */
export function visitorHash(ip: string | null, secret: string, now = new Date()): string | null {
  if (!ip) return null
  const day = now.toISOString().slice(0, 10) // YYYY-MM-DD, UTC
  return createHmac('sha256', `${secret}:${day}`).update(ip).digest('base64url').slice(0, 22)
}

/**
 * Lấy IP thật phía sau reverse proxy.
 *
 * `x-forwarded-for` là danh sách do các proxy nối thêm vào. Phần tử ĐẦU là cái client gửi, nên
 * client tự đặt được — tin nó là tin dữ liệu của kẻ tấn công. Phần tử cuối là cái proxy gần nhất
 * ghi. Ở đây lấy phần tử đầu **chỉ khi** `TRUSTED_PROXY` được bật, vì chỉ người vận hành biết
 * instance của họ có đứng sau proxy hay không.
 */
export function clientIp(headers: Headers, trustProxy: boolean): string | null {
  if (trustProxy) {
    const xff = headers.get('x-forwarded-for')
    if (xff) {
      const first = xff.split(',')[0]?.trim()
      if (first) return first
    }
    const real = headers.get('x-real-ip')
    if (real) return real.trim()
  }
  // Không có proxy tin cậy thì không có nguồn IP nào đáng tin trong header.
  // Trả null và đếm thiếu, hơn là đếm bằng số do client tự khai.
  return null
}
