import { describe, it, expect } from 'vitest'
import { randomSlug, isValidSlug, normalizeSlugInput } from '@/features/artifacts/constants'

describe('randomSlug — đường dẫn điền sẵn lúc tạo artifact', () => {
  it('luôn sinh ra slug mà backend nhận', () => {
    for (let i = 0; i < 200; i++) {
      const slug = randomSlug()
      expect(isValidSlug(slug), `slug không hợp lệ: ${slug}`).toBe(true)
    }
  })

  it('dài 10 ký tự, nằm trong khoảng 6–64 mà slugSchema cho phép', () => {
    const slug = randomSlug()
    expect(slug).toHaveLength(10)
  })

  it('không chứa ký tự dễ đọc nhầm khi chép tay: l, o, 0, 1', () => {
    // Người dùng phải đọc đường dẫn này qua điện thoại hoặc chép từ tờ rơi.
    const sample = Array.from({ length: 500 }, randomSlug).join('')
    for (const ch of ['l', 'o', '0', '1']) {
      expect(sample.includes(ch), `vẫn còn ký tự ${ch}`).toBe(false)
    }
  })

  it('chỉ gồm chữ thường và chữ số, không có gạch nối ở đầu hay cuối', () => {
    for (let i = 0; i < 100; i++) {
      expect(randomSlug()).toMatch(/^[a-z0-9]+$/)
    }
  })

  it('không lặp lại trong 2000 lần sinh', () => {
    const seen = new Set(Array.from({ length: 2000 }, randomSlug))
    expect(seen.size).toBe(2000)
  })

  it('sống sót qua normalizeSlugInput — người dùng sửa rồi xoá vẫn hợp lệ', () => {
    // Ô nhập chuẩn hoá mọi thứ người dùng gõ; slug tự sinh phải đi qua đó mà không đổi.
    for (let i = 0; i < 100; i++) {
      const slug = randomSlug()
      expect(normalizeSlugInput(slug)).toBe(slug)
    }
  })
})
