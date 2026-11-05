import { describe, it, expect } from 'vitest'
import { checkFetchableUrl } from '@/core/helpers/safe-fetch-url'

/**
 * Phòng tuyến SSRF. Sai theo hướng "cho qua" nghĩa là người gọi chọn được địa chỉ mà **máy chủ**
 * sẽ chạm tới — và máy chủ đứng bên trong mạng nội bộ.
 *
 * Mọi ca ở đây viết theo chiều **chặn**, vì chiều đó mới là chiều mất mát.
 */

const ok = (u: string) => expect(checkFetchableUrl(u).ok).toBe(true)
const no = (u: string, reason?: string) => {
  const r = checkFetchableUrl(u)
  expect(r.ok).toBe(false)
  if (reason && !r.ok) expect(r.reason).toBe(reason)
}

describe('checkFetchableUrl — cho qua', () => {
  it('URL công khai bình thường', () => {
    for (const u of [
      'https://example.com',
      'http://example.com/path?a=1#b',
      'https://vnexpress.net/bai-viet',
      'https://example.com:8080/x',
    ]) {
      ok(u)
    }
  })
})

describe('chặn địa chỉ nội bộ viết thẳng', () => {
  it('loopback và localhost', () => {
    no('http://127.0.0.1:3000/', 'private_host')
    no('http://localhost/', 'private_host')
    no('http://LOCALHOST/', 'private_host')
    no('http://app.localhost/', 'private_host')
  })

  /** Ca đắt nhất: endpoint metadata của đám mây trả khoá truy cập của máy ảo. */
  it('link-local 169.254 — endpoint metadata', () => {
    no('http://169.254.169.254/latest/meta-data/', 'private_host')
    no('http://metadata.google.internal/', 'private_host')
  })

  it('dải riêng RFC1918 và CGNAT', () => {
    for (const h of ['10.0.0.1', '192.168.1.1', '172.16.0.1', '172.31.255.1', '100.64.0.1']) {
      no(`http://${h}/`, 'private_host')
    }
  })

  it('172.32 KHÔNG nằm trong dải riêng — đừng chặn quá tay', () => {
    ok('http://172.32.0.1/')
    ok('http://172.15.0.1/')
  })

  it('IPv6 nội bộ, gồm cả IPv4 nhúng', () => {
    no('http://[::1]/', 'private_host')
    no('http://[fd00::1]/', 'private_host')
    no('http://[fe80::1]/', 'private_host')
    // Cùng một đích, khác cách viết — bỏ sót đây là bỏ ngỏ cả danh sách IPv4.
    no('http://[::ffff:169.254.169.254]/', 'private_host')
  })

  it('tên miền nội bộ theo đuôi', () => {
    no('http://db.internal/', 'private_host')
    no('http://printer.local/', 'private_host')
  })

  it('dấu chấm cuối không lách được', () => {
    no('http://localhost./', 'private_host')
  })
})

describe('chặn lược đồ, cổng, thông tin đăng nhập', () => {
  it('chỉ http và https', () => {
    for (const u of ['file:///etc/passwd', 'ftp://example.com/', 'gopher://example.com/']) {
      no(u, 'scheme')
    }
    // `data:` không có host nên `new URL` vẫn dựng được — phải rơi vào nhánh lược đồ.
    no('data:text/html,<script>', 'scheme')
  })

  it('cổng lạ bị chặn — dịch vụ nội bộ hay nằm ở cổng cao', () => {
    no('http://example.com:6379/', 'port') // Redis
    no('http://example.com:5432/', 'port') // Postgres
    no('http://example.com:9200/', 'port') // Elasticsearch
  })

  /** `http://a@b@c/` được các bộ phân tích đọc khác nhau — từ chối thay vì đoán. */
  it('URL mang thông tin đăng nhập', () => {
    no('http://user:pass@example.com/', 'credentials')
    no('http://user@example.com/', 'credentials')
  })

  it('chuỗi không phải URL', () => {
    no('example.com', 'invalid')
    no('', 'invalid')
    no('khong-phai-url', 'invalid')
  })
})
