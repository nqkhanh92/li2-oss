import { describe, expect, it } from 'vitest'
import { clientIp, visitorHash } from '@/lib/analytics/visitor'

const SECRET = 'khoa-chi-dung-trong-test'

describe('visitorHash', () => {
  it('cùng IP + cùng ngày → cùng hash', () => {
    const day = new Date('2026-11-04T08:00:00Z')
    const other = new Date('2026-11-04T23:59:59Z') // vẫn cùng ngày UTC
    expect(visitorHash('203.0.113.9', SECRET, day)).toBe(visitorHash('203.0.113.9', SECRET, other))
  })

  it('sang ngày khác → hash khác', () => {
    const a = visitorHash('203.0.113.9', SECRET, new Date('2026-11-04T23:59:59Z'))
    const b = visitorHash('203.0.113.9', SECRET, new Date('2026-11-05T00:00:00Z'))
    expect(a).not.toBe(b)
  })

  it('IP khác nhau trong cùng ngày → hash khác', () => {
    const day = new Date('2026-11-04T08:00:00Z')
    expect(visitorHash('203.0.113.9', SECRET, day)).not.toBe(
      visitorHash('203.0.113.10', SECRET, day)
    )
  })

  it('IP null → null', () => {
    expect(visitorHash(null, SECRET)).toBeNull()
  })

  it('đổi SESSION_SECRET → hash khác với cùng IP cùng ngày', () => {
    const day = new Date('2026-11-04T08:00:00Z')
    expect(visitorHash('203.0.113.9', SECRET, day)).not.toBe(
      visitorHash('203.0.113.9', 'khoa-khac', day)
    )
  })

  it('không chứa IP ở dạng đọc được', () => {
    const hash = visitorHash('203.0.113.9', SECRET, new Date('2026-11-04T08:00:00Z'))
    expect(hash).not.toContain('203.0.113.9')
    expect(hash).not.toContain('203')
  })

  it('luôn dài 22 ký tự, an toàn cho URL và cho cột text', () => {
    for (const ip of ['1.2.3.4', '2001:db8::1', '255.255.255.255']) {
      const hash = visitorHash(ip, SECRET, new Date('2026-11-04T08:00:00Z'))
      expect(hash).toHaveLength(22)
      expect(hash).toMatch(/^[A-Za-z0-9_-]{22}$/)
    }
  })

  it('IPv6 hoạt động như IPv4', () => {
    const day = new Date('2026-11-04T08:00:00Z')
    expect(visitorHash('2001:db8::1', SECRET, day)).toBe(visitorHash('2001:db8::1', SECRET, day))
    expect(visitorHash('2001:db8::1', SECRET, day)).not.toBe(
      visitorHash('2001:db8::2', SECRET, day)
    )
  })
})

describe('clientIp', () => {
  it('trả null khi trustProxy=false, dù có x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' })
    expect(clientIp(headers, false)).toBeNull()
  })

  it('trả null khi trustProxy=false, dù có x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '203.0.113.9' })
    expect(clientIp(headers, false)).toBeNull()
  })

  it('đọc phần tử đầu của x-forwarded-for khi trustProxy=true', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1, 10.0.0.2' })
    expect(clientIp(headers, true)).toBe('203.0.113.9')
  })

  it('bỏ khoảng trắng quanh giá trị', () => {
    const headers = new Headers({ 'x-forwarded-for': '  203.0.113.9  ,10.0.0.1' })
    expect(clientIp(headers, true)).toBe('203.0.113.9')
  })

  it('lùi về x-real-ip khi không có x-forwarded-for', () => {
    const headers = new Headers({ 'x-real-ip': ' 203.0.113.9 ' })
    expect(clientIp(headers, true)).toBe('203.0.113.9')
  })

  it('bỏ qua x-forwarded-for rỗng và lùi về x-real-ip', () => {
    const headers = new Headers({ 'x-forwarded-for': '', 'x-real-ip': '203.0.113.9' })
    expect(clientIp(headers, true)).toBe('203.0.113.9')
  })

  it('trả null khi không có header nào, kể cả trustProxy=true', () => {
    expect(clientIp(new Headers(), true)).toBeNull()
  })
})

describe('clientIp + visitorHash đi cùng nhau', () => {
  // Hệ quả có chủ ý của mặc định TRUSTED_PROXY=false: không có proxy tin cậy thì không đếm,
  // thay vì đếm bằng con số do client tự khai. Test này khoá hành vi đó lại để lần sau ai
  // đổi mặc định cũng phải đổi test — tức là phải đọc lý do.
  it('trustProxy=false → không có mã khách nào được ghi', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9' })
    expect(visitorHash(clientIp(headers, false), SECRET)).toBeNull()
  })

  it('trustProxy=true → có mã khách', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9' })
    expect(visitorHash(clientIp(headers, true), SECRET)).not.toBeNull()
  })
})
